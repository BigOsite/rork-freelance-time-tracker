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
  const {
    timeEntries,
    updateTimeEntry,
    deleteTimeEntry,
    getJobById,
  } = useJobsStore();
  const { colors } = useTheme();

  const timeEntry = timeEntries.find(entry => entry.id === id);
  const job = timeEntry ? getJobById(timeEntry.jobId) : undefined;

  const handleSubmit = async ({
    startTime,
    endTime,
    note,
  }: {
    startTime: number;
    endTime: number | null;
    note: string;
  }): Promise<boolean> => {
    if (!timeEntry) return false;

    try {
      const updated = updateTimeEntry({
        ...timeEntry,
        startTime,
        endTime,
        note,
      });

      if (updated) {
        router.push(`/tabs/job/${timeEntry.jobId}`);
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
    if (timeEntry) {
      router.push(`/tabs/job/${timeEntry.jobId}`);
    } else {
      router.back();
    }
  };

  const handleDelete = () => {
    if (timeEntry) {
      deleteTimeEntry(timeEntry.id);
      router.push(`/tabs/job/${timeEntry.jobId}`);
    }
  };

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

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Time Entry' }} />
      <View style={styles(colors).container}>
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

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
  });

