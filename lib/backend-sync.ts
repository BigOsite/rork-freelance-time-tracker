import { trpcClient } from './trpc';
import { Job, TimeEntry, PayPeriod } from '@/types';
import NetInfo from '@react-native-community/netinfo';

export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch (error) {
    console.error('Error checking network connectivity:', error);
    return false;
  }
}

export async function batchSyncJobs(
  jobs: Job[],
  userId: string,
  operation: 'upsert' | 'delete'
): Promise<void> {
  try {
    console.log(`Batch syncing ${jobs.length} jobs (${operation})`);
    
    const result = await trpcClient.data.syncJobs.mutate({
      jobs,
      operation,
    });
    
    console.log(`Successfully synced ${result.count} jobs`);
  } catch (error) {
    console.error('Error batch syncing jobs:', error);
    throw error;
  }
}

export async function batchSyncTimeEntries(
  timeEntries: TimeEntry[],
  userId: string,
  operation: 'upsert' | 'delete'
): Promise<void> {
  try {
    console.log(`Batch syncing ${timeEntries.length} time entries (${operation})`);
    
    const result = await trpcClient.data.syncTimeEntries.mutate({
      timeEntries,
      operation,
    });
    
    console.log(`Successfully synced ${result.count} time entries`);
  } catch (error) {
    console.error('Error batch syncing time entries:', error);
    throw error;
  }
}

export async function batchSyncPayPeriods(
  payPeriods: PayPeriod[],
  userId: string,
  operation: 'upsert' | 'delete'
): Promise<void> {
  try {
    console.log(`Batch syncing ${payPeriods.length} pay periods (${operation})`);
    
    const result = await trpcClient.data.syncPayPeriods.mutate({
      payPeriods,
      operation,
    });
    
    console.log(`Successfully synced ${result.count} pay periods`);
  } catch (error) {
    console.error('Error batch syncing pay periods:', error);
    throw error;
  }
}

export async function fetchAllUserData(userId: string): Promise<{
  jobs: Job[];
  timeEntries: TimeEntry[];
  payPeriods: PayPeriod[];
  errors: string[];
}> {
  const errors: string[] = [];
  let jobs: Job[] = [];
  let timeEntries: TimeEntry[] = [];
  let payPeriods: PayPeriod[] = [];

  try {
    console.log(`Fetching all data for user ${userId}`);

    // Fetch jobs
    try {
      jobs = await trpcClient.data.getJobs.query();
      console.log(`Fetched ${jobs.length} jobs`);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      errors.push('Failed to fetch jobs');
    }

    // Fetch time entries
    try {
      timeEntries = await trpcClient.data.getTimeEntries.query();
      console.log(`Fetched ${timeEntries.length} time entries`);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      errors.push('Failed to fetch time entries');
    }

    // Fetch pay periods
    try {
      payPeriods = await trpcClient.data.getPayPeriods.query();
      console.log(`Fetched ${payPeriods.length} pay periods`);
    } catch (error) {
      console.error('Error fetching pay periods:', error);
      errors.push('Failed to fetch pay periods');
    }

    return { jobs, timeEntries, payPeriods, errors };
  } catch (error) {
    console.error('Error fetching all user data:', error);
    return { jobs, timeEntries, payPeriods, errors: [...errors, 'Failed to fetch user data'] };
  }
}
