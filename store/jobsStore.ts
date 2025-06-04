import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, TimeEntry, PayPeriod, SyncQueueItem, NetworkInfo } from '@/types';
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
  backgroundSyncInterval: ReturnType<typeof setInterval> | null;
  
  // Job actions
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  getJob: (id: string) => Job | undefined;
  
  // Time entry actions
  startTimeEntry: (jobId: string, note?: string) => void;
  stopTimeEntry: () => void;
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'createdAt'>) => void;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: string) => void;
  getTimeEntry: (id: string) => TimeEntry | undefined;
  
  // Break actions
  startBreak: () => void;
  endBreak: () => void;
  
  // Pay period actions
  addPayPeriod: (period: Omit<PayPeriod, 'id' | 'createdAt'>) => void;
  updatePayPeriod: (id: string, updates: Partial<PayPeriod>) => void;
  deletePayPeriod: (id: string) => void;
  getPayPeriod: (id: string) => PayPeriod | undefined;
  markPayPeriodAsPaid: (id: string) => void;
  
  // Sync actions
  addToSyncQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) => void;
  processSyncQueue: (userId: string) => Promise<void>;
  syncWithSupabase: (userId: string) => Promise<void>;
  clearSyncQueue: () => void;
  setNetworkInfo: (info: NetworkInfo) => void;
  
  // Background sync
  initializeBackgroundSync: (userId: string) => void;
  stopBackgroundSync: () => void;
  
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
      
      addJob: (jobData) => {
        const job: Job = {
          ...jobData,
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
        };
        
        set(state => ({ jobs: [...state.jobs, job] }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'job',
          entityId: job.id,
          operation: 'create',
          data: job,
        });
      },
      
      updateJob: (id, updates) => {
        set(state => ({
          jobs: state.jobs.map(job => 
            job.id === id ? { ...job, ...updates } : job
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
      },
      
      addTimeEntry: (entryData) => {
        const timeEntry: TimeEntry = {
          ...entryData,
          id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          breaks: entryData.breaks || [],
          createdAt: Date.now(),
        };
        
        set(state => ({ timeEntries: [...state.timeEntries, timeEntry] }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: timeEntry.id,
          operation: 'create',
          data: timeEntry,
        });
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
      
      startBreak: () => {
        const active = get().activeTimeEntry;
        if (!active || active.isOnBreak) return;
        
        const breakStart = Date.now();
        const breaks = active.breaks || [];
        const updatedEntry: TimeEntry = {
          ...active,
          isOnBreak: true,
          breaks: [
            ...breaks,
            { startTime: breakStart, endTime: null }
          ],
        };
        
        set(state => ({
          timeEntries: state.timeEntries.map(entry =>
            entry.id === active.id ? updatedEntry : entry
          ),
          activeTimeEntry: updatedEntry,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: active.id,
          operation: 'update',
          data: updatedEntry,
        });
      },
      
      endBreak: () => {
        const active = get().activeTimeEntry;
        if (!active || !active.isOnBreak) return;
        
        const breakEnd = Date.now();
        const breaks = active.breaks || [];
        const updatedBreaks = breaks.map((breakItem, index) =>
          index === breaks.length - 1 && !breakItem.endTime
            ? { ...breakItem, endTime: breakEnd }
            : breakItem
        );
        
        const updatedEntry: TimeEntry = {
          ...active,
          isOnBreak: false,
          breaks: updatedBreaks,
        };
        
        set(state => ({
          timeEntries: state.timeEntries.map(entry =>
            entry.id === active.id ? updatedEntry : entry
          ),
          activeTimeEntry: updatedEntry,
        }));
        
        // Add to sync queue
        get().addToSyncQueue({
          entityType: 'timeEntry',
          entityId: active.id,
          operation: 'update',
          data: updatedEntry,
        });
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
          // First process any pending local changes
          await get().processSyncQueue(userId);
          
          // Then fetch latest data from Supabase
          const result = await fetchAllUserData(userId);
          
          if (result.errors.length > 0) {
            console.warn('Some data failed to sync:', result.errors);
          }
          
          // Update local state with server data
          // Note: This is a simple merge strategy. In a production app,
          // you might want more sophisticated conflict resolution
          set({
            jobs: result.jobs,
            timeEntries: result.timeEntries,
            payPeriods: result.payPeriods,
            lastSyncTimestamp: Date.now(),
          });
          
          console.log('Full sync with Supabase completed');
          
        } catch (error) {
          console.error('Error syncing with Supabase:', error);
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
          clearInterval(currentInterval);
        }
        
        // Set up new background sync interval (every 5 minutes)
        const interval = setInterval(async () => {
          try {
            await get().processSyncQueue(userId);
          } catch (error) {
            console.error('Background sync error:', error);
          }
        }, 5 * 60 * 1000);
        
        set({ backgroundSyncInterval: interval });
      },
      
      stopBackgroundSync: () => {
        const interval = get().backgroundSyncInterval;
        if (interval) {
          clearInterval(interval);
          set({ backgroundSyncInterval: null });
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
            if (breakItem.endTime) {
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
        // Don't persist syncQueue, networkInfo, or backgroundSyncInterval
      }),
    }
  )
);