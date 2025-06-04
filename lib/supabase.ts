import { createClient } from '@supabase/supabase-js';
import { Job, TimeEntry, PayPeriod, SyncQueueItem } from '@/types';

const supabaseUrl = 'https://hrymwfavjfvnksxjezoy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeW13ZmF2amZ2bmtzeGplem95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzExNTMsImV4cCI6MjA2NDIwNzE1M30.o3aPJsDW8JHSCdAE0ACYrLj4Y6u9UR3kPbujBzEcapY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      support_requests: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          device_info: string | null;
          app_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          device_info?: string | null;
          app_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string;
          message?: string;
          device_info?: string | null;
          app_version?: string | null;
          created_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          client: string | null;
          hourly_rate: number;
          color: string;
          settings: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          client?: string | null;
          hourly_rate: number;
          color: string;
          settings?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          client?: string | null;
          hourly_rate?: number;
          color?: string;
          settings?: any | null;
          created_at?: string;
        };
      };
      time_entries: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          start_time: string;
          end_time: string | null;
          note: string;
          breaks: any | null;
          is_on_break: boolean;
          paid_in_period_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          start_time: string;
          end_time?: string | null;
          note?: string;
          breaks?: any | null;
          is_on_break?: boolean;
          paid_in_period_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          start_time?: string;
          end_time?: string | null;
          note?: string;
          breaks?: any | null;
          is_on_break?: boolean;
          paid_in_period_id?: string | null;
          created_at?: string;
        };
      };
      pay_periods: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          start_date: string;
          end_date: string;
          total_duration: number;
          total_earnings: number;
          is_paid: boolean;
          paid_date: string | null;
          time_entry_ids: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          start_date: string;
          end_date: string;
          total_duration: number;
          total_earnings: number;
          is_paid?: boolean;
          paid_date?: string | null;
          time_entry_ids: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          start_date?: string;
          end_date?: string;
          total_duration?: number;
          total_earnings?: number;
          is_paid?: boolean;
          paid_date?: string | null;
          time_entry_ids?: string[];
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper function to check if user is authenticated
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
};

// Helper function to get current session
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting current session:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error in getCurrentSession:', error);
    return null;
  }
};

// Helper function to ensure user is authenticated before operations
export const ensureAuthenticated = async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
};

// Batch sync helpers for offline queue processing
export const batchSyncJobs = async (jobs: Job[], userId: string, operation: 'upsert' | 'delete') => {
  try {
    if (operation === 'upsert') {
      const jobsData = jobs.map(job => ({
        id: job.id,
        user_id: userId,
        name: job.title,
        client: job.client || '',
        hourly_rate: job.hourlyRate,
        color: job.color,
        settings: job.settings || null,
        created_at: new Date(job.createdAt).toISOString(),
      }));

      const { error } = await supabase.from('jobs').upsert(jobsData, {
        onConflict: 'id'
      });
      
      if (error) throw error;
    } else if (operation === 'delete') {
      const jobIds = jobs.map(job => job.id);
      const { error } = await supabase.from('jobs').delete()
        .in('id', jobIds)
        .eq('user_id', userId);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error in batch sync jobs:', error);
    throw error;
  }
};

export const batchSyncTimeEntries = async (entries: TimeEntry[], userId: string, operation: 'upsert' | 'delete') => {
  try {
    if (operation === 'upsert') {
      const entriesData = entries.map(entry => ({
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
      }));

      const { error } = await supabase.from('time_entries').upsert(entriesData, {
        onConflict: 'id'
      });
      
      if (error) throw error;
    } else if (operation === 'delete') {
      const entryIds = entries.map(entry => entry.id);
      const { error } = await supabase.from('time_entries').delete()
        .in('id', entryIds)
        .eq('user_id', userId);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error in batch sync time entries:', error);
    throw error;
  }
};

export const batchSyncPayPeriods = async (periods: PayPeriod[], userId: string, operation: 'upsert' | 'delete') => {
  try {
    if (operation === 'upsert') {
      const periodsData = periods.map(period => ({
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
      }));

      const { error } = await supabase.from('pay_periods').upsert(periodsData, {
        onConflict: 'id'
      });
      
      if (error) throw error;
    } else if (operation === 'delete') {
      const periodIds = periods.map(period => period.id);
      const { error } = await supabase.from('pay_periods').delete()
        .in('id', periodIds)
        .eq('user_id', userId);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error in batch sync pay periods:', error);
    throw error;
  }
};

// Fetch all user data from Supabase
export const fetchAllUserData = async (userId: string) => {
  try {
    const [jobsResult, entriesResult, periodsResult] = await Promise.allSettled([
      supabase.from('jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('time_entries').select('*').eq('user_id', userId).order('start_time', { ascending: false }),
      supabase.from('pay_periods').select('*').eq('user_id', userId).order('start_date', { ascending: false })
    ]);

    const result = {
      jobs: [] as Job[],
      timeEntries: [] as TimeEntry[],
      payPeriods: [] as PayPeriod[],
      errors: [] as string[]
    };

    // Process jobs
    if (jobsResult.status === 'fulfilled' && jobsResult.value.data) {
      result.jobs = jobsResult.value.data.map(job => ({
        id: job.id,
        title: job.name,
        client: job.client || '',
        hourlyRate: job.hourly_rate,
        color: job.color,
        settings: job.settings,
        createdAt: new Date(job.created_at).getTime(),
      }));
    } else if (jobsResult.status === 'rejected') {
      result.errors.push('Failed to fetch jobs');
    }

    // Process time entries
    if (entriesResult.status === 'fulfilled' && entriesResult.value.data) {
      result.timeEntries = entriesResult.value.data.map(entry => ({
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
    } else if (entriesResult.status === 'rejected') {
      result.errors.push('Failed to fetch time entries');
    }

    // Process pay periods
    if (periodsResult.status === 'fulfilled' && periodsResult.value.data) {
      result.payPeriods = periodsResult.value.data.map(period => ({
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
    } else if (periodsResult.status === 'rejected') {
      result.errors.push('Failed to fetch pay periods');
    }

    return result;
  } catch (error) {
    console.error('Error fetching all user data:', error);
    throw error;
  }
};

// Check network connectivity
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Simple connectivity check by making a lightweight request to Supabase
    const { error } = await supabase.from('jobs').select('id').limit(1);
    return !error;
  } catch (error) {
    return false;
  }
};

// Storage bucket helpers
export const uploadToAvatars = async (filePath: string, file: File | Uint8Array, options?: any) => {
  const user = await ensureAuthenticated();
  const userFilePath = `${user.id}/${filePath}`;
  
  return await supabase.storage
    .from('avatars')
    .upload(userFilePath, file, {
      cacheControl: '3600',
      upsert: true,
      ...options
    });
};

export const uploadToDocuments = async (filePath: string, file: File | Uint8Array, options?: any) => {
  const user = await ensureAuthenticated();
  const userFilePath = `${user.id}/${filePath}`;
  
  return await supabase.storage
    .from('documents')
    .upload(userFilePath, file, {
      cacheControl: '3600',
      upsert: true,
      ...options
    });
};

export const getAvatarUrl = (filePath: string) => {
  return supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);
};

export const getDocumentUrl = (filePath: string) => {
  return supabase.storage
    .from('documents')
    .getPublicUrl(filePath);
};

export const deleteFromAvatars = async (filePath: string) => {
  const user = await ensureAuthenticated();
  const userFilePath = `${user.id}/${filePath}`;
  
  return await supabase.storage
    .from('avatars')
    .remove([userFilePath]);
};

export const deleteFromDocuments = async (filePath: string) => {
  const user = await ensureAuthenticated();
  const userFilePath = `${user.id}/${filePath}`;
  
  return await supabase.storage
    .from('documents')
    .remove([userFilePath]);
};

export const listAvatars = async () => {
  const user = await ensureAuthenticated();
  
  return await supabase.storage
    .from('avatars')
    .list(user.id);
};

export const listDocuments = async () => {
  const user = await ensureAuthenticated();
  
  return await supabase.storage
    .from('documents')
    .list(user.id);
};