import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Calendar, Clock, Trash2 } from 'lucide-react-native';
import TimePickerModal from '@/components/TimePickerModal';
import { useTheme } from '@/contexts/ThemeContext';
import { formatTime, formatDate } from '@/utils/time';

type TimeEntryFormProps = {
  initialValues?: {
    startTime: number;
    endTime: number | null;
    note: string;
  };
  onSubmit: (values: { startTime: number; endTime: number | null; note: string }) => Promise<boolean> | boolean;
  onCancel: () => void;
  onDelete?: () => void;
  jobName: string;
  isNewEntry?: boolean;
};

export default function TimeEntryForm({
  initialValues,
  onSubmit,
  onCancel,
  onDelete,
  jobName,
  isNewEntry = false,
}: TimeEntryFormProps) {
  const { colors } = useTheme();

  const defaultValues = useMemo(() => ({
    startTime: Date.now(),
    endTime: null as number | null,
    note: '',
  }), []);

  const values = initialValues || defaultValues;

  const [startTime, setStartTime] = useState(values.startTime);
  const [endTime, setEndTime] = useState(values.endTime);
  const [note, setNote] = useState(values.note);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const currentValues = initialValues || defaultValues;
    setStartTime(currentValues.startTime);
    setEndTime(currentValues.endTime);
    setNote(currentValues.note);
  }, [initialValues, defaultValues]);

  const hasChanges = useMemo(() => {
    if (isNewEntry) return true;
    return (
      startTime !== values.startTime ||
      endTime !== values.endTime ||
      note.trim() !== values.note.trim()
    );
  }, [startTime, endTime, note, values, isNewEntry]);

  const isFormValid = useMemo(() => {
    if (!startTime) return false;
    if (endTime && endTime <= startTime) return false;
    return true;
  }, [startTime, endTime]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!isFormValid) {
      Alert.alert('Invalid Entry', 'Please check your time entry details.');
      return;
    }
    if (!isNewEntry && !hasChanges) {
      Alert.alert('No Changes', 'No changes were made to this time entry.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        startTime,
        endTime,
        note: note.trim(),
      });
      
      if (result === false) {
        Alert.alert('Error', 'Failed to save time entry. Please try again.');
        setIsSubmitting(false);
      } else {
        // Success - give the parent component a moment to handle navigation
        // then reset isSubmitting in case navigation fails
        setTimeout(() => {
          setIsSubmitting(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting time entry:', error);
      Alert.alert('Error', 'Failed to save time entry. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Always allow cancel, even if submitting
    onCancel();
  };

  const handleDelete = () => {
    if (!onDelete || isSubmitting) return;
    Alert.alert('Delete Time Entry', 'Are you sure you want to delete this time entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  const clearEndTime = () => setEndTime(null);

  const handleStartTimeConfirm = (timestamp: number) => {
    setStartTime(timestamp);
    setShowStartTimePicker(false);
  };

  const handleEndTimeConfirm = (timestamp: number) => {
    setEndTime(timestamp);
    setShowEndTimePicker(false);
  };

  const isButtonDisabled = isSubmitting || !isFormValid || (!isNewEntry && !hasChanges);

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job</Text>
          <View style={styles.jobContainer}>
            <Text style={styles.jobName}>{jobName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Time</Text>
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowStartTimePicker(true)}>
            <Text style={styles.timeButtonText}>{formatDate(startTime)} at {formatTime(startTime)}</Text>
          </TouchableOpacity>
          <View style={styles.timePickerButtons}>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStartTimePicker(true)}>
              <Calendar size={16} color={colors.primary} />
              <Text style={styles.pickerButtonText}>{formatDate(startTime)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStartTimePicker(true)}>
              <Clock size={16} color={colors.primary} />
              <Text style={styles.pickerButtonText}>{formatTime(startTime)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>End Time</Text>
            {endTime && <TouchableOpacity onPress={clearEndTime}><Text style={styles.clearButton}>Clear (still running)</Text></TouchableOpacity>}
          </View>
          {endTime ? (
            <>
              <TouchableOpacity style={styles.timeButton} onPress={() => setShowEndTimePicker(true)}>
                <Text style={styles.timeButtonText}>{formatDate(endTime)} at {formatTime(endTime)}</Text>
              </TouchableOpacity>
              <View style={styles.timePickerButtons}>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowEndTimePicker(true)}>
                  <Calendar size={16} color={colors.primary} />
                  <Text style={styles.pickerButtonText}>{formatDate(endTime)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowEndTimePicker(true)}>
                  <Clock size={16} color={colors.primary} />
                  <Text style={styles.pickerButtonText}>{formatTime(endTime)}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity style={styles.setEndTimeButton} onPress={() => setShowEndTimePicker(true)}>
              <Text style={styles.setEndTimeButtonText}>Set End Time</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add notes about this time entry..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, isButtonDisabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isButtonDisabled}
          >
            <Text style={[styles.submitButtonText, isButtonDisabled && styles.submitButtonTextDisabled]}>
              {isSubmitting ? (isNewEntry ? 'Creating...' : 'Updating...') : (isNewEntry ? 'Create Entry' : 'Update Entry')}
            </Text>
          </TouchableOpacity>
        </View>

        {onDelete && (
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete} 
            disabled={isSubmitting}
          >
            <Trash2 size={20} color={colors.danger} />
            <Text style={styles.deleteButtonText}>Delete Time Entry</Text>
          </TouchableOpacity>
        )}
      </View>

      <TimePickerModal
        visible={showStartTimePicker}
        initialTime={startTime}
        onConfirm={handleStartTimeConfirm}
        onClose={() => setShowStartTimePicker(false)}
        title="Set Start Time"
      />

      <TimePickerModal
        visible={showEndTimePicker}
        initialTime={endTime || Date.now()}
        onConfirm={handleEndTimeConfirm}
        onClose={() => setShowEndTimePicker(false)}
        title="Set End Time"
      />
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  jobContainer: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + '15',
  },
  jobName: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  timeButton: {
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timeButtonText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  clearButton: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  setEndTimeButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '25',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  setEndTimeButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  noteInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#1F2937',
    shadowColor: '#374151',
    shadowOpacity: 0.2,
  },
  submitButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  submitButtonTextDisabled: {
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.danger,
    gap: 10,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.2,
  },
});