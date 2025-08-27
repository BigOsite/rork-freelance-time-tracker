import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useJobsStore } from '@/store/jobsStore';
import TimeEntryForm from '@/components/TimeEntryForm';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';

export default function EditTimeEntryScreen() {
  const { id, from, jobId } = useLocalSearchParams<{ id: string; from?: string; jobId?: string }>();
  const router = useRouter();
  const { timeEntries, updateTimeEntry, getJobById, deleteTimeEntry } = useJobsStore();
  const { colors } = useTheme();
  
  const timeEntry = timeEntries.find(entry => entry?.id === id);
  const job = timeEntry ? getJobById(timeEntry.jobId) : undefined;
  
  const navigateBackSafe = useCallback(() => {
    try {
      console.log('EDIT ENTRY: navigateBackSafe called with', { from, jobId });
      if (jobId && typeof jobId === 'string') {
        console.log('EDIT ENTRY: Returning to job details for jobId', jobId);
        // Use push with direct path for consistent behavior
        router.push(`/(tabs)/job/${jobId}`);
        return;
      }
      if (router.canGoBack?.()) {
        console.log('EDIT ENTRY: No jobId param, going back');
        router.back();
        return;
      }
      console.log('EDIT ENTRY: No history, navigating to history list');
      router.push('/(tabs)/history');
    } catch (e) {
      console.error('EDIT ENTRY: Navigation error, falling back to history', e);
      router.push('/(tabs)/history');
    }
  }, [router, jobId, from]);

  const handleSubmit = useCallback(async (values: { startTime: number; endTime: number | null; note: string }): Promise<boolean> => {
    if (!timeEntry) return false;

    try {
      console.log('EDIT ENTRY: Updating time entry with values:', values);
      console.log('EDIT ENTRY: Time entry ID:', timeEntry.id);

      updateTimeEntry(timeEntry.id, {
        startTime: values.startTime,
        endTime: values.endTime,
        note: values.note,
      });

      console.log('EDIT ENTRY: Time entry updated successfully');
      
      // Use setTimeout to ensure the state update completes before navigation
      setTimeout(() => {
        if (jobId && typeof jobId === 'string') {
          console.log('EDIT ENTRY: Navigating to job details after update');
          router.push(`/(tabs)/job/${jobId}`);
        } else {
          console.log('EDIT ENTRY: No jobId, using navigateBackSafe');
          navigateBackSafe();
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error('EDIT ENTRY: Error updating time entry:', error);
      return false;
    }
  }, [timeEntry, updateTimeEntry, navigateBackSafe, jobId, router]);
  
  const handleCancel = useCallback(() => {
    console.log('EDIT ENTRY: Cancel button pressed');
    navigateBackSafe();
  }, [navigateBackSafe]);
  
  const handleDelete = useCallback(() => {
    if (!id || typeof id !== 'string') return;
    
    try {
      console.log('EDIT ENTRY: Deleting time entry with ID:', id);
      deleteTimeEntry(id);
      console.log('EDIT ENTRY: Time entry deleted successfully');
      
      // Use setTimeout to ensure the state update completes before navigation
      setTimeout(() => {
        if (jobId && typeof jobId === 'string') {
          console.log('EDIT ENTRY: Navigating to job details after delete');
          router.push(`/(tabs)/job/${jobId}`);
        } else {
          console.log('EDIT ENTRY: No jobId, using navigateBackSafe');
          navigateBackSafe();
        }
      }, 100);
    } catch (error) {
      console.error('EDIT ENTRY: Error deleting time entry:', error);
    }
  }, [id, deleteTimeEntry, navigateBackSafe, jobId, router]);
  
  // Render error states
  if (!id || typeof id !== 'string') {
    return (
      <EmptyState
        title="Invalid Entry"
        message="No time entry ID provided"
        actionLabel="Go Back"
        onAction={() => router.replace('/(tabs)/jobs')}
      />
    );
  }
  
  if (!timeEntry) {
    return (
      <EmptyState
        title="Time entry not found"
        message="The time entry you are trying to edit does not exist"
        actionLabel="Go Back"
        onAction={() => router.replace('/(tabs)/jobs')}
      />
    );
  }
  
  if (!job) {
    return (
      <EmptyState
        title="Job not found"
        message="The job for this time entry does not exist"
        actionLabel="Go Back"
        onAction={() => router.replace('/(tabs)/jobs')}
      />
    );
  }
  
  const styles = createStyles(colors);
  
  return (
    <>
      <Stack.Screen options={{ title: "Edit Time Entry" }} />
      
      <View style={styles.container}>
        <TimeEntryForm
          initialValues={{
            startTime: timeEntry.startTime,
            endTime: timeEntry.endTime,
            note: timeEntry.note || '',
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onDelete={handleDelete}
          jobName={job.name}
          isNewEntry={false}
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