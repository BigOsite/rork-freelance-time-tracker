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

// Helper function to sync a single job to Supabase
const syncJobToSupabase = async (job: Job, userId: string, operation: 'insert' | 'update' | 'delete') => {
  try {
    switch (operation) {
      case 'insert':
        const { error: insertError } = await supabase.from('jobs').insert({
          id: job.id,
          user_id: userId,
          name: job.title,
          hourly_rate: job.hourlyRate,
          color: job.color,
          settings: job.settings,
          created_at: new Date(job.createdAt).toISOString(),
        });
        if (insertError) throw insertError;
        break;
        
      case 'update':
        const { error: updateError } = await supabase.from('jobs').update({
          name: job.title,
          hourly_rate: job.hourlyRate,
          color: job.color,
          settings: job.settings,
        }).eq('id', job.id).eq('user_id', userId);
        if (updateError) throw updateError;
        break;
        
      case 'delete':
        const { error: deleteError } = await supabase.from('jobs').delete()
          .eq('id', job.id).eq('user_id', userId);
        if (deleteError) throw deleteError;
        break;
    }
  } catch (error) {
    console.error(`Error syncing job ${operation}:`, error);
    throw error;
  }
};

// Helper function to sync a single time entry to Supabase
const syncTimeEntryToSupabase = async (entry: TimeEntry, userId: string, operation: 'insert' | 'update' | 'delete') => {
  try {
    switch (operation) {
      case 'insert':
        const { error: insertError } = await supabase.from('time_entries').insert({
          id: entry.id,
          user_id: userId,
          job_id: entry.jobId,
          start_time: new Date(entry.startTime).toISOString(),
          end_time: entry.endTime ? new Date(entry.endTime).toISOString() : null,
          note: entry.note || '',
          breaks: entry.breaks || [],
          is_on_break: entry.isOnBreak || false,
          paid_in_period_id: entry.paidInPeriodId || null,
          created_at: new Date(entry.createdAt).toISOString(),
        });
        if (insertError) throw insertError;
        break;
        
      case 'update':
        const { error: updateError } = await supabase.from('time_entries').update({
          job_id: entry.jobId,
          start_time: new Date(entry.startTime).toISOString(),
          end_time: entry.endTime ? new Date(entry.endTime).toISOString() : null,
          note: entry.note || '',
          breaks: entry.breaks || [],
          is_on_break: entry.isOnBreak || false,
          paid_in_period_id: entry.paidInPeriodId || null,
        }).eq('id', entry.id).eq('user_id', userId);
        if (updateError) throw updateError;
        break;
        
      case 'delete':
        const { error: deleteError } = await supabase.from('time_entries').delete()
          .eq('id', entry.id).eq('user_id', userId);
        if (deleteError) throw deleteError;
        break;
    }
  } catch (error) {
    console.error(`Error syncing time entry ${operation}:`, error);
    throw error;
  }
};

// Helper function to sync a single pay period to Supabase with upsert logic
const syncPayPeriodToSupabase = async (period: PayPeriod, userId: string, operation: 'upsert' | 'delete') => {
  try {
    switch (operation) {
      case 'upsert':
        // Use upsert to handle both insert and update cases
        const { error: upsertError } = await supabase.from('pay_periods').upsert({
          id: period.id,
          user_id: userId,
          job_id: period.jobId,
          start_date: new Date(period.startDate).toISOString(),
          end_date: new Date(period.endDate).toISOString(),
          total_duration: period.totalDuration,
          total_earnings: period.totalEarnings,
          is_paid: period.isPaid,
          paid_date: period.paidDate ? new Date(period.paidDate).toISOString() : null,
          time_entry_ids: period.timeEntryIds,
          created_at: new Date(period.createdAt).toISOString(),
        }, {
          onConflict: 'id'
        });
        if (upsertError) throw upsertError;
        break;
        
      case 'delete':
        const { error: deleteError } = await supabase.from('pay_periods').delete()
          .eq('id', period.id).eq('user_id', userId);
        if (deleteError) throw deleteError;
        break;
    }
  } catch (error) {
    console.error(`Error syncing pay period ${operation}:`, error);
    throw error;
  }
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
          const currentUserId = await getCurrentUserId();
          if (!currentUserId || currentUserId !== userId) {
            console.log('User not authenticated or ID mismatch, skipping sync');
            set({ isLoading: false });
            return;
          }
          
          // Sync jobs
          try {
            const { data: jobsData, error: jobsError } = await supabase
              .from('jobs')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
            
            if (jobsError) {
              console.error('Error syncing jobs:', jobsError);
            } else if (jobsData) {
              const supabaseJobs: Job[] = jobsData.map(job => ({
                id: job.id,
                title: job.name,
                client: job.client || '',
                hourlyRate: job.hourly_rate,
                color: job.color,
                settings: job.settings,
                createdAt: new Date(job.created_at).getTime(),
              }));
              
              // Merge with local jobs (prioritize Supabase data for consistency)
              const localJobs = get().jobs;
              const mergedJobs = [...supabaseJobs];
              
              // Add any local jobs that don't exist in Supabase
              for (const localJob of localJobs) {
                const existsInSupabase = supabaseJobs.some(j => j.id === localJob.id);
                if (!existsInSupabase) {
                  // Upload local job to Supabase
                  try {
                    await syncJobToSupabase(localJob, userId, 'insert');
                    mergedJobs.push(localJob);
                  } catch (error) {
                    console.error('Error uploading local job:', error);
                    // Keep local job even if upload fails
                    mergedJobs.push(localJob);
                  }
                }
              }
              
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
              .eq('user_id', userId)
              .order('start_time', { ascending: false });
            
            if (entriesError) {
              console.error('Error syncing time entries:', entriesError);
            } else if (entriesData) {
              const supabaseEntries: TimeEntry[] = entriesData.map(entry => ({
                id: entry.id,
                jobId: entry.job_id,
                startTime: new Date(entry.start_time).getTime(),
                endTime: entry.end_time ? new Date(entry.end_time).getTime() : null,
                note: entry.note || '',
                breaks: entry.breaks || [],
                isOnBreak: entry.is_on_break || false,
                paidInPeriodId: entry.paid_in_period_id || undefined,
                createdAt: new Date(entry.created_at).getTime(),
              }));
              
              // Merge with local entries
              const localEntries = get().timeEntries;
              const mergedEntries = [...supabaseEntries];
              
              // Add any local entries that don't exist in Supabase
              for (const localEntry of localEntries) {
                const existsInSupabase = supabaseEntries.some(e => e.id === localEntry.id);
                if (!existsInSupabase) {
                  // Upload local entry to Supabase
                  try {
                    await syncTimeEntryToSupabase(localEntry, userId, 'insert');
                    mergedEntries.push(localEntry);
                  } catch (error) {
                    console.error('Error uploading local time entry:', error);
                    // Keep local entry even if upload fails
                    mergedEntries.push(localEntry);
                  }
                }
              }
              
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
              .eq('user_id', userId)
              .order('start_date', { ascending: false });
            
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
                timeEntryIds: period.time_entry_ids || [],
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
        
        // Sync to Supabase
        const syncToSupabase = async () => {
          try {
            const userId = await getCurrentUserId();
            if (userId) {
              await syncJobToSupabase(newJob, userId, 'insert');
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
          
          // Sync to Supabase
          if (updatedJob) {
            const syncToSupabase = async (jobToSync: Job) => {
              try {
                const userId = await getCurrentUserId();
                if (userId) {
                  await syncJobToSupabase(jobToSync, userId, 'update');
                }
              } catch (error) {
                console.error('Error syncing job update to Supabase:', error);
              }
            };
            syncToSupabase(updatedJob);
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
          
          // Sync to Supabase
          if (deletedJob) {
            const syncToSupabase = async (jobToDelete: Job) => {
              try {
                const userId = await getCurrentUserId();
                if (userId) {
                  // Delete related data first
                  await supabase.from('time_entries').delete().eq('job_id', id).eq('user_id', userId);
                  await supabase.from('pay_periods').delete().eq('job_id', id).eq('user_id', userId);
                  // Then delete the job
                  await syncJobToSupabase(jobToDelete, userId, 'delete');
                }
              } catch (error) {
                console.error('Error syncing job deletion to Supabase:', error);
              }
            };
            syncToSupabase(deletedJob);
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
        
        // Sync to Supabase
        const syncToSupabase = async () => {
          try {
            const userId = await getCurrentUserId();
            if (userId) {
              await syncTimeEntryToSupabase(newEntry, userId, 'insert');
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
          
          // Sync to Supabase
          if (updatedEntry) {
            const syncToSupabase = async (entryToSync: TimeEntry) => {
              try {
                const userId = await getCurrentUserId();
                if (userId) {
                  await syncTimeEntryToSupabase(entryToSync, userId, 'update');
                }
              } catch (error) {
                console.error('Error syncing clock out to Supabase:', error);
              }
            };
            syncToSupabase(updatedEntry);
          }
          
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
          
          // Sync to Supabase
          if (updatedEntry) {
            const syncToSupabase = async (entryToSync: TimeEntry) => {
              try {
                const userId = await getCurrentUserId();
                if (userId) {
                  await syncTimeEntryToSupabase(entryToSync, userId, 'update');
                }
              } catch (error) {
                console.error('Error syncing break start to Supabase:', error);
              }
            };
            syncToSupabase(updatedEntry);
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
          
          // Sync to Supabase
          if (updatedEntry) {
            const syncToSupabase = async (entryToSync: TimeEntry) => {
              try {
                const userId = await getCurrentUserId();
                if (userId) {
                  await syncTimeEntryToSupabase(entryToSync, userId, 'update');
                }
              } catch (error) {
                console.error('Error syncing break end to Supabase:', error);
              }
            };
            syncToSupabase(updatedEntry);
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
        
        // Sync to Supabase
        const syncToSupabase = async () => {
          try {
            const userId = await getCurrentUserId();
            if (userId) {
              await syncTimeEntryToSupabase(newEntry, userId, 'insert');
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
          
          // Sync to Supabase
          const syncToSupabase = async () => {
            try {
              const userId = await getCurrentUserId();
              if (userId) {
                await syncTimeEntryToSupabase(updatedEntry, userId, 'update');
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
          
          // Sync to Supabase - only if deletedEntry exists
          if (!deletedEntry) {
            console.error('Could not find entry to delete');
            return false;
          }
          
          const syncToSupabase = async (entryToDelete: TimeEntry) => {
            try {
              const userId = await getCurrentUserId();
              if (userId) {
                await syncTimeEntryToSupabase(entryToDelete, userId, 'delete');
              }
            } catch (error) {
              console.error('Error syncing time entry deletion to Supabase:', error);
            }
          };
          syncToSupabase(deletedEntry);
          
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
            
            // Use existing period ID if it exists, otherwise generate new one
            const periodId = existingPeriod?.id || generateId();
            
            newPayPeriods.push({
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
            });
          });
        });
        
        set({ payPeriods: newPayPeriods });
        
        // Sync pay periods to Supabase using upsert - but only if there are changes
        const syncToSupabase = async () => {
          try {
            const userId = await getCurrentUserId();
            if (userId) {
              // Use upsert for all pay periods to handle both new and existing ones
              for (const period of newPayPeriods) {
                try {
                  await syncPayPeriodToSupabase(period, userId, 'upsert');
                } catch (error) {
                  // Log but don't throw - continue with other periods
                  console.error('Error syncing individual pay period:', error);
                }
              }
              
              // Clean up any pay periods that no longer exist
              const currentPeriodIds = newPayPeriods.map(p => p.id);
              const periodsToDelete = existingPayPeriods.filter(p => 
                !currentPeriodIds.includes(p.id)
              );
              
              for (const periodToDelete of periodsToDelete) {
                try {
                  await syncPayPeriodToSupabase(periodToDelete, userId, 'delete');
                } catch (error) {
                  console.error('Error deleting obsolete pay period:', error);
                }
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
          
          // Sync to Supabase
          if (updatedPeriod) {
            const syncToSupabase = async (periodToSync: PayPeriod) => {
              try {
                const userId = await getCurrentUserId();
                if (userId) {
                  await syncPayPeriodToSupabase(periodToSync, userId, 'upsert');
                  
                  // Update related time entries
                  const period = get().payPeriods.find(p => p.id === periodId);
                  if (period) {
                    for (const entryId of period.timeEntryIds) {
                      const entry = get().timeEntries.find(e => e.id === entryId);
                      if (entry) {
                        await syncTimeEntryToSupabase({ ...entry, paidInPeriodId: periodId }, userId, 'update');
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Error syncing pay period payment to Supabase:', error);
              }
            };
            syncToSupabase(updatedPeriod);
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
          
          // Sync to Supabase
          if (updatedPeriod) {
            const syncToSupabase = async (periodToSync: PayPeriod) => {
              try {
                const userId = await getCurrentUserId();
                if (userId) {
                  await syncPayPeriodToSupabase(periodToSync, userId, 'upsert');
                  
                  // Update related time entries
                  const period = get().payPeriods.find(p => p.id === periodId);
                  if (period) {
                    for (const entryId of period.timeEntryIds) {
                      const entry = get().timeEntries.find(e => e.id === entryId);
                      if (entry) {
                        await syncTimeEntryToSupabase({ ...entry, paidInPeriodId: undefined }, userId, 'update');
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Error syncing pay period unpayment to Supabase:', error);
              }
            };
            syncToSupabase(updatedPeriod);
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