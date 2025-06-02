import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, TimeEntry, PayPeriod, JobWithDuration, JobWithPayPeriods } from '@/types';
import { generateId } from '@/utils/helpers';
import { getStartOfWeek, getEndOfWeek } from '@/utils/time';
import { supabase } from '@/lib/supabase';

interface JobsState {
  jobs: Job[];
  timeEntries: TimeEntry[];
  payPeriods: PayPeriod[];
  isLoading: boolean;
  lastSyncTime: number | null;
  
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
  setLoading: (loading: boolean) => void;
  
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

export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
      jobs: [],
      timeEntries: [],
      payPeriods: [],
      isLoading: false,
      lastSyncTime: null,
      
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      
      syncWithSupabase: async (userId: string) => {
        try {
          set({ isLoading: true });
          
          // Check if user is authenticated
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            console.log('User not authenticated, skipping sync');
            set({ isLoading: false });
            return;
          }
          
          // Sync jobs
          try {
            const { data: jobsData, error: jobsError } = await supabase
              .from('jobs')
              .select('*')
              .eq('user_id', userId);
            
            if (jobsError) {
              console.error('Error syncing jobs:', jobsError);
            } else if (jobsData) {
              const supabaseJobs: Job[] = jobsData.map(job => ({
                id: job.id,
                name: job.name,
                hourlyRate: job.hourly_rate,
                color: job.color,
                settings: job.settings,
                createdAt: new Date(job.created_at).getTime(),
              }));
              
              // Merge with local jobs (keep local if newer)
              const localJobs = get().jobs;
              const mergedJobs = [...supabaseJobs];
              
              localJobs.forEach(localJob => {
                const existingIndex = mergedJobs.findIndex(j => j.id === localJob.id);
                if (existingIndex === -1) {
                  // Local job doesn't exist in Supabase, upload it
                  mergedJobs.push(localJob);
                  supabase.from('jobs').insert({
                    id: localJob.id,
                    user_id: userId,
                    name: localJob.name,
                    hourly_rate: localJob.hourlyRate,
                    color: localJob.color,
                    settings: localJob.settings,
                    created_at: new Date(localJob.createdAt).toISOString(),
                  });
                }
              });
              
              set({ jobs: mergedJobs });
            }
          } catch (error) {
            console.error('Jobs sync error:', error);
          }
          
          // Sync time entries
          try {
            const { data: entriesData, error: entriesError } = await supabase
              .from('time_entries')
              .select('*')
              .eq('user_id', userId);
            
            if (entriesError) {
              console.error('Error syncing time entries:', entriesError);
            } else if (entriesData) {
              const supabaseEntries: TimeEntry[] = entriesData.map(entry => ({
                id: entry.id,
                jobId: entry.job_id,
                startTime: new Date(entry.start_time).getTime(),
                endTime: entry.end_time ? new Date(entry.end_time).getTime() : null,
                note: entry.note,
                breaks: entry.breaks,
                isOnBreak: entry.is_on_break,
                paidInPeriodId: entry.paid_in_period_id,
                createdAt: new Date(entry.created_at).getTime(),
              }));
              
              // Merge with local entries
              const localEntries = get().timeEntries;
              const mergedEntries = [...supabaseEntries];
              
              localEntries.forEach(localEntry => {
                const existingIndex = mergedEntries.findIndex(e => e.id === localEntry.id);
                if (existingIndex === -1) {
                  // Local entry doesn't exist in Supabase, upload it
                  mergedEntries.push(localEntry);
                  supabase.from('time_entries').insert({
                    id: localEntry.id,
                    user_id: userId,
                    job_id: localEntry.jobId,
                    start_time: new Date(localEntry.startTime).toISOString(),
                    end_time: localEntry.endTime ? new Date(localEntry.endTime).toISOString() : null,
                    note: localEntry.note,
                    breaks: localEntry.breaks,
                    is_on_break: localEntry.isOnBreak,
                    paid_in_period_id: localEntry.paidInPeriodId,
                    created_at: new Date(localEntry.createdAt).toISOString(),
                  });
                }
              });
              
              set({ timeEntries: mergedEntries });
            }
          } catch (error) {
            console.error('Time entries sync error:', error);
          }
          
          // Sync pay periods
          try {
            const { data: periodsData, error: periodsError } = await supabase
              .from('pay_periods')
              .select('*')
              .eq('user_id', userId);
            
            if (periodsError) {
              console.error('Error syncing pay periods:', periodsError);
            } else if (periodsData) {
              const supabasePeriods: PayPeriod[] = periodsData.map(period => ({
                id: period.id,
                jobId: period.job_id,
                startDate: new Date(period.start_date).getTime(),
                endDate: new Date(period.end_date).getTime(),
                totalDuration: period.total_duration,
                totalEarnings: period.total_earnings,
                isPaid: period.is_paid,
                paidDate: period.paid_date ? new Date(period.paid_date).getTime() : undefined,
                timeEntryIds: period.time_entry_ids,
                createdAt: new Date(period.created_at).getTime(),
              }));
              
              set({ payPeriods: supabasePeriods });
            }
          } catch (error) {
            console.error('Pay periods sync error:', error);
          }
          
          set({ lastSyncTime: Date.now() });
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
        
        // Sync to Supabase if user is authenticated
        const syncToSupabase = async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('jobs').insert({
                id: newJob.id,
                user_id: user.id,
                name: newJob.name,
                hourly_rate: newJob.hourlyRate,
                color: newJob.color,
                settings: newJob.settings,
                created_at: new Date(newJob.createdAt).toISOString(),
              });
            }
          } catch (error) {
            console.error('Error syncing job to Supabase:', error);
          }
        };
        syncToSupabase();
        
        return id;
      },
      
      updateJob: (id, updates) => {
        try {
          set((state) => ({
            jobs: state.jobs.map(job => 
              job.id === id ? { ...job, ...updates } : job
            )
          }));
          
          // Sync to Supabase if user is authenticated
          const syncToSupabase = async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const updatedJob = get().jobs.find(j => j.id === id);
                if (updatedJob) {
                  await supabase.from('jobs').update({
                    name: updatedJob.name,
                    hourly_rate: updatedJob.hourlyRate,
                    color: updatedJob.color,
                    settings: updatedJob.settings,
                  }).eq('id', id).eq('user_id', user.id);
                }
              }
            } catch (error) {
              console.error('Error syncing job update to Supabase:', error);
            }
          };
          syncToSupabase();
          
          return true;
        } catch (error) {
          console.error('Error updating job:', error);
          return false;
        }
      },
      
      deleteJob: (id) => {
        try {
          set((state) => ({
            jobs: state.jobs.filter(job => job.id !== id),
            timeEntries: state.timeEntries.filter(entry => entry.jobId !== id),
            payPeriods: state.payPeriods.filter(period => period.jobId !== id)
          }));
          
          // Sync to Supabase if user is authenticated
          const syncToSupabase = async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('jobs').delete().eq('id', id).eq('user_id', user.id);
                await supabase.from('time_entries').delete().eq('job_id', id).eq('user_id', user.id);
                await supabase.from('pay_periods').delete().eq('job_id', id).eq('user_id', user.id);
              }
            } catch (error) {
              console.error('Error syncing job deletion to Supabase:', error);
            }
          };
          syncToSupabase();
          
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
        
        // Sync to Supabase if user is authenticated
        const syncToSupabase = async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('time_entries').insert({
                id: newEntry.id,
                user_id: user.id,
                job_id: newEntry.jobId,
                start_time: new Date(newEntry.startTime).toISOString(),
                end_time: null,
                note: newEntry.note,
                breaks: newEntry.breaks,
                is_on_break: newEntry.isOnBreak,
                paid_in_period_id: newEntry.paidInPeriodId,
                created_at: new Date(newEntry.createdAt).toISOString(),
              });
            }
          } catch (error) {
            console.error('Error syncing clock in to Supabase:', error);
          }
        };
        syncToSupabase();
        
        return id;
      },
      
      clockOut: (entryId, customEndTime) => {
        try {
          const endTime = customEndTime || Date.now();
          
          set((state) => ({
            timeEntries: state.timeEntries.map(entry => {
              if (entry.id === entryId) {
                // If currently on break, end the break first
                const updatedBreaks = entry.isOnBreak && entry.breaks ? 
                  entry.breaks.map((breakItem, index) => 
                    index === entry.breaks!.length - 1 && !breakItem.endTime
                      ? { ...breakItem, endTime }
                      : breakItem
                  ) : entry.breaks;
                
                return {
                  ...entry,
                  endTime,
                  isOnBreak: false,
                  breaks: updatedBreaks
                };
              }
              return entry;
            })
          }));
          
          // Sync to Supabase if user is authenticated
          const syncToSupabase = async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const updatedEntry = get().timeEntries.find(e => e.id === entryId);
                if (updatedEntry) {
                  await supabase.from('time_entries').update({
                    end_time: new Date(endTime).toISOString(),
                    is_on_break: false,
                    breaks: updatedEntry.breaks,
                  }).eq('id', entryId).eq('user_id', user.id);
                }
              }
            } catch (error) {
              console.error('Error syncing clock out to Supabase:', error);
            }
          };
          syncToSupabase();
          
          // Regenerate pay periods after clocking out
          setTimeout(() => {
            get().generatePayPeriods();
          }, 100);
          
          return true;
        } catch (error) {
          console.error('Error clocking out:', error);
          return false;
        }
      },
      
      startBreak: (entryId, customStartTime) => {
        try {
          const startTime = customStartTime || Date.now();
          
          set((state) => ({
            timeEntries: state.timeEntries.map(entry => 
              entry.id === entryId 
                ? {
                    ...entry,
                    isOnBreak: true,
                    breaks: [
                      ...(entry.breaks || []),
                      { id: generateId(), startTime, endTime: null }
                    ]
                  }
                : entry
            )
          }));
          
          // Sync to Supabase if user is authenticated
          const syncToSupabase = async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const updatedEntry = get().timeEntries.find(e => e.id === entryId);
                if (updatedEntry) {
                  await supabase.from('time_entries').update({
                    is_on_break: true,
                    breaks: updatedEntry.breaks,
                  }).eq('id', entryId).eq('user_id', user.id);
                }
              }
            } catch (error) {
              console.error('Error syncing break start to Supabase:', error);
            }
          };
          syncToSupabase();
          
          return true;
        } catch (error) {
          console.error('Error starting break:', error);
          return false;
        }
      },
      
      endBreak: (entryId) => {
        try {
          const endTime = Date.now();
          
          set((state) => ({
            timeEntries: state.timeEntries.map(entry => {
              if (entry.id === entryId && entry.isOnBreak) {
                const updatedBreaks = entry.breaks?.map((breakItem, index) => 
                  index === entry.breaks!.length - 1 && !breakItem.endTime
                    ? { ...breakItem, endTime }
                    : breakItem
                ) || [];
                
                return {
                  ...entry,
                  isOnBreak: false,
                  breaks: updatedBreaks
                };
              }
              return entry;
            })
          }));
          
          // Sync to Supabase if user is authenticated
          const syncToSupabase = async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const updatedEntry = get().timeEntries.find(e => e.id === entryId);
                if (updatedEntry) {
                  await supabase.from('time_entries').update({
                    is_on_break: false,
                    breaks: updatedEntry.breaks,
                  }).eq('id', entryId).eq('user_id', user.id);
                }
              }
            } catch (error) {
              console.error('Error syncing break end to Supabase:', error);
            }
          };
          syncToSupabase();
          
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
        
        // Sync to Supabase if user is authenticated
        const syncToSupabase = async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('time_entries').insert({
                id: newEntry.id,
                user_id: user.id,
                job_id: newEntry.jobId,
                start_time: new Date(newEntry.startTime).toISOString(),
                end_time: newEntry.endTime ? new Date(newEntry.endTime).toISOString() : null,
                note: newEntry.note,
                breaks: newEntry.breaks,
                is_on_break: newEntry.isOnBreak,
                paid_in_period_id: newEntry.paidInPeriodId,
                created_at: new Date(newEntry.createdAt).toISOString(),
              });
            }
          } catch (error) {
            console.error('Error syncing time entry to Supabase:', error);
          }
        };
        syncToSupabase();
        
        // Regenerate pay periods after adding entry
        setTimeout(() => {
          get().generatePayPeriods();
        }, 100);
        
        return id;
      },
      
      updateTimeEntry: (updatedEntry) => {
        try {
          set((state) => ({
            timeEntries: state.timeEntries.map(entry => 
              entry.id === updatedEntry.id ? updatedEntry : entry
            )
          }));
          
          // Sync to Supabase if user is authenticated
          const syncToSupabase = async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('time_entries').update({
                  job_id: updatedEntry.jobId,
                  start_time: new Date(updatedEntry.startTime).toISOString(),
                  end_time: updatedEntry.endTime ? new Date(updatedEntry.endTime).toISOString() : null,
                  note: updatedEntry.note,
                  breaks: updatedEntry.breaks,
                  is_on_break: updatedEntry.isOnBreak,
                  paid_in_period_id: updatedEntry.paidInPeriodId,
                }).eq('id', updatedEntry.id).eq('user_id', user.id);
              }
            } catch (error) {
              console.error('Error syncing time entry update to Supabase:', error);
            }
          };
          syncToSupabase();
          
          // Regenerate pay periods after updating entry
          setTimeout(() => {
            get().generatePayPeriods();
          }, 100);
          
          return true;
        } catch (error) {
          console.error('Error updating time entry:', error);
          return false;
        }
      },
      
      deleteTimeEntry: (id) => {
        try {
          set((state) => {
            // Find the entry being deleted to get its paidInPeriodId
            const entryToDelete = state.timeEntries.find(entry => entry.id === id);
            
            // Remove the entry from timeEntries
            const updatedTimeEntries = state.timeEntries.filter(entry => entry.id !== id);
            
            // If the entry was part of a paid period, we need to update that period
            let updatedPayPeriods = state.payPeriods;
            if (entryToDelete?.paidInPeriodId) {
              updatedPayPeriods = state.payPeriods.map(period => {
                if (period.id === entryToDelete.paidInPeriodId) {
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
          
          // Sync to Supabase if user is authenticated
          const syncToSupabase = async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('time_entries').delete().eq('id', id).eq('user_id', user.id);
              }
            } catch (error) {
              console.error('Error syncing time entry deletion to Supabase:', error);
            }
          };
          syncToSupabase();
          
          // Regenerate pay periods after deleting entry to ensure consistency
          setTimeout(() => {
            get().generatePayPeriods();
          }, 100);
          
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
        const { jobs, timeEntries } = get();
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
            
            // Check if any entry in this period is already paid
            const isPaid = entries.some(entry => entry.paidInPeriodId);
            const existingPeriod = get().payPeriods.find(period => 
              period.jobId === job.id && 
              period.startDate === sunday.getTime() &&
              period.endDate === saturday.getTime()
            );
            
            const periodId = existingPeriod?.id || generateId();
            
            newPayPeriods.push({
              id: periodId,
              jobId: job.id,
              startDate: sunday.getTime(),
              endDate: saturday.getTime(),
              totalDuration,
              totalEarnings,
              isPaid: existingPeriod?.isPaid || isPaid,
              paidDate: existingPeriod?.paidDate,
              timeEntryIds: entries.map(e => e.id),
              createdAt: existingPeriod?.createdAt || Date.now()
            });
          });
        });
        
        set({ payPeriods: newPayPeriods });
        
        // Sync pay periods to Supabase if user is authenticated
        const syncToSupabase = async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // Delete existing pay periods for this user and recreate them
              await supabase.from('pay_periods').delete().eq('user_id', user.id);
              
              if (newPayPeriods.length > 0) {
                const supabasePayPeriods = newPayPeriods.map(period => ({
                  id: period.id,
                  user_id: user.id,
                  job_id: period.jobId,
                  start_date: new Date(period.startDate).toISOString(),
                  end_date: new Date(period.endDate).toISOString(),
                  total_duration: period.totalDuration,
                  total_earnings: period.totalEarnings,
                  is_paid: period.isPaid,
                  paid_date: period.paidDate ? new Date(period.paidDate).toISOString() : null,
                  time_entry_ids: period.timeEntryIds,
                  created_at: new Date(period.createdAt).toISOString(),
                }));
                
                await supabase.from('pay_periods').insert(supabasePayPeriods);
              }
            }
          } catch (error) {
            console.error('Error syncing pay periods to Supabase:', error);
          }
        };
        syncToSupabase();
      },
      
      markPayPeriodAsPaid: (periodId) => {
        try {
          const paidDate = Date.now();
          
          set((state) => {
            const period = state.payPeriods.find(p => p.id === periodId);
            if (!period) return state;
            
            return {
              payPeriods: state.payPeriods.map(p => 
                p.id === periodId 
                  ? { ...p, isPaid: true, paidDate }
                  : p
              ),
              timeEntries: state.timeEntries.map(entry => 
                period.timeEntryIds.includes(entry.id)
                  ? { ...entry, paidInPeriodId: periodId }
                  : entry
              )
            };
          });
          
          // Sync to Supabase if user is authenticated
          const syncToSupabase = async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('pay_periods').update({
                  is_paid: true,
                  paid_date: new Date(paidDate).toISOString(),
                }).eq('id', periodId).eq('user_id', user.id);
                
                const period = get().payPeriods.find(p => p.id === periodId);
                if (period) {
                  await supabase.from('time_entries').update({
                    paid_in_period_id: periodId,
                  }).in('id', period.timeEntryIds).eq('user_id', user.id);
                }
              }
            } catch (error) {
              console.error('Error syncing pay period payment to Supabase:', error);
            }
          };
          syncToSupabase();
          
          return true;
        } catch (error) {
          console.error('Error marking pay period as paid:', error);
          return false;
        }
      },
      
      markPayPeriodAsUnpaid: (periodId) => {
        try {
          set((state) => {
            const period = state.payPeriods.find(p => p.id === periodId);
            if (!period) return state;
            
            return {
              payPeriods: state.payPeriods.map(p => 
                p.id === periodId 
                  ? { ...p, isPaid: false, paidDate: undefined }
                  : p
              ),
              timeEntries: state.timeEntries.map(entry => 
                period.timeEntryIds.includes(entry.id)
                  ? { ...entry, paidInPeriodId: undefined }
                  : entry
              )
            };
          });
          
          // Sync to Supabase if user is authenticated
          const syncToSupabase = async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('pay_periods').update({
                  is_paid: false,
                  paid_date: null,
                }).eq('id', periodId).eq('user_id', user.id);
                
                const period = get().payPeriods.find(p => p.id === periodId);
                if (period) {
                  await supabase.from('time_entries').update({
                    paid_in_period_id: null,
                  }).in('id', period.timeEntryIds).eq('user_id', user.id);
                }
              }
            } catch (error) {
              console.error('Error syncing pay period unpayment to Supabase:', error);
            }
          };
          syncToSupabase();
          
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
        set({
          jobs: [],
          timeEntries: [],
          payPeriods: [],
          isLoading: false,
          lastSyncTime: null,
        });
      },
    }),
    {
      name: 'jobs-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);