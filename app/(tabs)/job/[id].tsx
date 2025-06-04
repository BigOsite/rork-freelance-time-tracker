import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  Clock, 
  Coins, 
  Edit, 
  Plus, 
  Calendar,
  ChevronLeft,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import { useJobsStore } from '@/store/jobsStore';
import { useBusinessStore } from '@/store/businessStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration, formatDateFull, formatTime, getStartOfWeek, getEndOfWeek } from '@/utils/time';
import { formatCurrency } from '@/utils/helpers';
import TimeEntryCard from '@/components/TimeEntryCard';
import EmptyState from '@/components/EmptyState';
import TimePickerModal from '@/components/TimePickerModal';
import PayPeriodCard from '@/components/PayPeriodCard';
import { useTheme } from '@/contexts/ThemeContext';
import { TimeEntry, PayPeriod } from '@/types';

export default function JobDetailScreen() {
  // ALL HOOKS MUST BE DECLARED FIRST - BEFORE ANY CONDITIONAL LOGIC
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showBreakStartPicker, setShowBreakStartPicker] = useState(false);
  const [activeEntryState, setActiveEntryState] = useState<TimeEntry | null>(null);
  const [showPayPeriods, setShowPayPeriods] = useState(false);
  
  const store = useJobsStore();
  const { taxSettings } = useBusinessStore();
  const { colors } = useTheme();
  const { user } = useAuth();
  const refreshing = store.isLoading;
  
  // Get data with memoization - but still after all hooks
  const jobWithPayPeriods = React.useMemo(() => {
    if (!id || typeof id !== 'string') return undefined;
    try {
      return store.getJobWithPayPeriods(id);
    } catch (error) {
      console.error('Error getting job with pay periods:', error);
      return undefined;
    }
  }, [store, id]);
  
  const job = React.useMemo(() => {
    if (!id || typeof id !== 'string') return undefined;
    try {
      return jobWithPayPeriods || store.getJobById(id);
    } catch (error) {
      console.error('Error getting job:', error);
      return undefined;
    }
  }, [jobWithPayPeriods, store, id]);
  
  const timeEntries = React.useMemo(() => {
    if (!id || typeof id !== 'string') return [];
    try {
      const entries = store.getTimeEntriesForJob(id);
      return Array.isArray(entries) ? entries.filter(Boolean) : [];
    } catch (error) {
      console.error('Error getting time entries:', error);
      return [];
    }
  }, [store, id]);
  
  const activeEntry = React.useMemo(() => {
    if (!id || typeof id !== 'string') return undefined;
    try {
      return store.getActiveTimeEntry(id);
    } catch (error) {
      console.error('Error getting active time entry:', error);
      return undefined;
    }
  }, [store, id]);
  
  useEffect(() => {
    if (activeEntry) {
      setActiveEntryState(activeEntry);
    } else {
      setActiveEntryState(null);
    }
  }, [activeEntry]);
  
  // Check if we should show error states
  const isInvalidId = !id || typeof id !== 'string';
  const isJobNotFound = !isInvalidId && !job;
  
  // Calculate total duration and earnings with overtime support
  const calculateTotalStats = React.useCallback(() => {
    if (!timeEntries || timeEntries.length === 0 || !job) return { totalDuration: 0, totalEarnings: 0 };
    
    let totalDuration = 0;
    let totalEarnings = 0;
    
    timeEntries.forEach(entry => {
      if (!entry) return;
      
      let entryDuration = 0;
      
      if (entry.endTime) {
        entryDuration = entry.endTime - entry.startTime;
      } else if (entry.endTime === null) {
        entryDuration = Date.now() - entry.startTime;
      }
      
      // Safely calculate break durations
      const breakDuration = entry.breaks && entry.breaks.length > 0 
        ? entry.breaks.reduce((breakTotal, breakItem) => {
            if (!breakItem) return breakTotal;
            if (breakItem.endTime) {
              return breakTotal + (breakItem.endTime - breakItem.startTime);
            } else if (breakItem.endTime === null && entry.isOnBreak) {
              return breakTotal + (Date.now() - breakItem.startTime);
            }
            return breakTotal;
          }, 0) 
        : 0;
      
      const workDuration = Math.max(0, entryDuration - breakDuration);
      totalDuration += workDuration;
      
      // Calculate earnings with overtime support
      if (entry.endTime && job.settings) {
        const durationHours = workDuration / (1000 * 60 * 60);
        const { 
          dailyOvertime, 
          dailyOvertimeThreshold = 8, 
          dailyOvertimeRate = 1.5,
          weeklyOvertime,
          weeklyOvertimeThreshold = 40,
          weeklyOvertimeRate = 1.5
        } = job.settings;
        
        // Daily overtime calculation
        if (dailyOvertime === 'daily' && durationHours > dailyOvertimeThreshold) {
          const straightTimeHours = dailyOvertimeThreshold;
          const overtimeHours = durationHours - dailyOvertimeThreshold;
          
          const straightTimeEarnings = straightTimeHours * job.hourlyRate;
          const overtimeEarnings = overtimeHours * job.hourlyRate * dailyOvertimeRate;
          totalEarnings += straightTimeEarnings + overtimeEarnings;
        }
        // Weekly overtime calculation
        else if (weeklyOvertime === 'weekly') {
          // Get the week boundaries for this entry
          const entryDate = new Date(entry.startTime);
          const weekStart = getStartOfWeek(entryDate, 0); // Sunday start
          const weekEnd = getEndOfWeek(entryDate, 0);
          
          // Get all time entries for this job in the same week
          const weekEntries = timeEntries.filter(e => {
            if (!e.endTime) return false; // Only completed entries
            const eDate = new Date(e.startTime);
            return eDate >= weekStart && eDate <= weekEnd;
          });
          
          // Calculate total hours for the week
          let totalWeekHours = 0;
          weekEntries.forEach(e => {
            if (e.endTime) {
              const eDuration = e.endTime - e.startTime;
              const eBreakDuration = e.breaks?.reduce((total, breakItem) => {
                if (breakItem?.endTime) {
                  return total + (breakItem.endTime - breakItem.startTime);
                }
                return total;
              }, 0) || 0;
              const eWorkDuration = Math.max(0, eDuration - eBreakDuration);
              totalWeekHours += eWorkDuration / (1000 * 60 * 60);
            }
          });
          
          // Check if weekly overtime threshold is exceeded
          if (totalWeekHours > weeklyOvertimeThreshold) {
            // Calculate how much of this entry contributes to overtime
            const entryOvertimeHours = Math.max(0, Math.min(durationHours, totalWeekHours - weeklyOvertimeThreshold));
            const entryStraightTimeHours = durationHours - entryOvertimeHours;
            
            const entryStraightTimeEarnings = entryStraightTimeHours * job.hourlyRate;
            const entryOvertimeEarnings = entryOvertimeHours * job.hourlyRate * weeklyOvertimeRate;
            totalEarnings += entryStraightTimeEarnings + entryOvertimeEarnings;
          } else {
            // No overtime for this entry
            totalEarnings += durationHours * job.hourlyRate;
          }
        }
        // No overtime
        else {
          totalEarnings += durationHours * job.hourlyRate;
        }
      } else if (!entry.endTime) {
        // For active entries, calculate without overtime for now
        const durationHours = workDuration / (1000 * 60 * 60);
        totalEarnings += durationHours * job.hourlyRate;
      }
    });
    
    return { totalDuration, totalEarnings };
  }, [timeEntries, job]);
  
  const { totalDuration, totalEarnings } = calculateTotalStats();
  
  // Get paid/unpaid earnings from jobWithPayPeriods
  const paidEarnings = jobWithPayPeriods?.paidEarnings || 0;
  const unpaidEarnings = Math.max(0, totalEarnings - paidEarnings);
  const paidDuration = jobWithPayPeriods?.paidDuration || 0;
  const payPeriods = jobWithPayPeriods?.payPeriods || [];
  
  const handleClockIn = React.useCallback(() => {
    if (!id) return;
    try {
      store.clockIn(id);
    } catch (error) {
      console.error('Error clocking in:', error);
    }
  }, [store, id]);
  
  const handleClockOut = React.useCallback(() => {
    try {
      if (activeEntry) {
        store.clockOut(activeEntry.id);
      }
    } catch (error) {
      console.error('Error clocking out:', error);
    }
  }, [store, activeEntry]);
  
  const handleStartBreak = React.useCallback(() => {
    try {
      if (activeEntry) {
        store.startBreak(activeEntry.id);
      }
    } catch (error) {
      console.error('Error starting break:', error);
    }
  }, [store, activeEntry]);
  
  const handleEndBreak = React.useCallback(() => {
    try {
      if (activeEntry) {
        store.endBreak(activeEntry.id);
      }
    } catch (error) {
      console.error('Error ending break:', error);
    }
  }, [store, activeEntry]);
  
  const handleCustomStartTime = React.useCallback((timestamp: number) => {
    if (!id) return;
    try {
      store.clockIn(id, '', timestamp);
    } catch (error) {
      console.error('Error with custom start time:', error);
    }
  }, [store, id]);
  
  const handleCustomEndTime = React.useCallback((timestamp: number) => {
    try {
      if (activeEntry) {
        store.clockOut(activeEntry.id, timestamp);
      }
    } catch (error) {
      console.error('Error with custom end time:', error);
    }
  }, [store, activeEntry]);
  
  const handleCustomBreakStart = React.useCallback((timestamp: number) => {
    try {
      if (activeEntry) {
        store.startBreak(activeEntry.id, timestamp);
      }
    } catch (error) {
      console.error('Error with custom break start:', error);
    }
  }, [store, activeEntry]);
  
  const handleEditJob = React.useCallback(() => {
    if (!id) return;
    router.push(`/job/edit/${id}`);
  }, [router, id]);
  
  const handleDeleteJob = React.useCallback(() => {
    if (!job || !id) return;
    
    Alert.alert(
      "Delete Job",
      "Are you sure you want to delete this job and all its time entries? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => {
            try {
              // Navigate away first, then delete
              router.replace('/(tabs)/jobs');
              setTimeout(() => {
                store.deleteJob(id);
              }, 100);
            } catch (error) {
              console.error('Error deleting job:', error);
            }
          },
          style: "destructive"
        }
      ]
    );
  }, [store, id, router, job]);
  
  const handleAddTimeEntry = React.useCallback(() => {
    if (!id) return;
    router.push(`/time-entry/new/${id}`);
  }, [router, id]);
  
  const handleCreateInvoice = React.useCallback(() => {
    Alert.alert(
      "Coming Soon",
      "Invoice functionality will be available in a future update.",
      [{ text: "OK" }]
    );
  }, []);
  
  const handleEditTimeEntry = React.useCallback((entryId: string) => {
    router.push(`/(tabs)/time-entry/edit/${entryId}`);
  }, [router]);
  
  const handleDeleteTimeEntry = React.useCallback((entryId: string) => {
    Alert.alert(
      "Delete Time Entry",
      "Are you sure you want to delete this time entry? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => {
            try {
              store.deleteTimeEntry(entryId);
            } catch (error) {
              console.error('Error deleting time entry:', error);
            }
          },
          style: "destructive"
        }
      ]
    );
  }, [store]);
  
  const handleTogglePaidStatus = React.useCallback((period: PayPeriod) => {
    try {
      if (period.isPaid) {
        Alert.alert(
          "Mark as Unpaid",
          "Are you sure you want to mark this period as unpaid?",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            { 
              text: "Mark as Unpaid", 
              onPress: () => store.markPayPeriodAsUnpaid(period.id)
            }
          ]
        );
      } else {
        store.markPayPeriodAsPaid(period.id);
      }
    } catch (error) {
      console.error('Error toggling paid status:', error);
    }
  }, [store]);
  
  const onRefresh = React.useCallback(async () => {
    try {
      if (user?.id) {
        await store.refreshFromSupabase(user.id);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [store, user?.id]);
  
  // Calculate current session info if active
  const getCurrentSessionInfo = React.useCallback(() => {
    if (!activeEntryState || !job) return null;
    
    const now = Date.now();
    let sessionStart = activeEntryState.startTime;
    let sessionDuration = 0;
    
    if (activeEntryState.isOnBreak) {
      // Find the last break that's still active
      const activeBreak = activeEntryState.breaks && activeEntryState.breaks.length > 0 
        ? activeEntryState.breaks.find((b) => b?.endTime === null)
        : null;
        
      if (activeBreak) {
        const breakStartTime = activeBreak.startTime;
        return {
          label: `on break since ${formatTime(breakStartTime)}`,
          duration: 0,
          earnings: 0
        };
      }
    }
    
    // Calculate duration excluding breaks
    let totalBreakDuration = 0;
    if (activeEntryState.breaks && activeEntryState.breaks.length > 0) {
      activeEntryState.breaks.forEach((breakItem) => {
        if (!breakItem) return;
        if (breakItem.endTime) {
          totalBreakDuration += (breakItem.endTime - breakItem.startTime);
        } else if (activeEntryState.isOnBreak) {
          totalBreakDuration += (now - breakItem.startTime);
        }
      });
    }
    
    sessionDuration = now - sessionStart - totalBreakDuration;
    const sessionEarnings = (sessionDuration / (1000 * 60 * 60)) * job.hourlyRate;
    
    return {
      label: `since ${formatTime(sessionStart)}`,
      duration: sessionDuration,
      earnings: sessionEarnings
    };
  }, [activeEntryState, job]);
  
  const sessionInfo = getCurrentSessionInfo();
  
  const handleBackPress = React.useCallback(() => {
    // Navigate directly to the jobs tab using the correct path
    router.push('/(tabs)/jobs');
  }, [router]);
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RENDERING
  // Use conditional rendering in JSX instead of early returns
  
  const styles = createStyles(colors);
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: isInvalidId ? "Invalid Job" : isJobNotFound ? "Job Not Found" : (job?.title || 'Job Details'),
          headerRight: () => (
            !isInvalidId && !isJobNotFound ? (
              <TouchableOpacity 
                onPress={handleEditJob}
                style={styles.headerButton}
              >
                <Edit size={20} color={colors.primary} />
              </TouchableOpacity>
            ) : null
          ),
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleBackPress}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerShown: true,
          gestureEnabled: false, // Disable default swipe gesture to prevent job-to-job navigation
        }}
      />
      
      {isInvalidId ? (
        <EmptyState
          title="Invalid Job"
          message="No job ID provided"
          actionLabel="Go Back"
          onAction={() => router.push('/(tabs)/jobs')}
        />
      ) : isJobNotFound ? (
        <EmptyState
          title="Job not found"
          message="The job you're looking for doesn't exist"
          actionLabel="Go Back"
          onAction={() => router.push('/(tabs)/jobs')}
        />
      ) : (
        <View style={styles.container}>
          <ScrollView 
            style={styles.scrollContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {job && (
              <>
                <View style={styles.header}>
                  <View style={[styles.colorIndicator, { backgroundColor: job.color }]} />
                  <View style={styles.headerContent}>
                    <Text style={styles.client}>{job.client}</Text>
                    <Text style={styles.rate}>{formatCurrency(job.hourlyRate, taxSettings.currency, taxSettings.currencySymbol)}/hr</Text>
                    <Text style={styles.date}>
                      Created on {formatDateFull(job.createdAt)}
                    </Text>
                  </View>
                </View>
                
                {activeEntryState && sessionInfo && (
                  <View style={styles.activeSessionContainer}>
                    <Text style={styles.activeSessionLabel}>{sessionInfo.label}</Text>
                    <View style={styles.activeSessionStats}>
                      <Text style={styles.activeSessionDuration}>
                        {formatDuration(sessionInfo.duration)}
                      </Text>
                      <Text style={styles.activeSessionEarnings}>
                        {formatCurrency(sessionInfo.earnings, taxSettings.currency, taxSettings.currencySymbol)}
                      </Text>
                    </View>
                  </View>
                )}
                
                {!activeEntryState ? (
                  <View style={styles.clockButtonsContainer}>
                    <TouchableOpacity 
                      style={styles.clockInButton}
                      onPress={handleClockIn}
                    >
                      <Text style={styles.clockButtonText}>Clock In Now</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.startAtButton}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.clockButtonText}>Start At...</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.activeButtonsContainer}>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity 
                        style={styles.clockOutButton}
                        onPress={handleClockOut}
                      >
                        <Text style={styles.clockButtonText}>Clock Out Now</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.stopAtButton}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Text style={styles.clockButtonText}>Stop At...</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.buttonRow}>
                      {!activeEntryState.isOnBreak ? (
                        <>
                          <TouchableOpacity 
                            style={styles.breakButton}
                            onPress={handleStartBreak}
                          >
                            <Text style={styles.clockButtonText}>Start Break Now</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={styles.breakAtButton}
                            onPress={() => setShowBreakStartPicker(true)}
                          >
                            <Text style={styles.clockButtonText}>Break At...</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity 
                          style={styles.resumeButton}
                          onPress={handleEndBreak}
                        >
                          <Text style={styles.clockButtonText}>End Break</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Clock size={20} color={colors.primary} />
                    <Text style={styles.statValue}>{formatDuration(totalDuration)}</Text>
                    <Text style={styles.statLabel}>Total Time</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Coins size={20} color={colors.primary} />
                    <Text style={styles.statValue}>{formatCurrency(totalEarnings, taxSettings.currency, taxSettings.currencySymbol)}</Text>
                    <Text style={styles.statLabel}>Total Earnings</Text>
                  </View>
                </View>
                
                {/* Paid/Unpaid Earnings Section */}
                <View style={styles.earningsContainer}>
                  <View style={styles.earningsHeader}>
                    <Text style={styles.earningsTitle}>Earnings Status</Text>
                    <TouchableOpacity 
                      style={styles.viewPeriodsButton}
                      onPress={() => setShowPayPeriods(!showPayPeriods)}
                    >
                      <Text style={styles.viewPeriodsText}>
                        {showPayPeriods ? 'Hide Periods' : 'View Periods'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.earningsCards}>
                    <View style={[styles.earningsCard, styles.paidCard]}>
                      <CheckCircle size={20} color={colors.success} />
                      <Text style={styles.earningsValue}>{formatCurrency(paidEarnings, taxSettings.currency, taxSettings.currencySymbol)}</Text>
                      <Text style={styles.earningsLabel}>Paid</Text>
                      <Text style={styles.earningsDuration}>
                        {formatDuration(paidDuration)}
                      </Text>
                    </View>
                    
                    <View style={[styles.earningsCard, styles.unpaidCard]}>
                      <AlertCircle size={20} color={colors.warning} />
                      <Text style={styles.earningsValue}>{formatCurrency(unpaidEarnings, taxSettings.currency, taxSettings.currencySymbol)}</Text>
                      <Text style={styles.earningsLabel}>Unpaid</Text>
                      <Text style={styles.earningsDuration}>
                        {formatDuration(totalDuration - paidDuration)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Pay Periods Section */}
                  {showPayPeriods && (
                    <View style={styles.payPeriodsContainer}>
                      <Text style={styles.payPeriodsTitle}>Pay Periods</Text>
                      
                      {payPeriods.length > 0 ? (
                        payPeriods.map((period) => (
                          period ? (
                            <PayPeriodCard
                              key={period.id}
                              period={period}
                              onTogglePaid={() => handleTogglePaidStatus(period)}
                            />
                          ) : null
                        ))
                      ) : (
                        <EmptyState
                          title="No pay periods"
                          message="Complete time entries to generate pay periods"
                          icon={<Calendar size={40} color={colors.inactive} />}
                        />
                      )}
                    </View>
                  )}
                </View>
                
                <View style={styles.actionsContainer}>
                  <TouchableOpacity 
                    style={styles.createInvoiceButton}
                    onPress={handleCreateInvoice}
                  >
                    <FileText size={20} color="#FFFFFF" />
                    <Text style={styles.createInvoiceText}>Create Invoice</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.timeEntriesContainer}>
                  <View style={styles.timeEntriesHeader}>
                    <Text style={styles.timeEntriesTitle}>Time Entries</Text>
                    <TouchableOpacity 
                      style={styles.addEntryButton}
                      onPress={handleAddTimeEntry}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.addEntryButtonText}>Add Entry</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {timeEntries.length > 0 ? (
                    timeEntries.map((entry) => (
                      entry ? (
                        <TimeEntryCard
                          key={entry.id}
                          entry={entry}
                          job={job}
                          onEdit={() => handleEditTimeEntry(entry.id)}
                          onDelete={() => handleDeleteTimeEntry(entry.id)}
                        />
                      ) : null
                    ))
                  ) : (
                    <EmptyState
                      title="No time entries"
                      message="Start tracking time for this job by clocking in or adding a manual entry"
                      actionLabel="Add Entry"
                      onAction={handleAddTimeEntry}
                      icon={<Calendar size={40} color={colors.inactive} />}
                    />
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      )}
      
      <TimePickerModal
        visible={showStartTimePicker}
        onClose={() => setShowStartTimePicker(false)}
        onConfirm={handleCustomStartTime}
        title="Select Start Time"
      />
      
      <TimePickerModal
        visible={showEndTimePicker}
        onClose={() => setShowEndTimePicker(false)}
        onConfirm={handleCustomEndTime}
        title="Select End Time"
      />
      
      <TimePickerModal
        visible={showBreakStartPicker}
        onClose={() => setShowBreakStartPicker(false)}
        onConfirm={handleCustomBreakStart}
        title="Select Break Start Time"
      />
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContainer: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: 16,
  },
  colorIndicator: {
    width: 8,
    borderRadius: 4,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  client: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  rate: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: colors.subtext,
  },
  activeSessionContainer: {
    backgroundColor: colors.background,
    padding: 16,
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeSessionLabel: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: 4,
  },
  activeSessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activeSessionDuration: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  activeSessionEarnings: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  clockButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    marginTop: 1,
  },
  activeButtonsContainer: {
    padding: 16,
    backgroundColor: colors.background,
    marginTop: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  clockInButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  startAtButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  clockOutButton: {
    flex: 1,
    backgroundColor: '#FF5252',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  stopAtButton: {
    flex: 1,
    backgroundColor: '#FF5252',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  breakButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  breakAtButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clockButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.subtext,
  },
  earningsContainer: {
    padding: 16,
    backgroundColor: colors.background,
    marginTop: 1,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  viewPeriodsButton: {
    padding: 4,
  },
  viewPeriodsText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  earningsCards: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  earningsCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  paidCard: {
    backgroundColor: colors.success + '10', // 10% opacity
  },
  unpaidCard: {
    backgroundColor: colors.warning + '10', // 10% opacity
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: 4,
  },
  earningsDuration: {
    fontSize: 12,
    color: colors.subtext,
  },
  payPeriodsContainer: {
    marginTop: 16,
  },
  payPeriodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  actionsContainer: {
    padding: 16,
    backgroundColor: colors.background,
    marginTop: 1,
  },
  createInvoiceButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
  },
  createInvoiceText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  timeEntriesContainer: {
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  timeEntriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeEntriesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addEntryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 14,
  },
});