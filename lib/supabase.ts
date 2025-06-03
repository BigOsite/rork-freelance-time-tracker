import { createClient } from '@supabase/supabase-js';

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