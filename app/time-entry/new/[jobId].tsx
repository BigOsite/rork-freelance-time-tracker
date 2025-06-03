import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useJobsStore } from '@/store/jobsStore';
import TimeEntryForm from '@/components/TimeEntryForm';
import EmptyState from '@/components/EmptyState';
import { generateId } from '@/utils/helpers';

export default function NewTimeEntryScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { getJobById, addTimeEntry } = useJobsStore();
  
  const job = getJobById(jobId);
  
  if (!job) {
    return (
      <EmptyState
        title="Job not found"
        message="The job you're trying to add a time entry for doesn't exist"
        actionLabel="Go Back"
        onAction={() => router.back()}
      />
    );
  }
  
  const handleSubmit = async (values: { startTime: number; endTime: number | null; note: string }): Promise<boolean> => {
    try {
      // Create a new time entry with the given values
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
    router.back();
  };
  
  return (
    <View style={styles.container}>
      <TimeEntryForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        jobName={job.title}
        isNewEntry={true}
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