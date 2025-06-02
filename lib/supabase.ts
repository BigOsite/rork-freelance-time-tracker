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
          hourly_rate: number;
          color: string;
          settings: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          hourly_rate: number;
          color: string;
          settings?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
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
  };
}