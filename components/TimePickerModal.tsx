import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  Platform,
  SafeAreaView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

type TimePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (timestamp: number) => void;
  initialTime?: number;
  title: string;
};

export default function TimePickerModal({ 
  visible, 
  onClose, 
  onConfirm, 
  initialTime,
  title
}: TimePickerModalProps) {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialTime && !isNaN(initialTime)) {
      const date = new Date(initialTime);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  });
  
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      // On Android, the picker closes automatically
      if (event.type === 'set' && date && !isNaN(date.getTime())) {
        setSelectedDate(date);
        onConfirm(date.getTime());
        if (onClose) onClose();
      } else if (event.type === 'dismissed') {
        if (onClose) onClose();
      }
    } else {
      // On iOS, update the selected date
      if (date && !isNaN(date.getTime())) {
        setSelectedDate(date);
      }
    }
  };
  
  const handleConfirm = () => {
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      onConfirm(selectedDate.getTime());
    }
    if (onClose) onClose();
  };
  
  const handleClose = () => {
    if (onClose) onClose();
  };
  
  const formatTimeDisplay = (date: Date) => {
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDateDisplay = (date: Date) => {
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleDateString([], { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const styles = createStyles(colors);
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.selectedTimeContainer}>
            <Text style={styles.selectedTime}>
              {formatDateDisplay(selectedDate)} at {formatTimeDisplay(selectedDate)}
            </Text>
          </View>
          
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              style={Platform.OS === 'ios' ? styles.picker : undefined}
              textColor={colors.text}
              accentColor={colors.primary}
              themeVariant="light"
            />
          </View>
          
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },
  closeButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.inputBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedTimeContainer: {
    alignItems: 'center',
    marginBottom: 28,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedTime: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  pickerContainer: {
    marginBottom: 28,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  picker: {
    height: 200,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});