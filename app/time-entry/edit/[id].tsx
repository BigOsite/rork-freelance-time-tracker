import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useJobsStore } from '@/store/jobsStore';
import TimeEntryForm from '@/components/TimeEntryForm';
import EmptyState from '@/components/EmptyState';

export default function EditTimeEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { timeEntries, updateTimeEntry, getJobById, deleteTimeEntry } = useJobsStore();
  
  const timeEntry = timeEntries.find(entry => entry?.id === id);
  const job = timeEntry ? getJobById(timeEntry.jobId) : undefined;
  
  const handleSubmit = async (values: { startTime: number; endTime: number | null; note: string }): Promise<boolean> => {
    if (!timeEntry) return false;
    
    try {
      const success = updateTimeEntry({
        ...timeEntry,
        startTime: values.startTime,
        endTime: values.endTime,
        note: values.note,
      });
      
      if (success) {
        // Navigate back to the appropriate screen based on where the user came from
        // Check if we can go back to a job detail screen
        if (timeEntry.jobId) {
          router.replace(`/(tabs)/job/${timeEntry.jobId}`);
        } else {
          // Fallback to history screen
          router.replace('/(tabs)/history');
        }
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
      return false;
    }
  };
  
  const handleCancel = () => {
    // Navigate back to the appropriate screen based on where the user came from
    if (timeEntry?.jobId) {
      router.replace(`/(tabs)/job/${timeEntry.jobId}`);
    } else {
      router.replace('/(tabs)/history');
    }
  };
  
  const handleDelete = () => {
    if (!id || typeof id !== 'string') return;
    
    try {
      const success = deleteTimeEntry(id);
      if (success) {
        // Navigate back to the appropriate screen based on where the user came from
        if (timeEntry?.jobId) {
          router.replace(`/(tabs)/job/${timeEntry.jobId}`);
        } else {
          router.replace('/(tabs)/history');
        }
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  };
  
  // Render error states
  if (!id || typeof id !== 'string') {
    return (
      <EmptyState
        title="Invalid Entry"
        message="No time entry ID provided"
        actionLabel="Go Back"
        onAction={() => router.replace('/(tabs)/history')}
      />
    );
  }
  
  if (!timeEntry) {
    return (
      <EmptyState
        title="Time entry not found"
        message="The time entry you are trying to edit does not exist"
        actionLabel="Go Back"
        onAction={() => router.replace('/(tabs)/history')}
      />
    );
  }
  
  if (!job) {
    return (
      <EmptyState
        title="Job not found"
        message="The job for this time entry does not exist"
        actionLabel="Go Back"
        onAction={() => router.replace('/(tabs)/history')}
      />
    );
  }
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Edit Time Entry" }} />
      <TimeEntryForm
        initialValues={{
          startTime: timeEntry.startTime,
          endTime: timeEntry.endTime,
          note: timeEntry.note || '',
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDelete={handleDelete}
        jobName={job.title}
        isNewEntry={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
});