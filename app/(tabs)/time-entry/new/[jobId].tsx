import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useJobsStore } from '@/store/jobsStore';
import TimeEntryForm from '@/components/TimeEntryForm';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';

export default function NewTimeEntryScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { addTimeEntry, getJobById } = useJobsStore();
  const { colors } = useTheme();
  
  const job = jobId ? getJobById(jobId) : undefined;
  
  const navigateBackSafe = useCallback(() => {
    try {
      console.log('NEW ENTRY: navigateBackSafe called');
      if (jobId && typeof jobId === 'string') {
        console.log('NEW ENTRY: Navigating with replace to job details for jobId', jobId);
        router.replace({ pathname: '/(tabs)/job/[id]', params: { id: jobId } });
        return;
      }
      if (router.canGoBack?.()) {
        console.log('NEW ENTRY: No jobId provided, going back');
        router.back();
        return;
      }
      console.log('NEW ENTRY: No history, replacing to history list');
      router.replace('/(tabs)/history');
    } catch (e) {
      console.error('NEW ENTRY: Navigation error, falling back to history', e);
      router.replace('/(tabs)/history');
    }
  }, [router, jobId]);

  const handleSubmit = useCallback(async (values: { startTime: number; endTime: number | null; note: string }): Promise<boolean> => {
    if (!jobId || typeof jobId !== 'string') {
      console.error('Invalid jobId:', jobId);
      return false;
    }

    try {
      console.log('NEW ENTRY: Submitting time entry with values:', values);
      console.log('NEW ENTRY: Job ID:', jobId);

      const entryId = addTimeEntry({
        jobId,
        startTime: values.startTime,
        endTime: values.endTime,
        note: values.note,
        breaks: [],
        isOnBreak: false,
        paidInPeriodId: undefined,
      });

      console.log('NEW ENTRY: Time entry created with ID:', entryId);

      if (entryId) {
        console.log('NEW ENTRY: Time entry created successfully, navigating to previous context');
        navigateBackSafe();
        return true;
      } else {
        console.error('NEW ENTRY: Time entry creation failed - no ID returned');
        return false;
      }
    } catch (error) {
      console.error('NEW ENTRY: Error creating time entry:', error);
      return false;
    }
  }, [jobId, addTimeEntry, navigateBackSafe]);

  const handleCancel = useCallback(() => {
    console.log('NEW ENTRY: Cancel button pressed');
    navigateBackSafe();
  }, [navigateBackSafe]);
  
  // Render error states
  if (!jobId || typeof jobId !== 'string') {
    return (
      <EmptyState
        title="Invalid Job"
        message="No job ID provided"
        actionLabel="Go Back"
        onAction={() => router.replace('/(tabs)/jobs')}
      />
    );
  }
  
  if (!job) {
    return (
      <EmptyState
        title="Job not found"
        message="The job you are trying to add a time entry for does not exist"
        actionLabel="Go Back"
        onAction={() => router.replace('/(tabs)/jobs')}
      />
    );
  }
  
  const styles = createStyles(colors);
  
  return (
    <>
      <Stack.Screen options={{ title: "New Time Entry" }} />
      
      <View style={styles.container}>
        <TimeEntryForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          jobName={job.name}
          isNewEntry={true}
        />
      </View>
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});