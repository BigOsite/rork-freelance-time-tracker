import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, DollarSign, ChevronRight, MapPin, Tag, Clock, Bell, Calculator, Percent } from 'lucide-react-native';
import ColorPicker from '@/components/ColorPicker';
import OptionSelector from '@/components/OptionSelector';
import PresetBreaksModal from '@/components/PresetBreaksModal';
import { useBusinessStore } from '@/store/businessStore';
import { useTheme } from '@/contexts/ThemeContext';
import { getRandomColor } from '@/utils/helpers';
import { PayPeriodType, RoundTimeType, OvertimeType, JobSettings, PresetBreak, TimeRoundingSettings, RoundingDirection, RoundingInterval } from '@/types';

type JobFormProps = {
  initialValues?: {
    title?: string;
    client?: string;
    hourlyRate?: number;
    color?: string;
    settings?: JobSettings;
  };
  onSubmit: (
    title: string, 
    client: string, 
    hourlyRate: number, 
    color: string,
    settings: JobSettings
  ) => void;
  submitButtonText: string;
};

export default function JobForm({ initialValues = {}, onSubmit, submitButtonText }: JobFormProps) {
  const router = useRouter();
  const { taxSettings } = useBusinessStore();
  const { colors } = useTheme();
  
  // Safely handle initial values with proper defaults
  const safeInitialValues = {
    title: initialValues?.title || '',
    client: initialValues?.client || '',
    hourlyRate: initialValues?.hourlyRate || 0,
    color: initialValues?.color || getRandomColor(),
    settings: initialValues?.settings || {
      payPeriodType: 'weekly' as PayPeriodType,
      payPeriodStartDay: 0,
      roundTime: 'none' as RoundTimeType,
      timeRounding: {
        enabled: false,
        direction: 'up' as RoundingDirection,
        interval: '15min' as RoundingInterval,
        bufferTime: 0
      },
      tags: [],
      location: '',
      clockOutReminders: false,
      automaticBreaks: false,
      presetBreaks: [],
      dailyOvertime: 'none' as OvertimeType,
      weeklyOvertime: 'none' as OvertimeType,
      estimatedTaxRate: 0,
      deductions: 0,
    }
  };
  
  const [title, setTitle] = useState(safeInitialValues.title);
  const [client, setClient] = useState(safeInitialValues.client);
  const [hourlyRate, setHourlyRate] = useState((safeInitialValues.hourlyRate || 0).toString());
  const [color, setColor] = useState(safeInitialValues.color);
  
  // Time Rounding Settings
  const [timeRoundingEnabled, setTimeRoundingEnabled] = useState(
    safeInitialValues.settings?.timeRounding?.enabled ?? false
  );
  const [roundingDirection, setRoundingDirection] = useState<RoundingDirection>(
    safeInitialValues.settings?.timeRounding?.direction ?? 'up'
  );
  const [roundingInterval, setRoundingInterval] = useState<RoundingInterval>(
    safeInitialValues.settings?.timeRounding?.interval ?? '15min'
  );
  const [bufferTime, setBufferTime] = useState(
    (safeInitialValues.settings?.timeRounding?.bufferTime || 0).toString()
  );
  
  // Legacy roundTime for backward compatibility
  const [roundTime, setRoundTime] = useState<RoundTimeType>(safeInitialValues.settings?.roundTime || 'none');
  
  // Other settings state
  const [tags, setTags] = useState(safeInitialValues.settings?.tags?.join(', ') || '');
  const [location, setLocation] = useState(safeInitialValues.settings?.location || '');
  const [clockOutReminders, setClockOutReminders] = useState(safeInitialValues.settings?.clockOutReminders || false);
  const [dailyReminderThreshold, setDailyReminderThreshold] = useState((safeInitialValues.settings?.dailyReminderThreshold || 0).toString());
  const [weeklyReminderThreshold, setWeeklyReminderThreshold] = useState((safeInitialValues.settings?.weeklyReminderThreshold || 0).toString());
  const [automaticBreaks, setAutomaticBreaks] = useState(safeInitialValues.settings?.automaticBreaks || false);
  const [presetBreaks, setPresetBreaks] = useState<PresetBreak[]>(safeInitialValues.settings?.presetBreaks || []);
  
  // Overtime settings - converted to boolean toggles
  const [dailyOvertimeEnabled, setDailyOvertimeEnabled] = useState(
    safeInitialValues.settings?.dailyOvertime === 'daily'
  );
  const [weeklyOvertimeEnabled, setWeeklyOvertimeEnabled] = useState(
    safeInitialValues.settings?.weeklyOvertime === 'weekly'
  );
  const [dailyOvertimeThreshold, setDailyOvertimeThreshold] = useState((safeInitialValues.settings?.dailyOvertimeThreshold || 8).toString());
  const [weeklyOvertimeThreshold, setWeeklyOvertimeThreshold] = useState((safeInitialValues.settings?.weeklyOvertimeThreshold || 40).toString());
  const [dailyOvertimeRate, setDailyOvertimeRate] = useState((safeInitialValues.settings?.dailyOvertimeRate || 1.5).toString());
  const [weeklyOvertimeRate, setWeeklyOvertimeRate] = useState((safeInitialValues.settings?.weeklyOvertimeRate || 1.5).toString());
  
  const [payPeriodType, setPayPeriodType] = useState<PayPeriodType>(safeInitialValues.settings?.payPeriodType || 'weekly');
  const [payPeriodStartDay, setPayPeriodStartDay] = useState(safeInitialValues.settings?.payPeriodStartDay || 0);
  const [estimatedTaxRate, setEstimatedTaxRate] = useState((safeInitialValues.settings?.estimatedTaxRate || 0).toString());
  const [deductions, setDeductions] = useState((safeInitialValues.settings?.deductions || 0).toString());
  
  // Modal states
  const [showPresetBreaksModal, setShowPresetBreaksModal] = useState(false);
  
  // Handlers for mutually exclusive overtime toggles
  const handleDailyOvertimeChange = React.useCallback((value: boolean) => {
    setDailyOvertimeEnabled(value);
    if (value && weeklyOvertimeEnabled) {
      setWeeklyOvertimeEnabled(false);
    }
  }, [weeklyOvertimeEnabled]);
  
  const handleWeeklyOvertimeChange = React.useCallback((value: boolean) => {
    setWeeklyOvertimeEnabled(value);
    if (value && dailyOvertimeEnabled) {
      setDailyOvertimeEnabled(false);
    }
  }, [dailyOvertimeEnabled]);
  
  const handleSubmit = React.useCallback(() => {
    if (!title.trim()) {
      Alert.alert("Error", "Job title is required");
      return;
    }
    
    if (!client.trim()) {
      Alert.alert("Error", "Client name is required");
      return;
    }
    
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert("Error", "Please enter a valid hourly rate");
      return;
    }
    
    // Validate buffer time
    const bufferTimeNum = parseFloat(bufferTime);
    if (timeRoundingEnabled && (isNaN(bufferTimeNum) || bufferTimeNum < 0 || bufferTimeNum > 30)) {
      Alert.alert("Error", "Buffer time must be between 0 and 30 minutes");
      return;
    }
    
    // Parse and validate settings
    const timeRoundingSettings: TimeRoundingSettings = {
      enabled: timeRoundingEnabled,
      direction: roundingDirection,
      interval: roundingInterval,
      bufferTime: timeRoundingEnabled ? bufferTimeNum : 0
    };
    
    const settings: JobSettings = {
      roundTime, // Keep for backward compatibility
      timeRounding: timeRoundingSettings,
      tags: tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      location: location.trim() || undefined,
      clockOutReminders,
      dailyReminderThreshold: clockOutReminders && dailyReminderThreshold ? parseFloat(dailyReminderThreshold) : undefined,
      weeklyReminderThreshold: clockOutReminders && weeklyReminderThreshold ? parseFloat(weeklyReminderThreshold) : undefined,
      automaticBreaks,
      presetBreaks: automaticBreaks ? presetBreaks : [],
      dailyOvertime: dailyOvertimeEnabled ? 'daily' : 'none',
      weeklyOvertime: weeklyOvertimeEnabled ? 'weekly' : 'none',
      dailyOvertimeThreshold: dailyOvertimeEnabled ? parseFloat(dailyOvertimeThreshold) || 8 : undefined,
      weeklyOvertimeThreshold: weeklyOvertimeEnabled ? parseFloat(weeklyOvertimeThreshold) || 40 : undefined,
      dailyOvertimeRate: dailyOvertimeEnabled ? parseFloat(dailyOvertimeRate) || 1.5 : undefined,
      weeklyOvertimeRate: weeklyOvertimeEnabled ? parseFloat(weeklyOvertimeRate) || 1.5 : undefined,
      payPeriodType,
      payPeriodStartDay,
      estimatedTaxRate: parseFloat(estimatedTaxRate) || 0,
      deductions: parseFloat(deductions) || 0,
    };
    
    onSubmit(title, client, rate, color, settings);
  }, [
    title, client, hourlyRate, color, timeRoundingEnabled, roundingDirection, roundingInterval, 
    bufferTime, roundTime, tags, location, clockOutReminders, dailyReminderThreshold, 
    weeklyReminderThreshold, automaticBreaks, presetBreaks, dailyOvertimeEnabled, weeklyOvertimeEnabled, 
    dailyOvertimeThreshold, weeklyOvertimeThreshold, dailyOvertimeRate, weeklyOvertimeRate, 
    payPeriodType, payPeriodStartDay, estimatedTaxRate, deductions, onSubmit
  ]);
  
  const handleCancel = React.useCallback(() => {
    router.back();
  }, [router]);
  
  const handleOpenPresetBreaks = React.useCallback(() => {
    setShowPresetBreaksModal(true);
  }, []);
  
  const handleSavePresetBreaks = React.useCallback((breaks: PresetBreak[]) => {
    setPresetBreaks(breaks);
    setShowPresetBreaksModal(false);
  }, []);
  
  const roundingDirectionOptions = [
    { label: 'Round Up', value: 'up' },
    { label: 'Round Down', value: 'down' },
  ];
  
  const roundingIntervalOptions = [
    { label: 'Nearest 15 minutes', value: '15min' },
    { label: 'Nearest 30 minutes', value: '30min' },
    { label: 'Nearest 1 hour', value: '1hour' },
  ];
  
  const payPeriodOptions = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Biweekly', value: 'biweekly' },
    { label: 'Monthly', value: 'monthly' },
  ];
  
  const getStartDayOptions = () => {
    if (payPeriodType === 'monthly') {
      // For monthly, days 1-28
      return Array.from({ length: 28 }, (_, i) => ({
        label: `${i + 1}${getDaySuffix(i + 1)} of month`,
        value: i + 1
      }));
    } else {
      // For weekly/biweekly, days of week
      return [
        { label: 'Sunday', value: 0 },
        { label: 'Monday', value: 1 },
        { label: 'Tuesday', value: 2 },
        { label: 'Wednesday', value: 3 },
        { label: 'Thursday', value: 4 },
        { label: 'Friday', value: 5 },
        { label: 'Saturday', value: 6 },
      ];
    }
  };
  
  const getDaySuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  const getTimeRoundingDescription = () => {
    if (!timeRoundingEnabled) return 'Time rounding is disabled';
    
    const intervalText = roundingInterval === '15min' ? '15 minutes' : 
                        roundingInterval === '30min' ? '30 minutes' : '1 hour';
    const directionText = roundingDirection === 'up' ? 'up' : 'down';
    const bufferText = bufferTime === '0' ? 'no buffer' : `${bufferTime}-minute buffer`;
    
    return `Round ${directionText} to nearest ${intervalText} with ${bufferText}`;
  };
  
  const getExampleText = () => {
    const intervalText = roundingInterval === '15min' ? '15 minutes' : 
                        roundingInterval === '30min' ? '30 minutes' : '1 hour';
    const directionText = roundingDirection === 'up' ? 'up' : 'down';
    const bufferTimeNum = parseInt(bufferTime) || 0;
    
    let exampleText = "You clock out at 1:55 PM\n";
    exampleText += `Direction: ${roundingDirection === 'up' ? 'Round Up' : 'Round Down'}\n`;
    exampleText += `Interval: ${roundingIntervalOptions.find(opt => opt.value === roundingInterval)?.label}\n`;
    exampleText += `Buffer: ${bufferTime || '0'} minutes\n`;
    
    if (bufferTimeNum > 0) {
      exampleText += `Since you clocked out ${bufferTime} minutes before 2:00 PM (within buffer), time rounds ${directionText} to 2:00 PM`;
    } else {
      exampleText += `Time rounds ${directionText} to the ${roundingIntervalOptions.find(opt => opt.value === roundingInterval)?.label.toLowerCase()}`;
    }
    
    return exampleText;
  };
  
  const styles = createStyles(colors);
  
  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Job Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Website Redesign"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Client</Text>
              <TextInput
                style={styles.input}
                value={client}
                onChangeText={setClient}
                placeholder="e.g. Acme Corp"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Hourly Rate</Text>
              <View style={styles.inputWithIcon}>
                <Text style={styles.currencySymbol}>{taxSettings.currencySymbol}</Text>
                <TextInput
                  style={styles.inputWithIconText}
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Color</Text>
              <ColorPicker
                initialColor={color}
                onSelectColor={setColor}
              />
            </View>
          </View>
          
          {/* Time Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Settings</Text>
            
            {/* Time Rounding Section */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Clock size={20} color={colors.subtext} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Time rounding</Text>
                  <Text style={styles.settingValue}>
                    {timeRoundingEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={timeRoundingEnabled}
                onValueChange={setTimeRoundingEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={timeRoundingEnabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            
            {/* Time Rounding Configuration - Only show when enabled */}
            {timeRoundingEnabled && (
              <View style={styles.roundingSettings}>
                <Text style={styles.roundingDescription}>
                  {getTimeRoundingDescription()}
                </Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Rounding Direction</Text>
                  <OptionSelector
                    options={roundingDirectionOptions}
                    selectedValue={roundingDirection}
                    onSelect={(value) => setRoundingDirection(value as RoundingDirection)}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Rounding Interval</Text>
                  <OptionSelector
                    options={roundingIntervalOptions}
                    selectedValue={roundingInterval}
                    onSelect={(value) => setRoundingInterval(value as RoundingInterval)}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Buffer Time (minutes)</Text>
                  <TextInput
                    style={styles.input}
                    value={bufferTime}
                    onChangeText={setBufferTime}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                  />
                  <Text style={styles.helpText}>
                    Buffer time defines how much time must pass before rounding occurs (0-30 minutes)
                  </Text>
                </View>
                
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleTitle}>Example:</Text>
                  <Text style={styles.exampleText}>
                    {getExampleText()}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Bell size={20} color={colors.subtext} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Remind me to clock out</Text>
                  <Text style={styles.settingValue}>
                    {clockOutReminders ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>
              <Switch
                value={clockOutReminders}
                onValueChange={setClockOutReminders}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={clockOutReminders ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            
            {/* Clock Out Reminder Settings - Only show when enabled */}
            {clockOutReminders && (
              <View style={styles.reminderSettings}>
                <View style={styles.reminderRow}>
                  <Text style={styles.reminderLabel}>Daily after</Text>
                  <View style={styles.reminderInputContainer}>
                    <TextInput
                      style={styles.reminderInput}
                      value={dailyReminderThreshold}
                      onChangeText={setDailyReminderThreshold}
                      keyboardType="decimal-pad"
                      placeholder="not set"
                      placeholderTextColor={colors.placeholder}
                    />
                    <Text style={styles.reminderUnit}>hours</Text>
                  </View>
                </View>
                
                <View style={styles.reminderRow}>
                  <Text style={styles.reminderLabel}>Weekly after</Text>
                  <View style={styles.reminderInputContainer}>
                    <TextInput
                      style={styles.reminderInput}
                      value={weeklyReminderThreshold}
                      onChangeText={setWeeklyReminderThreshold}
                      keyboardType="decimal-pad"
                      placeholder="not set"
                      placeholderTextColor={colors.placeholder}
                    />
                    <Text style={styles.reminderUnit}>hours</Text>
                  </View>
                </View>
                
                <Text style={styles.reminderDescription}>
                  Receive a reminder notification when you have worked a set number of hours for this job, and see what time you will have worked that many hours displayed throughout HoursTracker. Especially useful if you are rounding your time.
                </Text>
              </View>
            )}
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Clock size={20} color={colors.subtext} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Automatic breaks</Text>
                  <Text style={styles.settingValue}>
                    {automaticBreaks ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>
              <Switch
                value={automaticBreaks}
                onValueChange={setAutomaticBreaks}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={automaticBreaks ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            
            {/* Preset Breaks Section - Only show when automatic breaks is enabled */}
            {automaticBreaks && (
              <View style={styles.presetBreaksSection}>
                <Text style={styles.presetBreaksDescription}>
                  Preset breaks will be automatically applied while clocked in and to time entries that span the break's start and end times.
                </Text>
                
                <Text style={styles.presetBreaksLabel}>PRESET BREAKS</Text>
                
                {presetBreaks.length > 0 ? (
                  <View style={styles.presetBreaksList}>
                    {presetBreaks.map((breakItem) => (
                      <View key={breakItem.id} style={styles.presetBreakItem}>
                        <Text style={styles.presetBreakName}>{breakItem.name}</Text>
                        <Text style={styles.presetBreakDetails}>
                          {breakItem.startTime} - {breakItem.endTime}
                        </Text>
                        <Text style={styles.presetBreakDays}>
                          {breakItem.days.join(', ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noPresetBreaks}>
                    <Text style={styles.noPresetBreaksText}>No preset breaks added yet</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.manageBreaksButton}
                  onPress={handleOpenPresetBreaks}
                >
                  <Text style={styles.manageBreaksText}>Manage Preset Breaks</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Organization */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organization</Text>
            
            <View style={styles.formGroup}>
              <View style={styles.settingInfo}>
                <Tag size={20} color={colors.subtext} />
                <Text style={styles.settingLabel}>Tags</Text>
              </View>
              <TextInput
                style={styles.input}
                value={tags}
                onChangeText={setTags}
                placeholder="e.g. Design, Frontend, Client Work"
                placeholderTextColor={colors.placeholder}
              />
              <Text style={styles.helpText}>Separate tags with commas</Text>
            </View>
            
            <View style={styles.formGroup}>
              <View style={styles.settingInfo}>
                <MapPin size={20} color={colors.subtext} />
                <Text style={styles.settingLabel}>Location</Text>
              </View>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Office, Home, Client Site"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </View>
          
          {/* Overtime Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overtime</Text>
            
            {/* Daily Overtime Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Clock size={20} color={colors.subtext} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Daily overtime</Text>
                  <Text style={styles.settingValue}>
                    {dailyOvertimeEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>
              <Switch
                value={dailyOvertimeEnabled}
                onValueChange={handleDailyOvertimeChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={dailyOvertimeEnabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            
            {/* Daily Overtime Settings - Only show when enabled */}
            {dailyOvertimeEnabled && (
              <View style={styles.overtimeSettings}>
                <View style={styles.overtimeRow}>
                  <Text style={styles.overtimeLabel}>Threshold</Text>
                  <View style={styles.overtimeInputContainer}>
                    <TextInput
                      style={styles.overtimeInput}
                      value={dailyOvertimeThreshold}
                      onChangeText={setDailyOvertimeThreshold}
                      keyboardType="decimal-pad"
                      placeholder="8"
                      placeholderTextColor={colors.placeholder}
                    />
                    <Text style={styles.overtimeUnit}>hours</Text>
                  </View>
                </View>
                
                <View style={styles.overtimeRow}>
                  <Text style={styles.overtimeLabel}>Rate multiplier</Text>
                  <View style={styles.overtimeInputContainer}>
                    <TextInput
                      style={styles.overtimeInput}
                      value={dailyOvertimeRate}
                      onChangeText={setDailyOvertimeRate}
                      keyboardType="decimal-pad"
                      placeholder="1.5"
                      placeholderTextColor={colors.placeholder}
                    />
                    <Text style={styles.overtimeUnit}>x</Text>
                  </View>
                </View>
              </View>
            )}
            
            {/* Weekly Overtime Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Calendar size={20} color={colors.subtext} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Weekly overtime</Text>
                  <Text style={styles.settingValue}>
                    {weeklyOvertimeEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>
              <Switch
                value={weeklyOvertimeEnabled}
                onValueChange={handleWeeklyOvertimeChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={weeklyOvertimeEnabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            
            {/* Weekly Overtime Settings - Only show when enabled */}
            {weeklyOvertimeEnabled && (
              <View style={styles.overtimeSettings}>
                <View style={styles.overtimeRow}>
                  <Text style={styles.overtimeLabel}>Threshold</Text>
                  <View style={styles.overtimeInputContainer}>
                    <TextInput
                      style={styles.overtimeInput}
                      value={weeklyOvertimeThreshold}
                      onChangeText={setWeeklyOvertimeThreshold}
                      keyboardType="decimal-pad"
                      placeholder="40"
                      placeholderTextColor={colors.placeholder}
                    />
                    <Text style={styles.overtimeUnit}>hours</Text>
                  </View>
                </View>
                
                <View style={styles.overtimeRow}>
                  <Text style={styles.overtimeLabel}>Rate multiplier</Text>
                  <View style={styles.overtimeInputContainer}>
                    <TextInput
                      style={styles.overtimeInput}
                      value={weeklyOvertimeRate}
                      onChangeText={setWeeklyOvertimeRate}
                      keyboardType="decimal-pad"
                      placeholder="1.5"
                      placeholderTextColor={colors.placeholder}
                    />
                    <Text style={styles.overtimeUnit}>x</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
          
          {/* Pay Period */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pay Period</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Schedule</Text>
              <OptionSelector
                options={payPeriodOptions}
                selectedValue={payPeriodType}
                onSelect={(value) => setPayPeriodType(value as PayPeriodType)}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {payPeriodType === 'monthly' ? 'Period ends' : 'Period ends'}
              </Text>
              <OptionSelector
                options={getStartDayOptions()}
                selectedValue={payPeriodStartDay}
                onSelect={(value) => setPayPeriodStartDay(Number(value))}
              />
            </View>
          </View>
          
          {/* Financial Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial</Text>
            
            <View style={styles.formGroup}>
              <View style={styles.settingInfo}>
                <Percent size={20} color={colors.subtext} />
                <Text style={styles.settingLabel}>Estimated tax rate (%)</Text>
              </View>
              <TextInput
                style={styles.input}
                value={estimatedTaxRate}
                onChangeText={setEstimatedTaxRate}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            
            <View style={styles.formGroup}>
              <View style={styles.settingInfo}>
                <Calculator size={20} color={colors.subtext} />
                <Text style={styles.settingLabel}>Deductions ({taxSettings.currencySymbol})</Text>
              </View>
              <View style={styles.inputWithIcon}>
                <Text style={styles.currencySymbol}>{taxSettings.currencySymbol}</Text>
                <TextInput
                  style={styles.inputWithIconText}
                  value={deductions}
                  onChangeText={setDeductions}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <Text style={styles.helpText}>
                Deductions are applied to net earnings calculations after each pay period has ended.
              </Text>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>{submitButtonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <PresetBreaksModal
        visible={showPresetBreaksModal}
        initialBreaks={presetBreaks}
        onClose={() => setShowPresetBreaksModal(false)}
        onSave={handleSavePresetBreaks}
      />
    </>
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
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currencySymbol: {
    fontSize: 20,
    color: colors.subtext,
    marginRight: 8,
    fontWeight: '500',
  },
  inputWithIconText: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  settingValue: {
    fontSize: 14,
    color: colors.subtext,
  },
  helpText: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 4,
    fontStyle: 'italic',
  },
  roundingSettings: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  roundingDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  exampleBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 12,
    color: colors.primary,
    lineHeight: 16,
  },
  reminderSettings: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reminderLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  reminderInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    color: colors.text,
    minWidth: 80,
    textAlign: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderUnit: {
    fontSize: 14,
    color: colors.subtext,
  },
  reminderDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  presetBreaksSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  presetBreaksDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: 16,
  },
  presetBreaksLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.subtext,
    marginBottom: 8,
  },
  presetBreaksList: {
    marginBottom: 16,
  },
  presetBreakItem: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  presetBreakName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  presetBreakDetails: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: 2,
  },
  presetBreakDays: {
    fontSize: 12,
    color: colors.subtext,
  },
  noPresetBreaks: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  noPresetBreaksText: {
    fontSize: 14,
    color: colors.subtext,
  },
  manageBreaksButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
  },
  manageBreaksText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  overtimeSettings: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  overtimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overtimeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  overtimeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overtimeInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    color: colors.text,
    minWidth: 80,
    textAlign: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overtimeUnit: {
    fontSize: 14,
    color: colors.subtext,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#374151',
    shadowColor: '#374151',
  },
  submitButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
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
});