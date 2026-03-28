import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useJobsStore } from '@/store/jobsStore';
import JobForm from '@/components/JobForm';
import { JobSettings } from '@/types';

export default function NewJobScreen() {
  const router = useRouter();
  const { addJob } = useJobsStore();
  
  const handleSubmit = React.useCallback(async (
    name: string, 
    client: string, 
    hourlyRate: number, 
    color: string,
    settings: JobSettings
  ) => {
    try {
      const newJobId = addJob({
        name,
        client,
        hourlyRate,
        color,
        settings
      });
      
      // Ensure the job is properly saved before navigating
      if (newJobId) {
        // Use a small delay to ensure the store is updated before navigation
        setTimeout(() => {
          // Navigate to the job detail screen
          router.replace(`/job/${newJobId}`);
        }, 100);
      } else {
        console.error('Failed to create job - no ID returned');
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }
  }, [addJob, router]);
  
  return (
    <>
      <Stack.Screen options={{ title: "New Job" }} />
      
      <View style={styles.container}>
        <JobForm
          initialValues={{
            name: '',
            client: '',
            hourlyRate: 0,
            color: '',
            settings: {
              payPeriodType: 'weekly',
              payPeriodStartDay: 0,
              roundTime: 'none',
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
          submitButtonText="Create Job"
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