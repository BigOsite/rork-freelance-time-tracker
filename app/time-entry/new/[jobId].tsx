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
  const { getJobById, updateTimeEntry } = useJobsStore();
  
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
  
  const handleSubmit = (values: { startTime: number; endTime: number | null; note: string }) => {
    // Create a new time entry with the given values
    const newEntry = {
      id: generateId(),
      jobId,
      startTime: values.startTime,
      endTime: values.endTime,
      note: values.note,
      createdAt: Date.now(),
      breaks: [],
      isOnBreak: false,
    };
    
    updateTimeEntry(newEntry);
    router.back();
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