import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useJobsStore } from '@/store/jobsStore';
import JobForm from '@/components/JobForm';
import EmptyState from '@/components/EmptyState';
import { JobSettings } from '@/types';

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getJobById, updateJob } = useJobsStore();
  
  const job = id && typeof id === 'string' ? getJobById(id) : undefined;
  
  const handleSubmit = React.useCallback((
    title: string, 
    client: string, 
    hourlyRate: number, 
    color: string,
    settings: JobSettings
  ) => {
    if (!job || !id || typeof id !== 'string') return;
    
    try {
      updateJob(id, {
        title,
        client,
        hourlyRate,
        color,
        settings
      });
      
      // Navigate back to the job detail screen
      router.back();
    } catch (error) {
      console.error('Error updating job:', error);
    }
  }, [job, id, updateJob, router]);
  
  // Render error states
  if (!id || typeof id !== 'string') {
    return (
      <EmptyState
        title="Invalid Job"
        message="No job ID provided"
        actionLabel="Go Back"
        onAction={() => router.back()}
      />
    );
  }
  
  if (!job) {
    return (
      <EmptyState
        title="Job not found"
        message="The job you are trying to edit does not exist"
        actionLabel="Go Back"
        onAction={() => router.back()}
      />
    );
  }
  
  return (
    <>
      <Stack.Screen options={{ title: "Edit Job" }} />
      
      <View style={styles.container}>
        <JobForm
          initialValues={{
            title: job.title,
            client: job.client,
            hourlyRate: job.hourlyRate,
            color: job.color,
            settings: job.settings || {
              payPeriodType: 'weekly',
              payPeriodStartDay: 0,
              roundTime: 'none',
              timeRounding: {
                enabled: false,
                direction: 'up',
                interval: '15min',
                bufferTime: 0
              },
              tags: [],
              location: '',
              clockOutReminders: false,
              automaticBreaks: false,
              presetBreaks: [],
              dailyOvertime: 'none',
              weeklyOvertime: 'none',
              estimatedTaxRate: 0,
              deductions: 0,
            }
          }}
          onSubmit={handleSubmit}
          submitButtonText="Update Job"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
});