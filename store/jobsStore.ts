import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, TimeEntry, PayPeriod, SyncQueueItem, NetworkInfo, JobWithDuration, UserAccount } from '@/types';
import { 
  supabase, 
  batchSyncJobs, 
  batchSyncTimeEntries, 
  batchSyncPayPeriods, 
  fetchAllUserData,
  checkNetworkConnectivity 
} from '@/lib/supabase';

interface JobsState {
  jobs: Job[];
  timeEntries: TimeEntry[];
  payPeriods: PayPeriod[];
  activeTimeEntry: TimeEntry | null;
  syncQueue: SyncQueueItem[];
  lastSyncTimestamp: number | null;
  networkInfo: NetworkInfo;
  backgroundSyncInterval: ReturnType<typeof setTimeout> | null;
  isLoading: boolean;
  _currentUser: UserAccount | null;
  
  // Job actions
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => string;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  getJob: (id: string) => Job | undefined;
  getJobById: (id: string) => Job | undefined;
  getJobsWithStats: () => JobWithDuration[];
  getActiveJobs: () => JobWithDuration[];
  
  // Time entry actions
  startTimeEntry: (jobId: string, note?: string) => void;
  stopTimeEntry: () => void;
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'createdAt'>) => string;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: string) => void;
  getTimeEntry: (id: string) => TimeEntry | undefined;
  getTimeEntriesForJob: (jobId: string) => TimeEntry[];
  getActiveTimeEntry: (jobId: string) => TimeEntry | undefined;
  
  // Clock actions
  clockIn: (jobId: string, note?: string, customStartTime?: number) => void;
  clockOut: (entryId: string, customEndTime?: number) => void;
  
  // Break actions
  startBreak: (entryId: string, customStartTime?: number) => void;
  endBreak: (entryId: string) => void;
  
  // Pay period actions
  addPayPeriod: (period: Omit<PayPeriod, 'id' | 'createdAt'>) => void;
  updatePayPeriod: (id: string, updates: Partial<PayPeriod>) => void;
  deletePayPeriod: (id: string) => void;
  getPayPeriod: (id: string) => PayPeriod | undefined;
  markPayPeriodAsPaid: (id: string) => void;
  markPayPeriodAsUnpaid: (id: string) => void;
  getJobWithPayPeriods: (jobId: string) => Job & { payPeriods: PayPeriod[]; paidEarnings: number; paidDuration: number } | undefined;
  getPaidEarningsForJob: (jobId: string) => number;
  
  // Stats actions
  getTotalEarnings: () => number;
  getTotalHours: () => number;
  
  // Sync actions
  addToSyncQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) => void;
  processSyncQueue: (userId: string) => Promise<void>;
  syncWithSupabase: (userId: string) => Promise<void>;
  clearSyncQueue: () => void;
  setNetworkInfo: (info: NetworkInfo) => void;
  
  // Background sync
  initializeBackgroundSync: (userId: string) => void;
  stopBackgroundSync: () => void;
  
  // Immediate sync actions
  saveJobImmediately: (job: Job, userId: string) => Promise<void>;
  saveTimeEntryImmediately: (entry: TimeEntry, userId: string) => Promise<void>;
  savePayPeriodImmediately: (period: PayPeriod, userId: string) => Promise<void>;
  
  // Utility actions
  clearAllData: () => void;
  getJobStats: (jobId: string) => {
    totalHours: number;
    totalEarnings: number;
    entriesCount: number;
  };
  getTotalStats: () => {
    totalHours: number;
    totalEarnings: number;
    jobsCount: number;
    entriesCount: number;
  };
  
  // Helper methods for current user
  getCurrentUser: () => UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
}

export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
      jobs: [],
      timeEntries: [],
      payPeriods: [],
      activeTimeEntry: null,
      syncQueue: [],
      lastSyncTimestamp: null,
      networkInfo: { isConnected: false, type: null },
      backgroundSyncInterval: null,
      isLoading: false,
      _currentUser: null,
      
      addJob: (jobData) => {
        // Validate required fields
        if (!jobData.name || !jobData.name.trim()) {
          throw new Error('Job name is required');
        }
        if (!jobData.client || !jobData.client.trim()) {
          throw new Error('Client name is required');
        }
        if (!jobData.hourlyRate || jobData.hourlyRate <= 0) {
          throw new Error('Valid hourly rate is required');
        }
        
        const job: Job = {
          ...jobData,
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: jobData.name.trim(),
          client: jobData.client.trim(),
          createdAt: Date.now(),
        };
        
        set(state => ({ jobs: [...state.jobs, job] }));
        
        // Add to sync queue for backup
        get().addToSyncQueue({
          entityType: 'job',
          entityId: job.id,
          operation: 'create',
          data: job,
        });
        
        // Try immediate save to Supabase
        const currentUser = get().getCurrentUser();
        if (currentUser?.uid) {
          get().saveJobImmediately(job, currentUser.uid).catch(error => {
            console.log('Immediate job save failed, will retry later:', error);
          });
        }
        
        return job.id;
      },
      
      updateJob: (id, updates) => {
        // Validate updates if they include required fields
        if (updates.name !== undefined && (!updates.name || !updates.name.trim())) {
          throw new Error('Job name cannot be empty');
        }
        if (updates.client !== undefined && (!updates.client || !updates.client.trim())) {
          throw new Error('Client name cannot be empty');
        }
        if (updates.hourlyRate !== undefined && (!updates.hourlyRate || updates.hourlyRate <= 0)) {
          throw new Error('Valid hourly rate is required');
        }
        
        // Trim string fields if they exist
        const cleanUpdates = {
          ...updates,
          ...(updates.name && { name: updates.name.trim() }),
          ...(updates.client && { client: updates.client.trim() }),
        };
        
        set(state => ({
          jobs: state.jobs.map(job => 
            job.id === id ? { ...job, ...cleanUpdates } : job
          )
        }));
        
        const updatedJob = get().jobs.find(job => job.id === id);
        if (updatedJob) {
          get().addToSyncQueue({
            entityType: 'job',
            entityId: id,
            operation: 'update',
            data: updatedJob,
          });
          
          // Try immediate save to Supabase
          const currentUser = get().getCurrentUser();
          if (currentUser?.uid) {
            get().saveJobImmediately(updatedJob, currentUser.uid).catch(error => {
              console.log('Immediate job update failed, will retry later:', error);
            });
          }
        }
      },
      
      deleteJob: (id) => {
        const job = get().jobs.find(j => j.id === id);
        if (!job) return;
        
        // Delete related time entries and pay periods
        const relatedEntries = get().timeEntries.filter(entry => entry.jobId === id);
        const relatedPeriods = get().payPeriods.filter(period => period.jobId === id);
        
        set(state => ({
          jobs: state.jobs.filter(job => job.id !== id),
          timeEntries: state.timeEntries.filter(entry => entry.jobId !== id),
          payPeriods: state.payPeriods.filter(period => period.jobId !== id),
          activeTimeEntry: state.activeTimeEntry?.jobId === id ? null : state.activeTimeEntry,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'job',
          entityId: id,
          operation: 'delete',
          data: job,
        });
        
        // Add related deletions to sync queue
        relatedEntries.forEach(entry => {
          get().addToSyncQueue({
            entityType: 'timeEntry',
            entityId: entry.id,
            operation: 'delete',
            data: entry,
          });
        });
        
        relatedPeriods.forEach(period => {
          get().addToSyncQueue({
            entityType: 'payPeriod',
            entityId: period.id,
            operation: 'delete',
            data: period,
          });
        });
      },
      
      getJob: (id) => {
        return get().jobs.find(job => job.id === id);
      },
      
      getJobById: (id) => {
        return get().jobs.find(job => job.id === id);
      },
      
      getJobsWithStats: () => {
        const state = get();
        return state.jobs.map(job => {
          const entries = state.timeEntries.filter(entry => entry.jobId === job.id);
          const activeEntry = entries.find(entry => !entry.endTime);
          
          // Calculate total duration for this job
          const totalDuration = entries.reduce((total, entry) => {
            let entryDuration = 0;
            
            if (entry.endTime) {
              entryDuration = entry.endTime - entry.startTime;
            } else if (entry.endTime === null) {
              entryDuration = Date.now() - entry.startTime;
            }
            
            const breakDuration = (entry.breaks || []).reduce((breakTotal, breakItem) => {
              if (breakItem && breakItem.endTime) {
                return breakTotal + (breakItem.endTime - breakItem.startTime);
              } else if (breakItem && breakItem.endTime === null && entry.isOnBreak) {
                return breakTotal + (Date.now() - breakItem.startTime);
              }
              return breakTotal;
            }, 0);
            
            const workDuration = Math.max(0, entryDuration - breakDuration);
            return total + workDuration;
          }, 0);
          
          return {
            ...job,
            totalDuration,
            isActive: !!activeEntry,
            activeEntryId: activeEntry?.id,
          } as JobWithDuration;
        });
      },
      
      getActiveJobs: () => {
        const state = get();
        return state.jobs.filter(job => {
          const activeEntry = state.timeEntries.find(entry => 
            entry.jobId === job.id && !entry.endTime
          );
          return !!activeEntry;
        }).map(job => {
          const activeEntry = state.timeEntries.find(entry => 
            entry.jobId === job.id && !entry.endTime
          );
          
          // Calculate total duration for this job
          const entries = state.timeEntries.filter(entry => entry.jobId === job.id);
          const totalDuration = entries.reduce((total, entry) => {
            let entryDuration = 0;
            
            if (entry.endTime) {
              entryDuration = entry.endTime - entry.startTime;
            } else if (entry.endTime === null) {
              entryDuration = Date.now() - entry.startTime;
            }
            
            const breakDuration = (entry.breaks || []).reduce((breakTotal, breakItem) => {
              if (breakItem && breakItem.endTime) {
                return breakTotal + (breakItem.endTime - breakItem.startTime);
              } else if (breakItem && breakItem.endTime === null && entry.isOnBreak) {
                return breakTotal + (Date.now() - breakItem.startTime);
              }
              return breakTotal;
            }, 0);
            
            const workDuration = Math.max(0, entryDuration - breakDuration);
            return total + workDuration;
          }, 0);
          
          return {
            ...job,
            totalDuration,
            isActive: true,
            activeEntryId: activeEntry?.id,
          } as JobWithDuration;
        });
      },
      
      startTimeEntry: (jobId, note = '') => {
        const existingActive = get().activeTimeEntry;
        if (existingActive) {
          // Stop the existing active entry first
          get().stopTimeEntry();
        }
        
        const timeEntry: TimeEntry = {
          id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          jobId,
          startTime: Date.now(),
          endTime: null,
          note,
          breaks: [],
          isOnBreak: false,
          createdAt: Date.now(),
        };
        
        set(state => ({
          timeEntries: [...state.timeEntries, timeEntry],
          activeTimeEntry: timeEntry,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: timeEntry.id,
          operation: 'create',
          data: timeEntry,
        });
        
        // Try immediate save to Supabase
        const currentUser = get().getCurrentUser();
        if (currentUser?.uid) {
          get().saveTimeEntryImmediately(timeEntry, currentUser.uid).catch(error => {
            console.log('Immediate time entry save failed, will retry later:', error);
          });
        }
      },
      
      stopTimeEntry: () => {
        const active = get().activeTimeEntry;
        if (!active) return;
        
        const endTime = Date.now();
        const updatedEntry: TimeEntry = {
          ...active,
          endTime,
          isOnBreak: false,
        };
        
        set(state => ({
          timeEntries: state.timeEntries.map(entry =>
            entry.id === active.id ? updatedEntry : entry
          ),
          activeTimeEntry: null,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: active.id,
          operation: 'update',
          data: updatedEntry,
        });
        
        // Try immediate save to Supabase
        const currentUser = get().getCurrentUser();
        if (currentUser?.uid) {
          get().saveTimeEntryImmediately(updatedEntry, currentUser.uid).catch(error => {
            console.log('Immediate time entry update failed, will retry later:', error);
          });
        }
      },
      
      addTimeEntry: (entryData) => {
        try {
          console.log('Creating new time entry:', entryData);
          
          // Validate required fields
          if (!entryData.jobId || !entryData.jobId.trim()) {
            throw new Error('Job ID is required for time entry');
          }
          if (!entryData.startTime || entryData.startTime <= 0) {
            throw new Error('Valid start time is required for time entry');
          }
          
          // Verify the job exists
          const job = get().jobs.find(j => j.id === entryData.jobId);
          if (!job) {
            throw new Error('Cannot create time entry for non-existent job');
          }
          
          const timeEntry: TimeEntry = {
            ...entryData,
            id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            jobId: entryData.jobId.trim(),
            note: entryData.note || '',
            breaks: entryData.breaks || [],
            isOnBreak: entryData.isOnBreak || false,
            createdAt: Date.now(),
          };
          
          console.log('Generated time entry:', timeEntry);
          
          // Add to local state first
          set(state => ({ timeEntries: [...state.timeEntries, timeEntry] }));
          console.log('Time entry added to local state');
          
          // Add to sync queue for backup
          get().addToSyncQueue({
            entityType: 'timeEntry',
            entityId: timeEntry.id,
            operation: 'create',
            data: timeEntry,
          });
          console.log('Time entry added to sync queue');
          
          // Try immediate save to Supabase
          const currentUser = get().getCurrentUser();
          console.log('Current user for sync:', currentUser ? 'found' : 'not found');
          
          if (currentUser?.uid) {
            get().saveTimeEntryImmediately(timeEntry, currentUser.uid).catch(error => {
              console.log('Immediate time entry save failed, will retry later:', error);
            });
          } else {
            console.log('No authenticated user found, time entry saved locally only');
          }
          
          console.log('Time entry creation completed successfully');
          return timeEntry.id;
        } catch (error) {
          console.error('Error in addTimeEntry:', error);
          throw error;
        }
      },
      
      updateTimeEntry: (id, updates) => {
        set(state => ({
          timeEntries: state.timeEntries.map(entry =>
            entry.id === id ? { ...entry, ...updates } : entry
          ),
          activeTimeEntry: state.activeTimeEntry?.id === id 
            ? { ...state.activeTimeEntry, ...updates }
            : state.activeTimeEntry,
        }));
        
        const updatedEntry = get().timeEntries.find(entry => entry.id === id);
        if (updatedEntry) {
          get().addToSyncQueue({
            entityType: 'timeEntry',
            entityId: id,
            operation: 'update',
            data: updatedEntry,
          });
          
          // Try immediate save to Supabase
          const currentUser = get().getCurrentUser();
          if (currentUser?.uid) {
            get().saveTimeEntryImmediately(updatedEntry, currentUser.uid).catch(error => {
              console.log('Immediate time entry update failed, will retry later:', error);
            });
          }
        }
      },
      
      deleteTimeEntry: (id) => {
        const entry = get().timeEntries.find(e => e.id === id);
        if (!entry) return;
        
        set(state => ({
          timeEntries: state.timeEntries.filter(entry => entry.id !== id),
          activeTimeEntry: state.activeTimeEntry?.id === id ? null : state.activeTimeEntry,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: id,
          operation: 'delete',
          data: entry,
        });
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
          entry.jobId === jobId && !entry.endTime
        );
      },
      
      clockIn: (jobId, note = '', customStartTime?: number) => {
        const existingActive = get().activeTimeEntry;
        if (existingActive) {
          // Stop the existing active entry first
          get().clockOut(existingActive.id);
        }
        
        const timeEntry: TimeEntry = {
          id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          jobId,
          startTime: customStartTime || Date.now(),
          endTime: null,
          note,
          breaks: [],
          isOnBreak: false,
          createdAt: Date.now(),
        };
        
        set(state => ({
          timeEntries: [...state.timeEntries, timeEntry],
          activeTimeEntry: timeEntry,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: timeEntry.id,
          operation: 'create',
          data: timeEntry,
        });
        
        // Try immediate save to Supabase
        const currentUser = get().getCurrentUser();
        if (currentUser?.uid) {
          get().saveTimeEntryImmediately(timeEntry, currentUser.uid).catch(error => {
            console.log('Immediate clock in save failed, will retry later:', error);
          });
        }
      },
      
      clockOut: (entryId, customEndTime?: number) => {
        const entry = get().timeEntries.find(e => e.id === entryId);
        if (!entry) return;
        
        const endTime = customEndTime || Date.now();
        const updatedEntry: TimeEntry = {
          ...entry,
          endTime,
          isOnBreak: false,
        };
        
        set(state => ({
          timeEntries: state.timeEntries.map(e =>
            e.id === entryId ? updatedEntry : e
          ),
          activeTimeEntry: state.activeTimeEntry?.id === entryId ? null : state.activeTimeEntry,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: entryId,
          operation: 'update',
          data: updatedEntry,
        });
        
        // Try immediate save to Supabase
        const currentUser = get().getCurrentUser();
        if (currentUser?.uid) {
          get().saveTimeEntryImmediately(updatedEntry, currentUser.uid).catch(error => {
            console.log('Immediate clock out save failed, will retry later:', error);
          });
        }
      },
      
      startBreak: (entryId, customStartTime?: number) => {
        const entry = get().timeEntries.find(e => e.id === entryId);
        if (!entry || entry.isOnBreak) return;
        
        const breakStart = customStartTime || Date.now();
        const breaks = entry.breaks || [];
        const newBreak = {
          id: `break_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          startTime: breakStart,
          endTime: null,
        };
        
        const updatedEntry: TimeEntry = {
          ...entry,
          isOnBreak: true,
          breaks: [...breaks, newBreak],
        };
        
        set(state => ({
          timeEntries: state.timeEntries.map(e =>
            e.id === entryId ? updatedEntry : e
          ),
          activeTimeEntry: state.activeTimeEntry?.id === entryId ? updatedEntry : state.activeTimeEntry,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: entryId,
          operation: 'update',
          data: updatedEntry,
        });
        
        // Try immediate save to Supabase
        const currentUser = get().getCurrentUser();
        if (currentUser?.uid) {
          get().saveTimeEntryImmediately(updatedEntry, currentUser.uid).catch(error => {
            console.log('Immediate break start save failed, will retry later:', error);
          });
        }
      },
      
      endBreak: (entryId) => {
        const entry = get().timeEntries.find(e => e.id === entryId);
        if (!entry || !entry.isOnBreak) return;
        
        const breakEnd = Date.now();
        const breaks = entry.breaks || [];
        const updatedBreaks = breaks.map((breakItem, index) =>
          index === breaks.length - 1 && !breakItem.endTime
            ? { ...breakItem, endTime: breakEnd }
            : breakItem
        );
        
        const updatedEntry: TimeEntry = {
          ...entry,
          isOnBreak: false,
          breaks: updatedBreaks,
        };
        
        set(state => ({
          timeEntries: state.timeEntries.map(e =>
            e.id === entryId ? updatedEntry : e
          ),
          activeTimeEntry: state.activeTimeEntry?.id === entryId ? updatedEntry : state.activeTimeEntry,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: entryId,
          operation: 'update',
          data: updatedEntry,
        });
        
        // Try immediate save to Supabase
        const currentUser = get().getCurrentUser();
        if (currentUser?.uid) {
          get().saveTimeEntryImmediately(updatedEntry, currentUser.uid).catch(error => {
            console.log('Immediate break end save failed, will retry later:', error);
          });
        }
      },
      
      addPayPeriod: (periodData) => {
        const payPeriod: PayPeriod = {
          ...periodData,
          id: `period_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
        };
        
        set(state => ({ payPeriods: [...state.payPeriods, payPeriod] }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'payPeriod',
          entityId: payPeriod.id,
          operation: 'create',
          data: payPeriod,
        });
        
        // Try immediate save to Supabase
        const currentUser = get().getCurrentUser();
        if (currentUser?.uid) {
          get().savePayPeriodImmediately(payPeriod, currentUser.uid).catch(error => {
            console.log('Immediate pay period save failed, will retry later:', error);
          });
        }
      },
      
      updatePayPeriod: (id, updates) => {
        set(state => ({
          payPeriods: state.payPeriods.map(period =>
            period.id === id ? { ...period, ...updates } : period
          )
        }));
        
        const updatedPeriod = get().payPeriods.find(period => period.id === id);
        if (updatedPeriod) {
          get().addToSyncQueue({
            entityType: 'payPeriod',
            entityId: id,
            operation: 'update',
            data: updatedPeriod,
          });
          
          // Try immediate save to Supabase
          const currentUser = get().getCurrentUser();
          if (currentUser?.uid) {
            get().savePayPeriodImmediately(updatedPeriod, currentUser.uid).catch(error => {
              console.log('Immediate pay period update failed, will retry later:', error);
            });
          }
        }
      },
      
      deletePayPeriod: (id) => {
        const period = get().payPeriods.find(p => p.id === id);
        if (!period) return;
        
        set(state => ({
          payPeriods: state.payPeriods.filter(period => period.id !== id)
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'payPeriod',
          entityId: id,
          operation: 'delete',
          data: period,
        });
      },
      
      getPayPeriod: (id) => {
        return get().payPeriods.find(period => period.id === id);
      },
      
      markPayPeriodAsPaid: (id) => {
        get().updatePayPeriod(id, { 
          isPaid: true, 
          paidDate: Date.now() 
        });
      },
      
      markPayPeriodAsUnpaid: (id) => {
        get().updatePayPeriod(id, { 
          isPaid: false, 
          paidDate: undefined 
        });
      },
      
      getJobWithPayPeriods: (jobId) => {
        const state = get();
        const job = state.jobs.find(j => j.id === jobId);
        if (!job) return undefined;
        
        const payPeriods = state.payPeriods.filter(p => p.jobId === jobId);
        const paidEarnings = payPeriods
          .filter(p => p.isPaid)
          .reduce((total, p) => total + p.totalEarnings, 0);
        const paidDuration = payPeriods
          .filter(p => p.isPaid)
          .reduce((total, p) => total + p.totalDuration, 0);
        
        return {
          ...job,
          payPeriods,
          paidEarnings,
          paidDuration,
        };
      },
      
      getPaidEarningsForJob: (jobId) => {
        const state = get();
        return state.payPeriods
          .filter(p => p.jobId === jobId && p.isPaid)
          .reduce((total, p) => total + p.totalEarnings, 0);
      },
      
      getTotalEarnings: () => {
        const state = get();
        let totalEarnings = 0;
        
        state.jobs.forEach(job => {
          const entries = state.timeEntries.filter(entry => entry.jobId === job.id);
          entries.forEach(entry => {
            let entryDuration = 0;
            
            if (entry.endTime) {
              entryDuration = entry.endTime - entry.startTime;
            } else if (entry.endTime === null) {
              entryDuration = Date.now() - entry.startTime;
            }
            
            const breakDuration = (entry.breaks || []).reduce((breakTotal, breakItem) => {
              if (breakItem && breakItem.endTime) {
                return breakTotal + (breakItem.endTime - breakItem.startTime);
              } else if (breakItem && breakItem.endTime === null && entry.isOnBreak) {
                return breakTotal + (Date.now() - breakItem.startTime);
              }
              return breakTotal;
            }, 0);
            
            const workDuration = Math.max(0, entryDuration - breakDuration);
            const durationHours = workDuration / (1000 * 60 * 60);
            totalEarnings += durationHours * job.hourlyRate;
          });
        });
        
        return totalEarnings;
      },
      
      getTotalHours: () => {
        const state = get();
        let totalDuration = 0;
        
        state.timeEntries.forEach(entry => {
          let entryDuration = 0;
          
          if (entry.endTime) {
            entryDuration = entry.endTime - entry.startTime;
          } else if (entry.endTime === null) {
            entryDuration = Date.now() - entry.startTime;
          }
          
          const breakDuration = (entry.breaks || []).reduce((breakTotal, breakItem) => {
            if (breakItem && breakItem.endTime) {
              return breakTotal + (breakItem.endTime - breakItem.startTime);
            } else if (breakItem && breakItem.endTime === null && entry.isOnBreak) {
              return breakTotal + (Date.now() - breakItem.startTime);
            }
            return breakTotal;
          }, 0);
          
          const workDuration = Math.max(0, entryDuration - breakDuration);
          totalDuration += workDuration;
        });
        
        return totalDuration / (1000 * 60 * 60); // Convert to hours
      },
      
      addToSyncQueue: (item) => {
        const queueItem: SyncQueueItem = {
          ...item,
          id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          retryCount: 0,
        };
        
        set(state => ({
          syncQueue: [...state.syncQueue, queueItem]
        }));
      },
      
      processSyncQueue: async (userId: string) => {
        const state = get();
        if (state.syncQueue.length === 0) {
          return;
        }
        
        // Check network connectivity
        const isConnected = await checkNetworkConnectivity();
        if (!isConnected) {
          console.log('No network connection, skipping sync');
          return;
        }
        
        try {
          // Group items by entity type and operation
          const jobItems = state.syncQueue.filter(item => item.entityType === 'job');
          const timeEntryItems = state.syncQueue.filter(item => item.entityType === 'timeEntry');
          const payPeriodItems = state.syncQueue.filter(item => item.entityType === 'payPeriod');
          
          // Process jobs
          if (jobItems.length > 0) {
            const jobsToUpsert = jobItems
              .filter(item => item.operation === 'create' || item.operation === 'update')
              .map(item => item.data as Job);
            const jobsToDelete = jobItems
              .filter(item => item.operation === 'delete')
              .map(item => item.data as Job);
            
            if (jobsToUpsert.length > 0) {
              await batchSyncJobs(jobsToUpsert, userId, 'upsert');
            }
            if (jobsToDelete.length > 0) {
              await batchSyncJobs(jobsToDelete, userId, 'delete');
            }
          }
          
          // Process time entries
          if (timeEntryItems.length > 0) {
            const entriesToUpsert = timeEntryItems
              .filter(item => item.operation === 'create' || item.operation === 'update')
              .map(item => item.data as TimeEntry);
            const entriesToDelete = timeEntryItems
              .filter(item => item.operation === 'delete')
              .map(item => item.data as TimeEntry);
            
            if (entriesToUpsert.length > 0) {
              await batchSyncTimeEntries(entriesToUpsert, userId, 'upsert');
            }
            if (entriesToDelete.length > 0) {
              await batchSyncTimeEntries(entriesToDelete, userId, 'delete');
            }
          }
          
          // Process pay periods
          if (payPeriodItems.length > 0) {
            const periodsToUpsert = payPeriodItems
              .filter(item => item.operation === 'create' || item.operation === 'update')
              .map(item => item.data as PayPeriod);
            const periodsToDelete = payPeriodItems
              .filter(item => item.operation === 'delete')
              .map(item => item.data as PayPeriod);
            
            if (periodsToUpsert.length > 0) {
              await batchSyncPayPeriods(periodsToUpsert, userId, 'upsert');
            }
            if (periodsToDelete.length > 0) {
              await batchSyncPayPeriods(periodsToDelete, userId, 'delete');
            }
          }
          
          // Clear processed items from queue
          set({ 
            syncQueue: [],
            lastSyncTimestamp: Date.now()
          });
          
          console.log('Sync queue processed successfully');
          
        } catch (error) {
          console.error('Error processing sync queue:', error);
          
          // Increment retry count for failed items
          set(state => ({
            syncQueue: state.syncQueue.map(item => ({
              ...item,
              retryCount: item.retryCount + 1
            })).filter(item => item.retryCount < 3) // Remove items that have failed 3 times
          }));
        }
      },
      
      syncWithSupabase: async (userId: string) => {
        try {
          set({ isLoading: true });
          
          // First process any pending local changes (upload to server)
          await get().processSyncQueue(userId);
          
          // Then fetch latest data from Supabase
          const result = await fetchAllUserData(userId);
          
          if (result.errors.length > 0) {
            console.warn('Some data failed to sync:', result.errors);
          }
          
          // Intelligent merge strategy instead of replacing all data
          const currentState = get();
          
          // For jobs: merge by preferring local changes for recently modified items
          const mergedJobs = mergeDataIntelligently(
            currentState.jobs,
            result.jobs,
            'id',
            'createdAt'
          );
          
          // For time entries: preserve active entries and recent changes
          const mergedTimeEntries = mergeDataIntelligently(
            currentState.timeEntries,
            result.timeEntries,
            'id',
            'startTime',
            (local, remote) => {
              // Always prefer local active entries (no endTime)
              if (!local.endTime) return local;
              // For completed entries, prefer the one with later creation time
              return local.createdAt > remote.createdAt ? local : remote;
            }
          );
          
          // For pay periods: merge normally
          const mergedPayPeriods = mergeDataIntelligently(
            currentState.payPeriods,
            result.payPeriods,
            'id',
            'createdAt'
          );
          
          // Update local state with merged data
          set({
            jobs: mergedJobs,
            timeEntries: mergedTimeEntries,
            payPeriods: mergedPayPeriods,
            lastSyncTimestamp: Date.now(),
            isLoading: false,
          });
          
          console.log('Intelligent sync with Supabase completed');
          
        } catch (error) {
          console.error('Error syncing with Supabase:', error);
          set({ isLoading: false });
          throw error;
        }
      },
      
      clearSyncQueue: () => {
        set({ syncQueue: [] });
      },
      
      setNetworkInfo: (info) => {
        set({ networkInfo: info });
      },
      
      initializeBackgroundSync: (userId: string) => {
        // Clear any existing interval
        const currentInterval = get().backgroundSyncInterval;
        if (currentInterval) {
          clearTimeout(currentInterval);
        }
        
        // Set up new background sync interval (every 2 hours)
        const interval = setTimeout(async () => {
          try {
            await get().processSyncQueue(userId);
            // Reschedule the next sync
            get().initializeBackgroundSync(userId);
          } catch (error) {
            console.error('Background sync error:', error);
            // Reschedule even if there was an error
            get().initializeBackgroundSync(userId);
          }
        }, 2 * 60 * 60 * 1000); // Every 2 hours
        
        set({ backgroundSyncInterval: interval as any });
      },
      
      stopBackgroundSync: () => {
        const interval = get().backgroundSyncInterval;
        if (interval) {
          clearTimeout(interval);
          set({ backgroundSyncInterval: null });
        }
      },
      
      // Immediate save functions
      saveJobImmediately: async (job: Job, userId: string) => {
        try {
          const isConnected = await checkNetworkConnectivity();
          if (!isConnected) {
            throw new Error('No network connection');
          }
          
          await batchSyncJobs([job], userId, 'upsert');
          console.log('Job saved immediately to Supabase');
        } catch (error) {
          console.error('Failed to save job immediately:', error);
          throw error;
        }
      },
      
      saveTimeEntryImmediately: async (entry: TimeEntry, userId: string) => {
        try {
          const isConnected = await checkNetworkConnectivity();
          if (!isConnected) {
            throw new Error('No network connection');
          }
          
          await batchSyncTimeEntries([entry], userId, 'upsert');
          console.log('Time entry saved immediately to Supabase');
        } catch (error) {
          console.error('Failed to save time entry immediately:', error);
          throw error;
        }
      },
      
      savePayPeriodImmediately: async (period: PayPeriod, userId: string) => {
        try {
          const isConnected = await checkNetworkConnectivity();
          if (!isConnected) {
            throw new Error('No network connection');
          }
          
          await batchSyncPayPeriods([period], userId, 'upsert');
          console.log('Pay period saved immediately to Supabase');
        } catch (error) {
          console.error('Failed to save pay period immediately:', error);
          throw error;
        }
      },
      
      clearAllData: () => {
        // Stop any active time entry
        get().stopTimeEntry();
        
        // Clear all data
        set({
          jobs: [],
          timeEntries: [],
          payPeriods: [],
          activeTimeEntry: null,
          syncQueue: [],
          lastSyncTimestamp: null,
        });
      },
      
      getJobStats: (jobId) => {
        const state = get();
        const entries = state.timeEntries.filter(entry => entry.jobId === jobId);
        const job = state.jobs.find(j => j.id === jobId);
        
        const totalHours = entries.reduce((total, entry) => {
          if (!entry.endTime) return total;
          
          const duration = entry.endTime - entry.startTime;
          const breaks = entry.breaks || [];
          const breakDuration = breaks.reduce((breakTotal, breakItem) => {
            if (breakItem && breakItem.endTime) {
              return breakTotal + (breakItem.endTime - breakItem.startTime);
            }
            return breakTotal;
          }, 0);
          
          return total + (duration - breakDuration);
        }, 0) / (1000 * 60 * 60); // Convert to hours
        
        const totalEarnings = job ? totalHours * job.hourlyRate : 0;
        
        return {
          totalHours,
          totalEarnings,
          entriesCount: entries.length,
        };
      },
      
      getTotalStats: () => {
        const state = get();
        
        let totalHours = 0;
        let totalEarnings = 0;
        
        state.jobs.forEach(job => {
          const jobStats = get().getJobStats(job.id);
          totalHours += jobStats.totalHours;
          totalEarnings += jobStats.totalEarnings;
        });
        
        return {
          totalHours,
          totalEarnings,
          jobsCount: state.jobs.length,
          entriesCount: state.timeEntries.length,
        };
      },
      
      // Helper methods for current user
      getCurrentUser: () => {
        return get()._currentUser;
      },
      
      setCurrentUser: (user: UserAccount | null) => {
        set({ _currentUser: user });
      },
    }),
    {
      name: 'jobs-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist network info, sync queue, or background sync interval
      partialize: (state) => ({
        jobs: state.jobs,
        timeEntries: state.timeEntries,
        payPeriods: state.payPeriods,
        activeTimeEntry: state.activeTimeEntry,
        lastSyncTimestamp: state.lastSyncTimestamp,
        _currentUser: state._currentUser,
        // Don't persist syncQueue, networkInfo, backgroundSyncInterval, or isLoading
      }),
    }
  )
);

// Helper function for intelligent data merging
function mergeDataIntelligently<T extends { id: string; createdAt: number }>(
  localData: T[],
  remoteData: T[],
  idField: keyof T,
  timestampField: keyof T,
  conflictResolver?: (local: T, remote: T) => T
): T[] {
  const merged = new Map<string, T>();
  
  // Add all local items first
  localData.forEach(item => {
    merged.set(item[idField] as string, item);
  });
  
  // Merge remote items
  remoteData.forEach(remoteItem => {
    const id = remoteItem[idField] as string;
    const localItem = merged.get(id);
    
    if (!localItem) {
      // New item from remote, add it
      merged.set(id, remoteItem);
    } else {
      // Conflict resolution
      if (conflictResolver) {
        merged.set(id, conflictResolver(localItem, remoteItem));
      } else {
        // Default: prefer the item with later timestamp
        const localTimestamp = localItem[timestampField] as number;
        const remoteTimestamp = remoteItem[timestampField] as number;
        merged.set(id, localTimestamp > remoteTimestamp ? localItem : remoteItem);
      }
    }
  });
  
  return Array.from(merged.values());
}