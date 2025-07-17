import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, TimeEntry, PayPeriod, SyncQueueItem } from '@/types';

const supabaseUrl = 'https://hrymwfavjfvnksxjezoy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeW13ZmF2amZ2bmtzeGplem95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzExNTMsImV4cCI6MjA2NDIwNzE1M30.o3aPJsDW8JHSCdAE0ACYrLj4Y6u9UR3kPbujBzEcapY';

// Create storage adapter for cross-platform compatibility
const supabaseStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': Platform.OS === 'web' ? 'supabase-js-web' : 'supabase-js-react-native',
    },
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      support_requests: {
        Row: {
          id: string;
          user_id: string;
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
          user_id: string;
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
          user_id?: string;
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
          client: string;
          hourly_rate: number;
          color: string;
          settings: any | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          client?: string;
          hourly_rate: number;
          color: string;
          settings?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          client?: string;
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
          id: string;
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
          id: string;
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

// Helper function to refresh session if needed
export const refreshSessionIfNeeded = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('Error getting session:', error);
      return false;
    }
    
    if (!session) {
      console.log('No active session found');
      return false;
    }
    
    // Check if session is close to expiring (within 10 minutes)
    const now = Math.round(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry < 600) { // Less than 10 minutes
      console.log('Session expiring soon, refreshing...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.log('Failed to refresh session:', refreshError);
        return false;
      }
      
      return !!refreshData.session;
    }
    
    return true;
  } catch (error) {
    console.log('Error refreshing session:', error);
    return false;
  }
};

// Enhanced session management
export const initializeSession = async () => {
  try {
    console.log('Initializing Supabase session');
    
    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error initializing session:', error);
      return null;
    }
    
    if (session) {
      console.log('Existing session found, refreshing...');
      // Refresh the session to ensure it's valid
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Error refreshing session on init:', refreshError);
        return session; // Return original session if refresh fails
      }
      
      console.log('Session refreshed successfully');
      return refreshData.session || session;
    }
    
    console.log('No existing session found');
    return null;
  } catch (error) {
    console.error('Error in initializeSession:', error);
    return null;
  }
};

// Batch sync helpers for offline queue processing
export const batchSyncJobs = async (jobs: Job[], userId: string, operation: 'upsert' | 'delete') => {
  try {
    // Ensure we have a valid session
    const session = await getCurrentSession();
    if (!session) {
      throw new Error('No active session for sync');
    }
    
    console.log(`Batch syncing ${jobs.length} jobs (${operation}) for user:`, userId);
    
    if (operation === 'upsert') {
      // Try with client field first
      const jobsDataWithClient = jobs.map(job => ({
        id: job.id,
        user_id: userId,
        name: job.name || 'Untitled Job', // Ensure name is never null or empty
        client: job.client || '',
        hourly_rate: job.hourlyRate || 0,
        color: job.color || '#3B82F6',
        settings: job.settings || null,
        created_at: new Date(job.createdAt).toISOString(),
      }));

      console.log('Attempting to upsert jobs with client field...');
      const { data, error } = await supabase.from('jobs').upsert(jobsDataWithClient, {
        onConflict: 'id'
      });
      
      if (error) {
        console.error('Supabase upsert error:', error);
        
        // If it's a client column error or schema cache error, try refreshing cache first
        if (error.message.includes('client') || error.message.includes('schema cache') || error.code === 'PGRST204') {
          console.log('Client column issue detected, refreshing schema cache...');
          
          // Try to refresh schema cache
          await refreshSchemaCache();
          
          // Retry with client field after cache refresh
          const { data: retryData, error: retryError } = await supabase.from('jobs').upsert(jobsDataWithClient, {
            onConflict: 'id'
          });
          
          if (!retryError) {
            console.log('Jobs upserted successfully with client field after cache refresh:', retryData);
            return;
          }
          
          console.log('Still failing after cache refresh, trying without client field...');
          
          const jobsDataWithoutClient = jobs.map(job => ({
            id: job.id,
            user_id: userId,
            name: job.name || 'Untitled Job', // Ensure name is never null or empty
            hourly_rate: job.hourlyRate || 0,
            color: job.color || '#3B82F6',
            settings: job.settings || null,
            created_at: new Date(job.createdAt).toISOString(),
          }));
          
          const { data: fallbackData, error: fallbackError } = await supabase.from('jobs').upsert(jobsDataWithoutClient, {
            onConflict: 'id'
          });
          
          if (fallbackError) {
            console.error('Fallback upsert also failed:', fallbackError);
            throw fallbackError;
          }
          
          console.log('Jobs upserted successfully without client field:', fallbackData);
          return;
        }
        
        throw error;
      }
      console.log('Jobs upserted successfully with client field:', data);
    } else if (operation === 'delete') {
      const jobIds = jobs.map(job => job.id);
      console.log('Deleting jobs with IDs:', jobIds);
      const { error } = await supabase.from('jobs').delete()
        .in('id', jobIds)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      console.log('Jobs deleted successfully');
    }
  } catch (error) {
    console.error('Error in batch sync jobs:', error);
    throw error;
  }
};

export const batchSyncTimeEntries = async (entries: TimeEntry[], userId: string, operation: 'upsert' | 'delete') => {
  try {
    // Ensure we have a valid session
    const session = await getCurrentSession();
    if (!session) {
      throw new Error('No active session for sync');
    }
    
    console.log(`Batch syncing ${entries.length} time entries (${operation}) for user:`, userId);
    
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
      console.log('Time entries upserted successfully');
    } else if (operation === 'delete') {
      const entryIds = entries.map(entry => entry.id);
      const { error } = await supabase.from('time_entries').delete()
        .in('id', entryIds)
        .eq('user_id', userId);
      
      if (error) throw error;
      console.log('Time entries deleted successfully');
    }
  } catch (error) {
    console.error('Error in batch sync time entries:', error);
    throw error;
  }
};

export const batchSyncPayPeriods = async (periods: PayPeriod[], userId: string, operation: 'upsert' | 'delete') => {
  try {
    // Ensure we have a valid session
    const session = await getCurrentSession();
    if (!session) {
      throw new Error('No active session for sync');
    }
    
    console.log(`Batch syncing ${periods.length} pay periods (${operation}) for user:`, userId);
    
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
      console.log('Pay periods upserted successfully');
    } else if (operation === 'delete') {
      const periodIds = periods.map(period => period.id);
      const { error } = await supabase.from('pay_periods').delete()
        .in('id', periodIds)
        .eq('user_id', userId);
      
      if (error) throw error;
      console.log('Pay periods deleted successfully');
    }
  } catch (error) {
    console.error('Error in batch sync pay periods:', error);
    throw error;
  }
};

// Fetch all user data from Supabase with better error handling and retry logic
export const fetchAllUserData = async (userId: string, retryCount = 0): Promise<{
  jobs: Job[];
  timeEntries: TimeEntry[];
  payPeriods: PayPeriod[];
  errors: string[];
}> => {
  try {
    console.log(`Fetching all user data for user: ${userId} (attempt ${retryCount + 1})`);
    
    // Ensure we have a valid session before making requests
    const session = await getCurrentSession();
    if (!session) {
      throw new Error('No active session found');
    }

    // Try to fetch jobs with client column first, fallback if it fails
    let jobsPromise;
    try {
      jobsPromise = supabase.from('jobs').select('id, user_id, name, client, hourly_rate, color, settings, created_at').eq('user_id', userId).order('created_at', { ascending: false });
    } catch (error) {
      console.log('Client column not available, using fallback query');
      jobsPromise = supabase.from('jobs').select('id, user_id, name, hourly_rate, color, settings, created_at').eq('user_id', userId).order('created_at', { ascending: false });
    }

    const [jobsResult, entriesResult, periodsResult] = await Promise.allSettled([
      jobsPromise,
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
      result.jobs = jobsResult.value.data.map((job: any) => ({
        id: job.id,
        name: job.name || '', // Ensure name is never null
        client: job.client || '', // Handle case where client column might not exist
        hourlyRate: job.hourly_rate || 0,
        color: job.color || '#3B82F6',
        settings: job.settings,
        createdAt: new Date(job.created_at).getTime(),
      }));
      console.log(`Fetched ${result.jobs.length} jobs`);
    } else if (jobsResult.status === 'rejected') {
      result.errors.push('Failed to fetch jobs');
      console.error('Jobs fetch error:', jobsResult.reason);
    } else if (jobsResult.status === 'fulfilled' && jobsResult.value.error) {
      // If it's a client column error, try fetching without client column
      if (jobsResult.value.error.message?.includes('client') || jobsResult.value.error.code === 'PGRST204') {
        console.log('Client column error detected, trying to fetch jobs without client field...');
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('jobs')
            .select('id, user_id, name, hourly_rate, color, settings, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          
          if (fallbackData && !fallbackError) {
            result.jobs = fallbackData.map(job => ({
              id: job.id,
              name: job.name || '', // Ensure name is never null
              client: '', // Default empty client
              hourlyRate: job.hourly_rate || 0,
              color: job.color || '#3B82F6',
              settings: job.settings,
              createdAt: new Date(job.created_at).getTime(),
            }));
            console.log(`Fetched ${result.jobs.length} jobs without client field`);
          } else {
            result.errors.push('Failed to fetch jobs');
            console.error('Fallback jobs fetch error:', fallbackError);
          }
        } catch (fallbackError) {
          result.errors.push('Failed to fetch jobs');
          console.error('Fallback jobs fetch error:', fallbackError);
        }
      } else {
        result.errors.push('Failed to fetch jobs');
        console.error('Jobs fetch error:', jobsResult.value.error);
      }
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
      console.log(`Fetched ${result.timeEntries.length} time entries`);
    } else if (entriesResult.status === 'rejected') {
      result.errors.push('Failed to fetch time entries');
      console.error('Time entries fetch error:', entriesResult.reason);
    } else if (entriesResult.status === 'fulfilled' && entriesResult.value.error) {
      result.errors.push('Failed to fetch time entries');
      console.error('Time entries fetch error:', entriesResult.value.error);
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
      console.log(`Fetched ${result.payPeriods.length} pay periods`);
    } else if (periodsResult.status === 'rejected') {
      result.errors.push('Failed to fetch pay periods');
      console.error('Pay periods fetch error:', periodsResult.reason);
    } else if (periodsResult.status === 'fulfilled' && periodsResult.value.error) {
      result.errors.push('Failed to fetch pay periods');
      console.error('Pay periods fetch error:', periodsResult.value.error);
    }

    console.log('Data fetch completed with', result.errors.length, 'errors');
    return result;
  } catch (error) {
    console.error('Error fetching all user data:', error);
    
    // Retry logic for network issues
    if (retryCount < 2 && (error as any)?.message?.includes('network')) {
      console.log(`Retrying fetch (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return fetchAllUserData(userId, retryCount + 1);
    }
    
    throw error;
  }
};

// Check network connectivity with better error handling
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    console.log('Checking network connectivity');
    // Simple connectivity check by making a lightweight request to Supabase
    const { error } = await supabase.from('jobs').select('id').limit(1);
    const isConnected = !error;
    console.log('Network connectivity:', isConnected ? 'connected' : 'disconnected');
    return isConnected;
  } catch (error) {
    console.log('Network connectivity check failed:', error);
    return false;
  }
};

// Force refresh Supabase schema cache
export const refreshSchemaCache = async (): Promise<void> => {
  try {
    console.log('Attempting to refresh Supabase schema cache...');
    
    // Make a few different queries to force schema refresh
    await Promise.allSettled([
      supabase.from('jobs').select('*').limit(1),
      supabase.from('time_entries').select('*').limit(1),
      supabase.from('pay_periods').select('*').limit(1),
    ]);
    
    // Wait a moment for cache to refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Schema cache refresh completed');
  } catch (error) {
    console.log('Schema cache refresh failed:', error);
  }
};

// Helper function to validate schema and handle schema cache issues
export const validateJobsSchema = async (): Promise<boolean> => {
  try {
    console.log('Validating jobs table schema');
    
    // Try to select all columns to verify schema
    const { data, error } = await supabase
      .from('jobs')
      .select('id, user_id, name, client, hourly_rate, color, settings, created_at')
      .limit(1);
    
    if (error) {
      console.error('Schema validation failed:', error);
      
      // If it's a schema cache issue or client column error, try basic columns
      if (error.message.includes('schema cache') || error.message.includes('client') || error.code === 'PGRST204') {
        console.log('Client column issue detected, trying basic schema validation...');
        
        const { error: basicError } = await supabase
          .from('jobs')
          .select('id, user_id, name, hourly_rate, color, settings, created_at')
          .limit(1);
        
        if (basicError) {
          console.error('Even basic schema validation failed:', basicError);
          return false;
        } else {
          console.log('Basic schema validation passed, but client column is not available');
          return false; // Return false to indicate client column is not available
        }
      } else {
        return false;
      }
    }
    
    console.log('Jobs table schema validation successful with client column');
    return true;
  } catch (error) {
    console.error('Error validating jobs schema:', error);
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