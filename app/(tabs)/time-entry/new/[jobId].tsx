import React from 'react';
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
  
  const handleSubmit = async (values: { startTime: number; endTime: number | null; note: string }): Promise<boolean> => {
    if (!jobId || typeof jobId !== 'string') return false;
    
    try {
      const entryId = addTimeEntry({
        jobId,
        startTime: values.startTime,
        endTime: values.endTime,
        note: values.note,
        createdAt: Date.now(),
        breaks: [],
        isOnBreak: false,
        paidInPeriodId: undefined
      });
      
      if (entryId) {
        // Navigate back to the job details page immediately after successful creation
        router.replace(`/(tabs)/job/${jobId}`);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error creating time entry:', error);
      return false;
    }
  };
  
  const handleCancel = () => {
    // Navigate back to the job details page
    if (jobId) {
      router.replace(`/(tabs)/job/${jobId}`);
    } else {
      router.replace('/(tabs)/jobs');
    }
  };
  
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
          jobName={job.title}
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