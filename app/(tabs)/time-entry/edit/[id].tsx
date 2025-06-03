import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useJobsStore } from '@/store/jobsStore';
import TimeEntryForm from '@/components/TimeEntryForm';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';

export default function EditTimeEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { timeEntries, updateTimeEntry, getJobById, deleteTimeEntry } = useJobsStore();
  const { colors } = useTheme();
  
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
        // Navigate back to the job details page immediately after successful update
        router.push(`/(tabs)/job/${timeEntry.jobId}`);
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
    // Navigate back to the job details page
    if (timeEntry) {
      router.push(`/(tabs)/job/${timeEntry.jobId}`);
    } else {
      router.back();
    }
  };
  
  const handleDelete = () => {
    if (!id || typeof id !== 'string') return;
    
    try {
      const success = deleteTimeEntry(id);
      if (success && timeEntry) {
        // Navigate back to the job details page after deletion
        router.push(`/(tabs)/job/${timeEntry.jobId}`);
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
        onAction={() => router.back()}
      />
    );
  }
  
  if (!timeEntry) {
    return (
      <EmptyState
        title="Time entry not found"
        message="The time entry you are trying to edit does not exist"
        actionLabel="Go Back"
        onAction={() => router.back()}
      />
    );
  }
  
  if (!job) {
    return (
      <EmptyState
        title="Job not found"
        message="The job for this time entry does not exist"
        actionLabel="Go Back"
        onAction={() => router.back()}
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
          jobName={job.title}
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