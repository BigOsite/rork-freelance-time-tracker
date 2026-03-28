import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  FlatList,
  SafeAreaView,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Plus, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { PresetBreak } from '@/types';
import { generateId } from '@/utils/helpers';

type PresetBreaksModalProps = {
  visible: boolean;
  initialBreaks: PresetBreak[];
  onClose?: () => void;
  onSave: (breaks: PresetBreak[]) => void;
};

export default function PresetBreaksModal({ 
  visible, 
  initialBreaks,
  onClose = () => {}, 
  onSave
}: PresetBreaksModalProps) {
  const { colors } = useTheme();
  const [presetBreaks, setPresetBreaks] = useState<PresetBreak[]>(initialBreaks || []);
  const [showDaysPicker, setShowDaysPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [editingBreak, setEditingBreak] = useState<PresetBreak | null>(null);
  const [showBreakEditor, setShowBreakEditor] = useState(false);
  
  useEffect(() => {
    setPresetBreaks(initialBreaks || []);
  }, [initialBreaks, visible]);
  
  const handleAddBreak = () => {
    const newBreak: PresetBreak = {
      id: generateId(),
      name: "Break",
      startTime: "12:00",
      endTime: "13:00",
      duration: 60,
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    };
    
    setEditingBreak(newBreak);
    setShowBreakEditor(true);
  };
  
  const handleEditBreak = (breakItem: PresetBreak) => {
    setEditingBreak({...breakItem});
    setShowBreakEditor(true);
  };
  
  const handleDeleteBreak = (id: string) => {
    setPresetBreaks(presetBreaks.filter(breakItem => breakItem.id !== id));
  };
  
  const handleSaveBreak = () => {
    if (!editingBreak) return;
    
    // Validate break data
    if (!editingBreak.name.trim()) {
      Alert.alert("Error", "Break name cannot be empty");
      return;
    }
    
    if (!editingBreak.days || editingBreak.days.length === 0) {
      Alert.alert("Error", "Please select at least one day");
      return;
    }
    
    // Check if this is a new break or editing an existing one
    const existingBreakIndex = presetBreaks.findIndex(b => b.id === editingBreak.id);
    
    if (existingBreakIndex >= 0) {
      // Update existing break
      const updatedBreaks = [...presetBreaks];
      updatedBreaks[existingBreakIndex] = editingBreak;
      setPresetBreaks(updatedBreaks);
    } else {
      // Add new break
      setPresetBreaks([...presetBreaks, editingBreak]);
    }
    
    // Close all modals and reset state
    setShowBreakEditor(false);
    setEditingBreak(null);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setShowDaysPicker(false);
  };
  
  const handleUpdateBreakField = (field: keyof PresetBreak, value: any) => {
    if (!editingBreak) return;
    
    const updatedBreak = {...editingBreak, [field]: value};
    
    // If updating start or end time, recalculate duration
    if (field === 'startTime' || field === 'endTime') {
      const startParts = updatedBreak.startTime.split(':').map(Number);
      const endParts = updatedBreak.endTime.split(':').map(Number);
      
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      
      // Handle cases where end time is on the next day
      const duration = endMinutes >= startMinutes 
        ? endMinutes - startMinutes 
        : (24 * 60 - startMinutes) + endMinutes;
      
      updatedBreak.duration = duration;
    }
    
    setEditingBreak(updatedBreak);
  };
  
  const handleSave = () => {
    onSave(presetBreaks);
    onClose();
  };
  
  const dayOptions = [
    { label: 'Monday', value: 'Monday' },
    { label: 'Tuesday', value: 'Tuesday' },
    { label: 'Wednesday', value: 'Wednesday' },
    { label: 'Thursday', value: 'Thursday' },
    { label: 'Friday', value: 'Friday' },
    { label: 'Saturday', value: 'Saturday' },
    { label: 'Sunday', value: 'Sunday' },
  ];
  
  const handleSelectDays = (selectedDays: string[]) => {
    if (!editingBreak) return;
    
    handleUpdateBreakField('days', selectedDays);
    setShowDaysPicker(false);
  };
  
  const formatTimeForDisplay = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDurationForDisplay = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes === 60) {
      return '1 hour';
    } else if (minutes % 60 === 0) {
      return `${minutes / 60} hours`;
    } else {
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }
  };
  
  const formatDaysForDisplay = (days: string[]) => {
    if (days.length === 7) {
      return 'Every day';
    } else if (days.length === 5 && 
               days.includes('Monday') && 
               days.includes('Tuesday') && 
               days.includes('Wednesday') && 
               days.includes('Thursday') && 
               days.includes('Friday')) {
      return 'Weekdays';
    } else if (days.length === 2 && 
               days.includes('Saturday') && 
               days.includes('Sunday')) {
      return 'Weekends';
    } else {
      return days.join(', ');
    }
  };
  
  const renderBreakItem = ({ item }: { item: PresetBreak }) => (
    <TouchableOpacity 
      style={[styles.breakItem, { backgroundColor: colors.background }]}
      onPress={() => handleEditBreak(item)}
    >
      <View style={styles.breakHeader}>
        <Text style={[styles.breakName, { color: colors.text }]}>{item.name}</Text>
        <ChevronRight size={20} color={colors.subtext} />
      </View>
      
      <View style={styles.breakDetails}>
        <Text style={[styles.breakTime, { color: colors.text }]}>
          {formatTimeForDisplay(item.startTime)} - {formatTimeForDisplay(item.endTime)}
        </Text>
        <Text style={[styles.breakDuration, { color: colors.subtext }]}>
          {formatDurationForDisplay(item.duration)}
        </Text>
        <Text style={[styles.breakDays, { color: colors.subtext }]}>
          {formatDaysForDisplay(item.days)}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  const handleTimePickerChange = (event: any, selectedDate?: Date, isStartTime: boolean = true) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
    }
    
    if (selectedDate && event && event.type !== 'dismissed') {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      if (isStartTime) {
        handleUpdateBreakField('startTime', timeString);
      } else {
        handleUpdateBreakField('endTime', timeString);
      }
      
      if (Platform.OS === 'ios') {
        if (isStartTime) {
          setShowStartTimePicker(false);
        } else {
          setShowEndTimePicker(false);
        }
      }
    } else if (Platform.OS === 'android' && event && event.type === 'dismissed') {
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
    }
  };
  
  const renderBreakEditor = () => {
    if (!editingBreak) return null;
    
    return (
      <Modal
        visible={showBreakEditor}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={[styles.editorContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.editorHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => {
              setShowBreakEditor(false);
              setEditingBreak(null);
              // Reset all picker states
              setShowStartTimePicker(false);
              setShowEndTimePicker(false);
              setShowDaysPicker(false);
            }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.editorTitle, { color: colors.text }]}>Edit Break</Text>
            <TouchableOpacity onPress={handleSaveBreak}>
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.editorForm, { backgroundColor: colors.background }]}>
            <View style={[styles.formGroup, { borderBottomColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Name</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text }]}
                value={editingBreak.name}
                onChangeText={(text) => handleUpdateBreakField('name', text)}
                placeholder="Break name"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.formGroup, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowEndTimePicker(false);
                setShowDaysPicker(false);
                setShowStartTimePicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.formLabel, { color: colors.text }]}>Start</Text>
              <View style={styles.formValue}>
                <Text style={[styles.formValueText, { color: colors.subtext }]}>
                  {formatTimeForDisplay(editingBreak.startTime)}
                </Text>
                <ChevronRight size={20} color={colors.subtext} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.formGroup, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowStartTimePicker(false);
                setShowDaysPicker(false);
                setShowEndTimePicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.formLabel, { color: colors.text }]}>End</Text>
              <View style={styles.formValue}>
                <Text style={[styles.formValueText, { color: colors.subtext }]}>
                  {formatTimeForDisplay(editingBreak.endTime)}
                </Text>
                <ChevronRight size={20} color={colors.subtext} />
              </View>
            </TouchableOpacity>
            
            <View style={[styles.formGroup, { borderBottomColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Duration</Text>
              <View style={styles.formValue}>
                <Text style={[styles.formValueText, { color: colors.subtext }]}>
                  {formatDurationForDisplay(editingBreak.duration)}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.formGroup, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowStartTimePicker(false);
                setShowEndTimePicker(false);
                setShowDaysPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.formLabel, { color: colors.text }]}>Days</Text>
              <View style={styles.formValue}>
                <Text style={[styles.formValueText, { color: colors.subtext }]} numberOfLines={1} ellipsizeMode="tail">
                  {formatDaysForDisplay(editingBreak.days)}
                </Text>
                <ChevronRight size={20} color={colors.subtext} />
              </View>
            </TouchableOpacity>
            
            {presetBreaks.some(b => b.id === editingBreak.id) && (
              <TouchableOpacity 
                style={[styles.deleteButton, { borderColor: colors.danger }]}
                onPress={() => {
                  Alert.alert(
                    "Delete Break",
                    "Are you sure you want to delete this break?",
                    [
                      {
                        text: "Cancel",
                        style: "cancel"
                      },
                      {
                        text: "Delete",
                        onPress: () => {
                          handleDeleteBreak(editingBreak.id);
                          setShowBreakEditor(false);
                          setEditingBreak(null);
                        },
                        style: "destructive"
                      }
                    ]
                  );
                }}
              >
                <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete Break</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {showStartTimePicker && (
            <View style={[styles.timePickerContainer, { backgroundColor: colors.background }]}>
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = editingBreak.startTime.split(':').map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes, 0, 0);
                  return date;
                })()}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => handleTimePickerChange(event, selectedDate, true)}
                textColor={colors.text}
                accentColor={colors.primary}
                themeVariant="light"
              />
            </View>
          )}
          
          {showEndTimePicker && (
            <View style={[styles.timePickerContainer, { backgroundColor: colors.background }]}>
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = editingBreak.endTime.split(':').map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes, 0, 0);
                  return date;
                })()}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => handleTimePickerChange(event, selectedDate, false)}
                textColor={colors.text}
                accentColor={colors.primary}
                themeVariant="light"
              />
            </View>
          )}
          
          {showDaysPicker && <DaysSelector />}
        </SafeAreaView>
      </Modal>
    );
  };
  
  // Custom multi-select component for days
  const DaysSelector = () => {
    const [selectedDays, setSelectedDays] = useState<string[]>(
      editingBreak ? [...editingBreak.days] : []
    );
    
    const toggleDay = (day: string) => {
      if (selectedDays.includes(day)) {
        setSelectedDays(selectedDays.filter(d => d !== day));
      } else {
        setSelectedDays([...selectedDays, day]);
      }
    };
    
    const handleConfirm = () => {
      if (selectedDays.length === 0) {
        Alert.alert("Error", "Please select at least one day");
        return;
      }
      handleSelectDays(selectedDays);
    };
    
    const selectAllDays = () => {
      setSelectedDays(dayOptions.map(day => day.value));
    };
    
    const selectWeekdays = () => {
      setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    };
    
    const selectWeekends = () => {
      setSelectedDays(['Saturday', 'Sunday']);
    };
    
    const clearSelection = () => {
      setSelectedDays([]);
    };
    
    return (
      <View style={[styles.daysSelectorContainer, { backgroundColor: colors.background }]}>
        <View style={styles.daysSelectorContent}>
          <View style={styles.daysSelectorHeader}>
            <Text style={[styles.daysSelectorTitle, { color: colors.text }]}>Select Days</Text>
            <TouchableOpacity onPress={() => setShowDaysPicker(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.daysQuickSelect}>
            <TouchableOpacity style={[styles.quickSelectButton, { backgroundColor: colors.inputBg }]} onPress={selectAllDays}>
              <Text style={[styles.quickSelectText, { color: colors.text }]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickSelectButton, { backgroundColor: colors.inputBg }]} onPress={selectWeekdays}>
              <Text style={[styles.quickSelectText, { color: colors.text }]}>Weekdays</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickSelectButton, { backgroundColor: colors.inputBg }]} onPress={selectWeekends}>
              <Text style={[styles.quickSelectText, { color: colors.text }]}>Weekends</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickSelectButton, { backgroundColor: colors.inputBg }]} onPress={clearSelection}>
              <Text style={[styles.quickSelectText, { color: colors.text }]}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.daysListContainer}>
            {dayOptions.map(day => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayOption,
                  { borderBottomColor: colors.border },
                  selectedDays.includes(day.value) && { backgroundColor: `${colors.primary}10` }
                ]}
                onPress={() => toggleDay(day.value)}
              >
                <Text style={[
                  styles.dayOptionText,
                  { color: colors.text },
                  selectedDays.includes(day.value) && { color: colors.primary, fontWeight: '500' }
                ]}>
                  {day.label}
                </Text>
                {selectedDays.includes(day.value) && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={[
              styles.confirmButton,
              { backgroundColor: colors.primary },
              selectedDays.length === 0 && { backgroundColor: colors.border }
            ]}
            onPress={handleConfirm}
            disabled={selectedDays.length === 0}
          >
            <Text style={[
              styles.confirmButtonText,
              selectedDays.length === 0 && { color: colors.subtext }
            ]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const styles = createStyles(colors);
  
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Preset Breaks</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Preset breaks will be automatically applied while clocked in and to time entries that span the break's start and end times.
          </Text>
        </View>
        
        <Text style={styles.sectionTitle}>PRESET BREAKS</Text>
        
        <FlatList
          data={presetBreaks}
          renderItem={renderBreakItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.breaksList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No preset breaks added yet</Text>
            </View>
          }
        />
        
        <TouchableOpacity 
          style={styles.addBreakButton}
          onPress={handleAddBreak}
        >
          <Plus size={20} color={colors.primary} />
          <Text style={styles.addBreakText}>Add Break</Text>
        </TouchableOpacity>
      </SafeAreaView>
      
      {renderBreakEditor()}
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  infoContainer: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.subtext,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  breaksList: {
    paddingHorizontal: 16,
  },
  breakItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  breakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakName: {
    fontSize: 16,
    fontWeight: '600',
  },
  breakDetails: {
    marginTop: 8,
  },
  breakTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  breakDuration: {
    fontSize: 14,
    marginBottom: 4,
  },
  breakDays: {
    fontSize: 14,
  },
  addBreakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    margin: 16,
  },
  addBreakText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 8,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.subtext,
  },
  // Break editor styles
  editorContainer: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editorForm: {
    marginTop: 16,
  },
  formGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  formLabel: {
    fontSize: 16,
  },
  formInput: {
    fontSize: 16,
    textAlign: 'right',
    flex: 1,
  },
  formValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formValueText: {
    fontSize: 16,
    marginRight: 8,
    maxWidth: 200,
  },
  timePickerContainer: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 10,
  },
  deleteButton: {
    margin: 16,
    padding: 16,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Days selector styles - improved structure
  daysSelectorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 34, // Account for safe area
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  daysSelectorContent: {
    flex: 1,
  },
  daysSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  daysSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  daysQuickSelect: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  quickSelectText: {
    fontSize: 14,
  },
  daysListContainer: {
    flex: 1,
    marginBottom: 20,
  },
  dayOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dayOptionText: {
    fontSize: 16,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});