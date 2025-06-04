import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, TimeEntry, PayPeriod, JobWithDuration, JobWithPayPeriods, SyncQueueItem, SyncStatus, NetworkInfo } from '@/types';
import { generateId } from '@/utils/helpers';
import { getStartOfWeek, getEndOfWeek } from '@/utils/time';
import { supabase, fetchAllUserData, batchSyncJobs, batchSyncTimeEntries, batchSyncPayPeriods, checkNetworkConnectivity } from '@/lib/supabase';

interface JobsState {
  jobs: Job[];
  timeEntries: TimeEntry[];
  payPeriods: PayPeriod[];
  isLoading: boolean;
  lastSyncTime: number | null;
  
  // Sync queue and status
  syncQueue: SyncQueueItem[];
  syncStatus: SyncStatus;
  networkInfo: NetworkInfo;
  
  // Job methods
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => string;
  updateJob: (id: string, updates: Partial<Job>) => boolean;
  deleteJob: (id: string) => boolean;
  getJobById: (id: string) => Job | undefined;
  getJobs: () => Job[];
  getJobsWithStats: () => JobWithDuration[];
  getActiveJobs: () => JobWithDuration[];
  
  // Time entry methods
  clockIn: (jobId: string, note?: string, customStartTime?: number) => string;
  clockOut: (entryId: string, customEndTime?: number) => boolean;
  startBreak: (entryId: string, customStartTime?: number) => boolean;
  endBreak: (entryId: string) => boolean;
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => string;
  updateTimeEntry: (entry: TimeEntry) => boolean;
  deleteTimeEntry: (id: string) => boolean;
  getTimeEntry: (id: string) => TimeEntry | undefined;
  getTimeEntriesForJob: (jobId: string) => TimeEntry[];
  getActiveTimeEntry: (jobId: string) => TimeEntry | undefined;
  
  // Pay period methods
  generatePayPeriods: () => void;
  markPayPeriodAsPaid: (periodId: string) => boolean;
  markPayPeriodAsUnpaid: (periodId: string) => boolean;
  getJobWithPayPeriods: (jobId: string) => JobWithPayPeriods | undefined;
  getPaidEarningsForJob: (jobId: string) => number;
  
  // Stats methods
  getTotalEarnings: () => number;
  getTotalHours: () => number;
  
  // Sync methods
  syncWithSupabase: (userId: string) => Promise<void>;
  refreshFromSupabase: (userId?: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  
  // Network and sync queue methods
  setNetworkInfo: (info: NetworkInfo) => void;
  addToSyncQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) => void;
  processSyncQueue: (userId: string) => Promise<void>;
  clearSyncQueue: () => void;
  initializeBackgroundSync: (userId: string) => void;
  stopBackgroundSync: () => void;
  
  // Reset method
  resetAllData: () => void;
}

// Helper function to calculate earnings for a single time entry with overtime support
const calculateTimeEntryEarnings = (entry: TimeEntry, job: Job, allJobEntries: TimeEntry[]): number => {
  if (!entry.endTime) return 0;
  
  const entryDuration = entry.endTime - entry.startTime;
  const breakDuration = entry.breaks?.reduce((total, breakItem) => {
    if (breakItem?.endTime) {
      return total + (breakItem.endTime - breakItem.startTime);
    }
    return total;
  }, 0) || 0;
  const workDuration = Math.max(0, entryDuration - breakDuration);
  const durationHours = workDuration / (1000 * 60 * 60);
  
  if (!job.settings) {
    return durationHours * job.hourlyRate;
  }
  
  const { 
    dailyOvertime, 
    dailyOvertimeThreshold = 8, 
    dailyOvertimeRate = 1.5,
    weeklyOvertime,
    weeklyOvertimeThreshold = 40,
    weeklyOvertimeRate = 1.5
  } = job.settings;
  
  // Daily overtime calculation
  if (dailyOvertime === 'daily' && durationHours > dailyOvertimeThreshold) {
    const straightTimeHours = dailyOvertimeThreshold;
    const overtimeHours = durationHours - dailyOvertimeThreshold;
    
    const straightTimeEarnings = straightTimeHours * job.hourlyRate;
    const overtimeEarnings = overtimeHours * job.hourlyRate * dailyOvertimeRate;
    return straightTimeEarnings + overtimeEarnings;
  }
  
  // Weekly overtime calculation
  if (weeklyOvertime === 'weekly') {
    // Get the week boundaries for this entry
    const entryDate = new Date(entry.startTime);
    const weekStart = getStartOfWeek(entryDate, 0); // Sunday start
    const weekEnd = getEndOfWeek(entryDate, 0);
    
    // Get all time entries for this job in the same week
    const weekEntries = allJobEntries.filter(e => {
      if (!e.endTime) return false; // Only completed entries
      const eDate = new Date(e.startTime);
      return eDate >= weekStart && eDate <= weekEnd;
    });
    
    // Calculate total hours for the week
    let totalWeekHours = 0;
    weekEntries.forEach(e => {
      if (e.endTime) {
        const eDuration = e.endTime - e.startTime;
        const eBreakDuration = e.breaks?.reduce((total, breakItem) => {
          if (breakItem?.endTime) {
            return total + (breakItem.endTime - breakItem.startTime);
          }
          return total;
        }, 0) || 0;
        const eWorkDuration = Math.max(0, eDuration - eBreakDuration);
        totalWeekHours += eWorkDuration / (1000 * 60 * 60);
      }
    });
    
    // Check if weekly overtime threshold is exceeded
    if (totalWeekHours > weeklyOvertimeThreshold) {
      // Calculate how much of this entry contributes to overtime
      const entryOvertimeHours = Math.max(0, Math.min(durationHours, totalWeekHours - weeklyOvertimeThreshold));
      const entryStraightTimeHours = durationHours - entryOvertimeHours;
      
      const entryStraightTimeEarnings = entryStraightTimeHours * job.hourlyRate;
      const entryOvertimeEarnings = entryOvertimeHours * job.hourlyRate * weeklyOvertimeRate;
      return entryStraightTimeEarnings + entryOvertimeEarnings;
    } else {
      // No overtime for this entry
      return durationHours * job.hourlyRate;
    }
  }
  
  // No overtime
  return durationHours * job.hourlyRate;
};

// Helper function to get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.log('No authenticated user found');
      return null;
    }
    return user.id;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Background sync timer
let backgroundSyncTimer: NodeJS.Timeout | null = null;
const BACKGROUND_SYNC_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
      jobs: [],
      timeEntries: [],
      payPeriods: [],
      isLoading: false,
      lastSyncTime: null,
      
      // Initialize sync queue and status
      syncQueue: [],
      syncStatus: {
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingOperations: 0,
      },
      networkInfo: {
        isConnected: true,
        type: null,
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      
      setNetworkInfo: (info) => {
        set(state => ({
          networkInfo: info,
          syncStatus: {
            ...state.syncStatus,
            isOnline: info.isConnected,
          }
        }));
        
        // If we just came back online, process sync queue
        if (info.isConnected && !get().syncStatus.isOnline) {
          const userId = getCurrentUserId();
          if (userId) {
            userId.then(id => {
              if (id) {
                get().processSyncQueue(id);
              }
            });
          }
        }
      },
      
      addToSyncQueue: (item) => {
        const queueItem: SyncQueueItem = {
          ...item,
          id: generateId(),
          timestamp: Date.now(),
          retryCount: 0,
        };
        
        set(state => ({
          syncQueue: [...state.syncQueue, queueItem],
          syncStatus: {
            ...state.syncStatus,
            pendingOperations: state.syncQueue.length + 1,
          }
        }));
      },
      
      processSyncQueue: async (userId: string) => {
        const state = get();
        if (state.syncStatus.isSyncing || state.syncQueue.length === 0) {
          return;
        }
        
        set(state => ({
          syncStatus: {
            ...state.syncStatus,
            isSyncing: true,
            lastError: undefined,
          }
        }));
        
        try {
          // Check network connectivity first
          const isOnline = await checkNetworkConnectivity();
          if (!isOnline) {
            set(state => ({
              syncStatus: {
                ...state.syncStatus,
                isSyncing: false,
                isOnline: false,
                lastError: 'No network connection',
              }
            }));
            return;
          }
          
          const queue = [...state.syncQueue];
          const processedItems: string[] = [];
          const failedItems: SyncQueueItem[] = [];
          
          // Group items by entity type and operation for batch processing
          const jobsToUpsert: Job[] = [];
          const jobsToDelete: Job[] = [];
          const entriesToUpsert: TimeEntry[] = [];
          const entriesToDelete: TimeEntry[] = [];
          const periodsToUpsert: PayPeriod[] = [];
          const periodsToDelete: PayPeriod[] = [];
          
          for (const item of queue) {
            try {
              if (item.entityType === 'job') {
                if (item.operation === 'delete') {
                  jobsToDelete.push({ id: item.entityId } as Job);
                } else {
                  jobsToUpsert.push(item.data as Job);
                }
              } else if (item.entityType === 'timeEntry') {
                if (item.operation === 'delete') {
                  entriesToDelete.push({ id: item.entityId } as TimeEntry);
                } else {
                  entriesToUpsert.push(item.data as TimeEntry);
                }
              } else if (item.entityType === 'payPeriod') {
                if (item.operation === 'delete') {
                  periodsToDelete.push({ id: item.entityId } as PayPeriod);
                } else {
                  periodsToUpsert.push(item.data as PayPeriod);
                }
              }
              
              processedItems.push(item.id);
            } catch (error) {
              console.error('Error processing sync queue item:', error);
              failedItems.push({
                ...item,
                retryCount: item.retryCount + 1,
                lastError: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
          
          // Batch sync operations
          const syncPromises: Promise<void>[] = [];
          
          if (jobsToUpsert.length > 0) {
            syncPromises.push(batchSyncJobs(jobsToUpsert, userId, 'upsert'));
          }
          if (jobsToDelete.length > 0) {
            syncPromises.push(batchSyncJobs(jobsToDelete, userId, 'delete'));
          }
          if (entriesToUpsert.length > 0) {
            syncPromises.push(batchSyncTimeEntries(entriesToUpsert, userId, 'upsert'));
          }
          if (entriesToDelete.length > 0) {
            syncPromises.push(batchSyncTimeEntries(entriesToDelete, userId, 'delete'));
          }
          if (periodsToUpsert.length > 0) {
            syncPromises.push(batchSyncPayPeriods(periodsToUpsert, userId, 'upsert'));
          }
          if (periodsToDelete.length > 0) {
            syncPromises.push(batchSyncPayPeriods(periodsToDelete, userId, 'delete'));
          }
          
          await Promise.all(syncPromises);
          
          // Remove processed items from queue, keep failed items for retry
          const remainingQueue = failedItems.filter(item => item.retryCount < 3); // Max 3 retries
          
          set(state => ({
            syncQueue: remainingQueue,
            syncStatus: {
              ...state.syncStatus,
              isSyncing: false,
              lastSyncTime: Date.now(),
              pendingOperations: remainingQueue.length,
              isOnline: true,
            }
          }));
          
        } catch (error) {
          console.error('Error processing sync queue:', error);
          set(state => ({
            syncStatus: {
              ...state.syncStatus,
              isSyncing: false,
              lastError: error instanceof Error ? error.message : 'Sync failed',
            }
          }));
        }
      },
      
      clearSyncQueue: () => {
        set({
          syncQueue: [],
          syncStatus: {
            isOnline: true,
            isSyncing: false,
            lastSyncTime: null,
            pendingOperations: 0,
          }
        });
      },
      
      initializeBackgroundSync: (userId: string) => {
        // Clear any existing timer
        if (backgroundSyncTimer) {
          clearInterval(backgroundSyncTimer);
        }
        
        // Set up background sync timer
        backgroundSyncTimer = setInterval(async () => {
          try {
            const state = get();
            if (state.syncQueue.length > 0 && state.networkInfo.isConnected) {
              await get().processSyncQueue(userId);
            }
          } catch (error) {
            console.error('Background sync error:', error);
          }
        }, BACKGROUND_SYNC_INTERVAL);
      },
      
      stopBackgroundSync: () => {
        if (backgroundSyncTimer) {
          clearInterval(backgroundSyncTimer);
          backgroundSyncTimer = null;
        }
      },
      
      refreshFromSupabase: async (userId) => {
        try {
          set({ isLoading: true });
          
          // Get current user ID if not provided
          const currentUserId = userId || await getCurrentUserId();
          if (!currentUserId) {
            console.log('No authenticated user found, skipping refresh');
            set({ isLoading: false });
            return;
          }
          
          // Process any pending sync queue items first
          await get().processSyncQueue(currentUserId);
          
          // Fetch fresh data from Supabase
          const result = await fetchAllUserData(currentUserId);
          
          if (result.errors.length > 0) {
            console.error('Errors during data fetch:', result.errors);
          }
          
          set({ 
            jobs: result.jobs,
            timeEntries: result.timeEntries,
            payPeriods: result.payPeriods,
            lastSyncTime: Date.now(),
            isLoading: false,
          });
          
        } catch (error) {
          console.error('Error refreshing from Supabase:', error);
          set({ isLoading: false });
        }
      },
      
      syncWithSupabase: async (userId: string) => {
        try {
          set({ isLoading: true });
          
          // Check if user is authenticated
          const currentUserId = await getCurrentUserId();
          if (!currentUserId || currentUserId !== userId) {
            console.log('User not authenticated or ID mismatch, skipping sync');
            set({ isLoading: false });
            return;
          }
          
          // Process sync queue first
          await get().processSyncQueue(userId);
          
          // Then fetch fresh data
          await get().refreshFromSupabase(userId);
          
        } catch (error) {
          console.error('Sync error:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      addJob: (jobData) => {
        const id = generateId();
        const newJob: Job = {
          ...jobData,
          id,
          createdAt: Date.now(),
        };
        
        set((state) => ({
          jobs: [...state.jobs, newJob]
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'job',
          entityId: id,
          operation: 'create',
          data: newJob,
        });
        
        return id;
      },
      
      updateJob: (id, updates) => {
        try {
          let updatedJob: Job | undefined;
          
          set((state) => {
            const newJobs = state.jobs.map(job => {
              if (job.id === id) {
                updatedJob = { ...job, ...updates };
                return updatedJob;
              }
              return job;
            });
            return { jobs: newJobs };
          });
          
          // Add to sync queue
          if (updatedJob) {
            get().addToSyncQueue({
              entityType: 'job',
              entityId: id,
              operation: 'update',
              data: updatedJob,
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error updating job:', error);
          return false;
        }
      },
      
      deleteJob: (id) => {
        try {
          let deletedJob: Job | undefined;
          
          set((state) => {
            deletedJob = state.jobs.find(job => job.id === id);
            return {
              jobs: state.jobs.filter(job => job.id !== id),
              timeEntries: state.timeEntries.filter(entry => entry.jobId !== id),
              payPeriods: state.payPeriods.filter(period => period.jobId !== id)
            };
          });
          
          // Add to sync queue
          if (deletedJob) {
            get().addToSyncQueue({
              entityType: 'job',
              entityId: id,
              operation: 'delete',
              data: deletedJob,
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error deleting job:', error);
          return false;
        }
      },
      
      getJobById: (id) => {
        return get().jobs.find(job => job.id === id);
      },
      
      getJobs: () => {
        return get().jobs;
      },
      
      getJobsWithStats: () => {
        const { jobs, timeEntries } = get();
        
        return jobs.map(job => {
          const jobEntries = timeEntries.filter(entry => entry.jobId === job.id);
          
          // Calculate total duration with overtime support
          const totalDuration = jobEntries.reduce((total, entry) => {
            if (!entry.endTime && entry.endTime !== null) {
              // Active entry
              const currentDuration = Date.now() - entry.startTime;
              const breakDuration = entry.breaks?.reduce((breakTotal, breakItem) => {
                if (breakItem.endTime) {
                  return breakTotal + (breakItem.endTime - breakItem.startTime);
                } else if (entry.isOnBreak) {
                  return breakTotal + (Date.now() - breakItem.startTime);
                }
                return breakTotal;
              }, 0) || 0;
              return total + (currentDuration - breakDuration);
            } else if (entry.endTime) {
              // Completed entry
              const entryDuration = entry.endTime - entry.startTime;
              const breakDuration = entry.breaks?.reduce((breakTotal, breakItem) => {
                if (breakItem.endTime) {
                  return breakTotal + (breakItem.endTime - breakItem.startTime);
                }
                return breakTotal;
              }, 0) || 0;
              return total + (entryDuration - breakDuration);
            }
            return total;
          }, 0);
          
          // Check if job is active
          const activeEntry = jobEntries.find(entry => entry.endTime === null);
          const isActive = !!activeEntry;
          const activeEntryId = activeEntry?.id;
          
          return {
            ...job,
            totalDuration,
            isActive,
            activeEntryId
          } as JobWithDuration;
        });
      },
      
      getActiveJobs: () => {
        const jobsWithStats = get().getJobsWithStats();
        return jobsWithStats.filter(job => job.isActive);
      },
      
      clockIn: (jobId, note = '', customStartTime) => {
        const id = generateId();
        const startTime = customStartTime || Date.now();
        
        const newEntry: TimeEntry = {
          id,
          jobId,
          startTime,
          endTime: null,
          note,
          breaks: [],
          isOnBreak: false,
          createdAt: Date.now(),
          paidInPeriodId: undefined
        };
        
        set((state) => ({
          timeEntries: [...state.timeEntries, newEntry]
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: id,
          operation: 'create',
          data: newEntry,
        });
        
        return id;
      },
      
      clockOut: (entryId, customEndTime) => {
        try {
          const endTime = customEndTime || Date.now();
          let updatedEntry: TimeEntry | undefined;
          
          set((state) => {
            const newEntries = state.timeEntries.map(entry => {
              if (entry.id === entryId) {
                // If currently on break, end the break first
                const updatedBreaks = entry.isOnBreak && entry.breaks ? 
                  entry.breaks.map((breakItem, index) => 
                    index === entry.breaks!.length - 1 && !breakItem.endTime
                      ? { ...breakItem, endTime }
                      : breakItem
                  ) : entry.breaks;
                
                updatedEntry = {
                  ...entry,
                  endTime,
                  isOnBreak: false,
                  breaks: updatedBreaks
                };
                return updatedEntry;
              }
              return entry;
            });
            return { timeEntries: newEntries };
          });
          
          // Add to sync queue
          if (updatedEntry) {
            get().addToSyncQueue({
              entityType: 'timeEntry',
              entityId: entryId,
              operation: 'update',
              data: updatedEntry,
            });
          }
          
          // Regenerate pay periods after clocking out
          get().generatePayPeriods();
          
          return true;
        } catch (error) {
          console.error('Error clocking out:', error);
          return false;
        }
      },
      
      startBreak: (entryId, customStartTime) => {
        try {
          const startTime = customStartTime || Date.now();
          let updatedEntry: TimeEntry | undefined;
          
          set((state) => {
            const newEntries = state.timeEntries.map(entry => {
              if (entry.id === entryId) {
                updatedEntry = {
                  ...entry,
                  isOnBreak: true,
                  breaks: [
                    ...(entry.breaks || []),
                    { id: generateId(), startTime, endTime: null }
                  ]
                };
                return updatedEntry;
              }
              return entry;
            });
            return { timeEntries: newEntries };
          });
          
          // Add to sync queue
          if (updatedEntry) {
            get().addToSyncQueue({
              entityType: 'timeEntry',
              entityId: entryId,
              operation: 'update',
              data: updatedEntry,
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error starting break:', error);
          return false;
        }
      },
      
      endBreak: (entryId) => {
        try {
          const endTime = Date.now();
          let updatedEntry: TimeEntry | undefined;
          
          set((state) => {
            const newEntries = state.timeEntries.map(entry => {
              if (entry.id === entryId && entry.isOnBreak) {
                const updatedBreaks = entry.breaks?.map((breakItem, index) => 
                  index === entry.breaks!.length - 1 && !breakItem.endTime
                    ? { ...breakItem, endTime }
                    : breakItem
                ) || [];
                
                updatedEntry = {
                  ...entry,
                  isOnBreak: false,
                  breaks: updatedBreaks
                };
                return updatedEntry;
              }
              return entry;
            });
            return { timeEntries: newEntries };
          });
          
          // Add to sync queue
          if (updatedEntry) {
            get().addToSyncQueue({
              entityType: 'timeEntry',
              entityId: entryId,
              operation: 'update',
              data: updatedEntry,
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error ending break:', error);
          return false;
        }
      },
      
      addTimeEntry: (entryData) => {
        const id = generateId();
        const newEntry: TimeEntry = {
          ...entryData,
          id,
        };
        
        set((state) => ({
          timeEntries: [...state.timeEntries, newEntry]
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: id,
          operation: 'create',
          data: newEntry,
        });
        
        // Regenerate pay periods after adding entry
        get().generatePayPeriods();
        
        return id;
      },
      
      updateTimeEntry: (updatedEntry) => {
        try {
          set((state) => ({
            timeEntries: state.timeEntries.map(entry => 
              entry.id === updatedEntry.id ? updatedEntry : entry
            )
          }));
          
          // Add to sync queue
          get().addToSyncQueue({
            entityType: 'timeEntry',
            entityId: updatedEntry.id,
            operation: 'update',
            data: updatedEntry,
          });
          
          // Regenerate pay periods after updating entry
          get().generatePayPeriods();
          
          return true;
        } catch (error) {
          console.error('Error updating time entry:', error);
          return false;
        }
      },
      
      deleteTimeEntry: (id) => {
        try {
          let deletedEntry: TimeEntry | undefined;
          
          set((state) => {
            // Find the entry being deleted to get its paidInPeriodId
            deletedEntry = state.timeEntries.find(entry => entry.id === id);
            
            // Remove the entry from timeEntries
            const updatedTimeEntries = state.timeEntries.filter(entry => entry.id !== id);
            
            // If the entry was part of a paid period, we need to update that period
            let updatedPayPeriods = state.payPeriods;
            if (deletedEntry?.paidInPeriodId) {
              updatedPayPeriods = state.payPeriods.map(period => {
                if (period.id === deletedEntry!.paidInPeriodId) {
                  // Remove the entry ID from the period's timeEntryIds
                  const updatedEntryIds = period.timeEntryIds.filter(entryId => entryId !== id);
                  
                  // Recalculate the period's totals based on remaining entries
                  const remainingEntries = updatedTimeEntries.filter(entry => 
                    updatedEntryIds.includes(entry.id)
                  );
                  
                  let totalDuration = 0;
                  let totalEarnings = 0;
                  
                  // Get the job for overtime calculations
                  const job = state.jobs.find(j => j.id === period.jobId);
                  
                  if (job) {
                    remainingEntries.forEach(entry => {
                      if (entry.endTime) {
                        const entryDuration = entry.endTime - entry.startTime;
                        const breakDuration = entry.breaks?.reduce((total, breakItem) => {
                          if (breakItem.endTime) {
                            return total + (breakItem.endTime - breakItem.startTime);
                          }
                          return total;
                        }, 0) || 0;
                        const workDuration = entryDuration - breakDuration;
                        totalDuration += workDuration;
                        
                        // Use the same calculation logic as individual entries
                        totalEarnings += calculateTimeEntryEarnings(entry, job, updatedTimeEntries);
                      }
                    });
                  }
                  
                  return {
                    ...period,
                    timeEntryIds: updatedEntryIds,
                    totalDuration,
                    totalEarnings
                  };
                }
                return period;
              }).filter(period => period.timeEntryIds.length > 0); // Remove empty periods
            }
            
            return {
              timeEntries: updatedTimeEntries,
              payPeriods: updatedPayPeriods
            };
          });
          
          // Add to sync queue
          if (deletedEntry) {
            get().addToSyncQueue({
              entityType: 'timeEntry',
              entityId: id,
              operation: 'delete',
              data: deletedEntry,
            });
          }
          
          // Regenerate pay periods after deleting entry to ensure consistency
          get().generatePayPeriods();
          
          return true;
        } catch (error) {
          console.error('Error deleting time entry:', error);
          return false;
        }
      },
      
      getTimeEntry: (id) => {
        return get().timeEntries.find(entry => entry.id === id);
      },
      
      getTimeEntriesForJob: (jobId) => {
        return get().timeEntries
          .filter(entry => entry.jobId === jobId)
          .sort((a, b) => b.startTime - a.startTime);
      },
      
      getActiveTimeEntry: (jobId) => {
        return get().timeEntries.find(entry => 
          entry.jobId === jobId && entry.endTime === null
        );
      },
      
      generatePayPeriods: () => {
        const { jobs, timeEntries, payPeriods: existingPayPeriods } = get();
        const newPayPeriods: PayPeriod[] = [];
        
        jobs.forEach(job => {
          const jobEntries = timeEntries.filter(entry => 
            entry.jobId === job.id && entry.endTime !== null
          );
          
          if (jobEntries.length === 0) return;
          
          // Group entries by week (Sunday to Saturday)
          const weekGroups: { [key: string]: TimeEntry[] } = {};
          
          jobEntries.forEach(entry => {
            const entryDate = new Date(entry.startTime);
            const sunday = new Date(entryDate);
            sunday.setDate(entryDate.getDate() - entryDate.getDay());
            sunday.setHours(0, 0, 0, 0);
            
            const weekKey = `${job.id}-${sunday.getTime()}`;
            
            if (!weekGroups[weekKey]) {
              weekGroups[weekKey] = [];
            }
            weekGroups[weekKey].push(entry);
          });
          
          // Create pay periods for each week
          Object.entries(weekGroups).forEach(([weekKey, entries]) => {
            const sunday = new Date(parseInt(weekKey.split('-')[1]));
            const saturday = new Date(sunday);
            saturday.setDate(sunday.getDate() + 6);
            saturday.setHours(23, 59, 59, 999);
            
            // Calculate total duration and earnings using the same logic as individual entries
            let totalDuration = 0;
            let totalEarnings = 0;
            
            entries.forEach(entry => {
              if (entry.endTime) {
                const entryDuration = entry.endTime - entry.startTime;
                const breakDuration = entry.breaks?.reduce((total, breakItem) => {
                  if (breakItem.endTime) {
                    return total + (breakItem.endTime - breakItem.startTime);
                  }
                  return total;
                }, 0) || 0;
                const workDuration = entryDuration - breakDuration;
                totalDuration += workDuration;
                
                // Use the same calculation logic as individual entries
                totalEarnings += calculateTimeEntryEarnings(entry, job, jobEntries);
              }
            });
            
            // Check if this period already exists
            const existingPeriod = existingPayPeriods.find(period => 
              period.jobId === job.id && 
              period.startDate === sunday.getTime() &&
              period.endDate === saturday.getTime()
            );
            
            // Create a deterministic ID based on job and week to avoid duplicates
            const periodId = existingPeriod?.id || `${job.id}-${sunday.getTime()}`;
            
            const newPeriod: PayPeriod = {
              id: periodId,
              jobId: job.id,
              startDate: sunday.getTime(),
              endDate: saturday.getTime(),
              totalDuration,
              totalEarnings,
              isPaid: existingPeriod?.isPaid || false,
              paidDate: existingPeriod?.paidDate,
              timeEntryIds: entries.map(e => e.id),
              createdAt: existingPeriod?.createdAt || Date.now()
            };
            
            newPayPeriods.push(newPeriod);
            
            // Add to sync queue if it's a new period or has changes
            if (!existingPeriod || 
                existingPeriod.totalDuration !== totalDuration ||
                existingPeriod.totalEarnings !== totalEarnings ||
                JSON.stringify(existingPeriod.timeEntryIds.sort()) !== JSON.stringify(entries.map(e => e.id).sort())) {
              get().addToSyncQueue({
                entityType: 'payPeriod',
                entityId: periodId,
                operation: existingPeriod ? 'update' : 'create',
                data: newPeriod,
              });
            }
          });
        });
        
        set({ payPeriods: newPayPeriods });
      },
      
      markPayPeriodAsPaid: (periodId) => {
        try {
          const paidDate = Date.now();
          let updatedPeriod: PayPeriod | undefined;
          
          set((state) => {
            const period = state.payPeriods.find(p => p.id === periodId);
            if (!period) return state;
            
            updatedPeriod = { ...period, isPaid: true, paidDate };
            
            return {
              payPeriods: state.payPeriods.map(p => 
                p.id === periodId ? updatedPeriod! : p
              ),
              timeEntries: state.timeEntries.map(entry => 
                period.timeEntryIds.includes(entry.id)
                  ? { ...entry, paidInPeriodId: periodId }
                  : entry
              )
            };
          });
          
          // Add to sync queue
          if (updatedPeriod) {
            get().addToSyncQueue({
              entityType: 'payPeriod',
              entityId: periodId,
              operation: 'update',
              data: updatedPeriod,
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error marking pay period as paid:', error);
          return false;
        }
      },
      
      markPayPeriodAsUnpaid: (periodId) => {
        try {
          let updatedPeriod: PayPeriod | undefined;
          
          set((state) => {
            const period = state.payPeriods.find(p => p.id === periodId);
            if (!period) return state;
            
            updatedPeriod = { ...period, isPaid: false, paidDate: undefined };
            
            return {
              payPeriods: state.payPeriods.map(p => 
                p.id === periodId ? updatedPeriod! : p
              ),
              timeEntries: state.timeEntries.map(entry => 
                period.timeEntryIds.includes(entry.id)
                  ? { ...entry, paidInPeriodId: undefined }
                  : entry
              )
            };
          });
          
          // Add to sync queue
          if (updatedPeriod) {
            get().addToSyncQueue({
              entityType: 'payPeriod',
              entityId: periodId,
              operation: 'update',
              data: updatedPeriod,
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error marking pay period as unpaid:', error);
          return false;
        }
      },
      
      getJobWithPayPeriods: (jobId) => {
        const { jobs, payPeriods, timeEntries } = get();
        const job = jobs.find(j => j.id === jobId);
        if (!job) return undefined;
        
        const jobPayPeriods = payPeriods.filter(p => p.jobId === jobId);
        const jobEntries = timeEntries.filter(e => e.jobId === jobId && e.endTime !== null);
        
        // Calculate paid earnings and duration
        const paidEarnings = jobPayPeriods
          .filter(p => p.isPaid)
          .reduce((total, p) => total + p.totalEarnings, 0);
        
        const paidDuration = jobPayPeriods
          .filter(p => p.isPaid)
          .reduce((total, p) => total + p.totalDuration, 0);
        
        // Calculate unpaid earnings and duration
        const unpaidEarnings = jobPayPeriods
          .filter(p => !p.isPaid)
          .reduce((total, p) => total + p.totalEarnings, 0);
        
        const unpaidDuration = jobPayPeriods
          .filter(p => !p.isPaid)
          .reduce((total, p) => total + p.totalDuration, 0);
        
        // Calculate total duration
        const totalDuration = paidDuration + unpaidDuration;
        
        // Check if job is active
        const activeEntry = timeEntries.find(entry => entry.jobId === jobId && entry.endTime === null);
        const isActive = !!activeEntry;
        const activeEntryId = activeEntry?.id;
        
        return {
          ...job,
          payPeriods: jobPayPeriods.sort((a, b) => b.startDate - a.startDate),
          paidEarnings,
          unpaidEarnings,
          paidDuration,
          unpaidDuration,
          totalDuration,
          isActive,
          activeEntryId
        };
      },
      
      getPaidEarningsForJob: (jobId) => {
        const { payPeriods } = get();
        return payPeriods
          .filter(p => p.jobId === jobId && p.isPaid)
          .reduce((total, p) => total + p.totalEarnings, 0);
      },
      
      getTotalEarnings: () => {
        const { jobs, timeEntries } = get();
        
        return timeEntries.reduce((total, entry) => {
          if (entry.endTime) {
            const job = jobs.find(j => j.id === entry.jobId);
            if (!job) return total;
            
            return total + calculateTimeEntryEarnings(entry, job, timeEntries);
          }
          return total;
        }, 0);
      },
      
      getTotalHours: () => {
        const { timeEntries } = get();
        
        const totalMs = timeEntries.reduce((total, entry) => {
          if (entry.endTime) {
            const entryDuration = entry.endTime - entry.startTime;
            const breakDuration = entry.breaks?.reduce((breakTotal, breakItem) => {
              if (breakItem.endTime) {
                return breakTotal + (breakItem.endTime - breakItem.startTime);
              }
              return breakTotal;
            }, 0) || 0;
            
            return total + (entryDuration - breakDuration);
          }
          return total;
        }, 0);
        
        return totalMs / (1000 * 60 * 60); // Convert to hours
      },
      
      resetAllData: () => {
        // Stop background sync
        get().stopBackgroundSync();
        
        set({
          jobs: [],
          timeEntries: [],
          payPeriods: [],
          isLoading: false,
          lastSyncTime: null,
          syncQueue: [],
          syncStatus: {
            isOnline: true,
            isSyncing: false,
            lastSyncTime: null,
            pendingOperations: 0,
          },
          networkInfo: {
            isConnected: true,
            type: null,
          },
        });
      },
    }),
    {
      name: 'jobs-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist sync queue and status - they should be fresh on app start
      partialize: (state) => ({
        jobs: state.jobs,
        timeEntries: state.timeEntries,
        payPeriods: state.payPeriods,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);