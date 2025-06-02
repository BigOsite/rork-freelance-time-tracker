import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Clock, Calendar, MoreVertical, CheckCircle, Pause, Zap } from 'lucide-react-native';
import { TimeEntry, Job } from '@/types';
import { formatTime, formatDate, formatDuration, calculateEarnings, getStartOfWeek, getEndOfWeek } from '@/utils/time';
import { formatCurrency } from '@/utils/helpers';
import { useBusinessStore } from '@/store/businessStore';
import { useJobsStore } from '@/store/jobsStore';
import { useTheme } from '@/contexts/ThemeContext';

type TimeEntryCardProps = {
  entry: TimeEntry;
  job: Job;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function TimeEntryCard({ entry, job, onEdit, onDelete }: TimeEntryCardProps) {
  const { taxSettings } = useBusinessStore();
  const { getTimeEntriesForJob } = useJobsStore();
  const { colors } = useTheme();
  
  if (!entry || !job) {
    return null;
  }

  const { startTime, endTime, note, breaks = [], paidInPeriodId } = entry;
  
  // Calculate total break duration
  const totalBreakDuration = Array.isArray(breaks) ? breaks.reduce((total, breakItem) => {
    if (!breakItem) return total;
    
    if (breakItem.endTime) {
      return total + (breakItem.endTime - breakItem.startTime);
    } else if (entry.isOnBreak) {
      return total + (Date.now() - breakItem.startTime);
    }
    return total;
  }, 0) : 0;
  
  // Calculate work duration excluding breaks
  const rawDuration = endTime ? endTime - startTime : Date.now() - startTime;
  const duration = Math.max(0, rawDuration - totalBreakDuration);
  
  const isPaid = !!paidInPeriodId;
  
  // Calculate overtime breakdown
  const calculateOvertimeBreakdown = () => {
    if (!endTime || !job.settings) return null;
    
    const durationHours = duration / (1000 * 60 * 60);
    const { 
      dailyOvertime, 
      dailyOvertimeThreshold = 8, 
      dailyOvertimeRate = 1.5,
      weeklyOvertime,
      weeklyOvertimeThreshold = 40,
      weeklyOvertimeRate = 1.5
    } = job.settings;
    
    // Daily overtime calculation (existing logic)
    if (dailyOvertime === 'daily' && durationHours > dailyOvertimeThreshold) {
      const straightTimeHours = dailyOvertimeThreshold;
      const overtimeHours = durationHours - dailyOvertimeThreshold;
      
      const straightTimeEarnings = straightTimeHours * job.hourlyRate;
      const overtimeEarnings = overtimeHours * job.hourlyRate * dailyOvertimeRate;
      const totalEarnings = straightTimeEarnings + overtimeEarnings;
      
      return {
        type: 'daily',
        totalHours: durationHours,
        straightTimeHours,
        overtimeHours,
        straightTimeEarnings,
        overtimeEarnings,
        totalEarnings,
        overtimeRate: dailyOvertimeRate
      };
    }
    
    // Weekly overtime calculation (new logic)
    if (weeklyOvertime === 'weekly') {
      // Get the week boundaries for this entry
      const entryDate = new Date(startTime);
      const weekStart = getStartOfWeek(entryDate, 0); // Sunday start
      const weekEnd = getEndOfWeek(entryDate, 0);
      
      // Get all time entries for this job in the same week
      const allJobEntries = getTimeEntriesForJob(job.id);
      const weekEntries = allJobEntries.filter(e => {
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
        const straightTimeHours = Math.min(weeklyOvertimeThreshold, totalWeekHours - durationHours) + 
                                 Math.min(durationHours, Math.max(0, weeklyOvertimeThreshold - (totalWeekHours - durationHours)));
        const overtimeHours = Math.max(0, totalWeekHours - weeklyOvertimeThreshold);
        
        // For this specific entry, calculate the portion that's overtime
        const entryOvertimeHours = Math.max(0, Math.min(durationHours, totalWeekHours - weeklyOvertimeThreshold));
        const entryStraightTimeHours = durationHours - entryOvertimeHours;
        
        const entryStraightTimeEarnings = entryStraightTimeHours * job.hourlyRate;
        const entryOvertimeEarnings = entryOvertimeHours * job.hourlyRate * weeklyOvertimeRate;
        const entryTotalEarnings = entryStraightTimeEarnings + entryOvertimeEarnings;
        
        return {
          type: 'weekly',
          totalHours: durationHours,
          straightTimeHours: entryStraightTimeHours,
          overtimeHours: entryOvertimeHours,
          straightTimeEarnings: entryStraightTimeEarnings,
          overtimeEarnings: entryOvertimeEarnings,
          totalEarnings: entryTotalEarnings,
          overtimeRate: weeklyOvertimeRate,
          weeklyTotalHours: totalWeekHours,
          weeklyThreshold: weeklyOvertimeThreshold
        };
      }
    }
    
    return null;
  };
  
  const overtimeBreakdown = calculateOvertimeBreakdown();
  const earnings = overtimeBreakdown ? overtimeBreakdown.totalEarnings : calculateEarnings(job.hourlyRate || 0, duration);
  
  // Format break information if there are breaks
  const renderBreakInfo = React.useCallback(() => {
    if (!Array.isArray(breaks) || breaks.length === 0) return null;
    
    const totalBreakFormatted = formatDuration(totalBreakDuration);
    
    return (
      <View style={styles.breakInfo}>
        <Pause size={14} color={colors.warning} />
        <Text style={[styles.breakText, { color: colors.warning }]}>
          {breaks.length} break{breaks.length !== 1 ? 's' : ''} ({totalBreakFormatted})
        </Text>
      </View>
    );
  }, [breaks, totalBreakDuration, colors.warning]);
  
  const renderOvertimeBreakdown = () => {
    if (!overtimeBreakdown) return null;
    
    const isWeekly = overtimeBreakdown.type === 'weekly';
    
    return (
      <View style={[styles.overtimeBreakdown, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '20' }]}>
        <View style={styles.overtimeHeader}>
          <Zap size={16} color={colors.warning} />
          <Text style={[styles.overtimeTitle, { color: colors.warning }]}>
            {isWeekly ? 'Weekly Overtime Breakdown' : 'Overtime Breakdown'}
          </Text>
        </View>
        
        {isWeekly && (
          <View style={styles.overtimeRow}>
            <Text style={[styles.overtimeLabel, { color: colors.text }]}>Week Total:</Text>
            <Text style={[styles.overtimeValue, { color: colors.text }]}>
              {overtimeBreakdown.weeklyTotalHours?.toFixed(1)}h (threshold: {overtimeBreakdown.weeklyThreshold}h)
            </Text>
          </View>
        )}
        
        <View style={styles.overtimeRow}>
          <Text style={[styles.overtimeLabel, { color: colors.text }]}>Entry Hours:</Text>
          <Text style={[styles.overtimeValue, { color: colors.text }]}>{overtimeBreakdown.totalHours.toFixed(1)}h</Text>
        </View>
        <View style={styles.overtimeRow}>
          <Text style={[styles.overtimeLabel, { color: colors.text }]}>Straight Time:</Text>
          <Text style={[styles.overtimeValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {overtimeBreakdown.straightTimeHours.toFixed(1)}h @ {formatCurrency(job.hourlyRate, taxSettings.currency, taxSettings.currencySymbol)}/hr = {formatCurrency(overtimeBreakdown.straightTimeEarnings, taxSettings.currency, taxSettings.currencySymbol)}
          </Text>
        </View>
        <View style={styles.overtimeRow}>
          <Text style={[styles.overtimeLabel, { color: colors.text }]}>Overtime ({overtimeBreakdown.overtimeRate}x):</Text>
          <Text style={[styles.overtimeValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {overtimeBreakdown.overtimeHours.toFixed(1)}h @ {formatCurrency(job.hourlyRate * overtimeBreakdown.overtimeRate, taxSettings.currency, taxSettings.currencySymbol)}/hr = {formatCurrency(overtimeBreakdown.overtimeEarnings, taxSettings.currency, taxSettings.currencySymbol)}
          </Text>
        </View>
        <View style={[styles.overtimeRow, styles.overtimeTotalRow, { borderTopColor: colors.warning + '30' }]}>
          <Text style={[styles.overtimeTotalLabel, { color: colors.text }]}>Total Earned:</Text>
          <Text style={[styles.overtimeTotalValue, { color: colors.warning }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {formatCurrency(overtimeBreakdown.totalEarnings, taxSettings.currency, taxSettings.currencySymbol)}
          </Text>
        </View>
      </View>
    );
  };
  
  const handleOptions = React.useCallback(() => {
    if (onEdit || onDelete) {
      Alert.alert(
        "Time Entry Options",
        "Choose an action",
        [
          onEdit ? {
            text: "Edit Entry",
            onPress: onEdit
          } : null,
          onDelete ? {
            text: "Delete Entry",
            onPress: onDelete,
            style: "destructive"
          } : null,
          {
            text: "Cancel",
            style: "cancel"
          }
        ].filter(Boolean) as any
      );
    }
  }, [onEdit, onDelete]);
  
  const styles = createStyles(colors);
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isPaid && styles.paidContainer,
        overtimeBreakdown && styles.overtimeContainer
      ]} 
      activeOpacity={0.7}
      onPress={handleOptions}
    >
      <View style={[styles.colorIndicator, { backgroundColor: job.color || colors.primary }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.timeInfo}>
            <View style={styles.timeRow}>
              <Clock size={16} color={colors.subtext} />
              <Text style={styles.timeText}>
                {formatTime(startTime)} - {endTime ? formatTime(endTime) : 'Now'}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <Calendar size={16} color={colors.subtext} />
              <Text style={styles.dateText}>{formatDate(startTime)}</Text>
            </View>
            {renderBreakInfo()}
          </View>
          <View style={styles.earningsContainer}>
            <Text style={styles.durationText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {formatDuration(duration)}
            </Text>
            <Text style={styles.earningsText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {formatCurrency(earnings, taxSettings.currency, taxSettings.currencySymbol)}
            </Text>
            {overtimeBreakdown && (
              <View style={[styles.overtimeIndicator, { backgroundColor: colors.warning + '20' }]}>
                <Zap size={12} color={colors.warning} />
                <Text style={[styles.overtimeIndicatorText, { color: colors.warning }]}>
                  {overtimeBreakdown.type === 'weekly' ? 'WOT' : 'OT'}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {note && note.trim() ? (
          <View style={[styles.noteContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.noteText, { color: colors.text }]} numberOfLines={2}>{note.trim()}</Text>
          </View>
        ) : null}
        
        {renderOvertimeBreakdown()}
        
        <View style={styles.footer}>
          {isPaid && (
            <View style={[styles.paidBadge, { backgroundColor: colors.success + '15' }]}>
              <CheckCircle size={14} color={colors.success} />
              <Text style={[styles.paidText, { color: colors.success }]}>Paid</Text>
            </View>
          )}
          
          {(onEdit || onDelete) && (
            <TouchableOpacity style={[styles.optionsButton, { backgroundColor: colors.surface }]} onPress={handleOptions}>
              <MoreVertical size={18} color={colors.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  paidContainer: {
    backgroundColor: colors.success + '05',
    borderColor: colors.success + '20',
  },
  overtimeContainer: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  colorIndicator: {
    width: 6,
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeInfo: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
  },
  breakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakText: {
    fontSize: 13,
    fontWeight: '500',
  },
  earningsContainer: {
    alignItems: 'flex-end',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  earningsText: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
    marginTop: 2,
    flexShrink: 1,
  },
  overtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    gap: 2,
  },
  overtimeIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noteContainer: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  overtimeBreakdown: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  overtimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  overtimeTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  overtimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  overtimeLabel: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  overtimeValue: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
  overtimeTotalRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 6,
  },
  overtimeTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  overtimeTotalValue: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  paidText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionsButton: {
    padding: 8,
    borderRadius: 10,
  },
});