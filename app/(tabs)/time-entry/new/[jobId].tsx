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
    if (!jobId || typeof jobId !== 'string') {
      console.error('Invalid jobId:', jobId);
      return false;
    }
    
    try {
      console.log('Submitting time entry with values:', values);
      console.log('Job ID:', jobId);
      
      const entryId = addTimeEntry({
        jobId,
        startTime: values.startTime,
        endTime: values.endTime,
        note: values.note,
        breaks: [],
        isOnBreak: false,
        paidInPeriodId: undefined
      });
      
      console.log('Time entry created with ID:', entryId);
      
      if (entryId) {
        console.log('Time entry created successfully, navigating back');
        // Use router.back() to go back to the previous screen (job details)
        router.back();
        return true;
      } else {
        console.error('Time entry creation failed - no ID returned');
        return false;
      }
    } catch (error) {
      console.error('Error creating time entry:', error);
      return false;
    }
  };
  
  const handleCancel = () => {
    // Navigate back to the previous screen
    router.back();
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