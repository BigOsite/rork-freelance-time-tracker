import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, CheckCircle, Play, Square, MapPin, Tag, MoreVertical } from 'lucide-react-native';
import { JobWithDuration } from '@/types';
import { formatDuration } from '@/utils/time';
import { formatCurrency } from '@/utils/helpers';
import { useBusinessStore } from '@/store/businessStore';
import { useTheme } from '@/contexts/ThemeContext';

type JobCardProps = {
  job: JobWithDuration;
  onClockIn?: () => void;
  onClockOut?: () => void;
  onDelete?: () => void;
  paidEarnings?: number;
};

export default function JobCard({ 
  job, 
  onClockIn, 
  onClockOut, 
  onDelete, 
  paidEarnings = 0,
}: JobCardProps) {
  const router = useRouter();
  const { taxSettings } = useBusinessStore();
  const { colors } = useTheme();
  
  const { name, client, hourlyRate, color, totalDuration, isActive, id, settings } = job;
  
  const earnings = (totalDuration / (1000 * 60 * 60)) * hourlyRate;
  const hasPaidEarnings = paidEarnings > 0;
  
  // Extract tags and location from settings with proper type checking
  const tags = settings?.tags?.filter((tag: string) => tag.trim()) || [];
  const location = settings?.location?.trim();
  const hasTagsOrLocation = tags.length > 0 || !!location;
  

  
  const handlePress = React.useCallback(() => {
    if (!id) return;
    router.push(`/job/${id}`);
  }, [id, router]);
  
  const handleClockAction = React.useCallback((e: any) => {
    e.stopPropagation();
    
    try {
      if (isActive && onClockOut) {
        onClockOut();
      } else if (!isActive && onClockIn) {
        onClockIn();
      }
    } catch (error) {
      console.error('Error with clock action:', error);
    }
  }, [isActive, onClockIn, onClockOut]);
  
  const handleOptions = React.useCallback(() => {
    if (onDelete) {
      Alert.alert(
        "Job Options",
        "Choose an action",
        [
          {
            text: "Delete Job",
            onPress: () => {
              Alert.alert(
                "Delete Job",
                `Are you sure you want to delete "${name}"? This will also delete all time entries and cannot be undone.`,
                [
                  {
                    text: "Cancel",
                    style: "cancel"
                  },
                  { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: onDelete
                  }
                ]
              );
            },
            style: "destructive"
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    }
  }, [name, onDelete]);

  const renderTagsAndLocation = () => {
    if (!hasTagsOrLocation) return null;

    return (
      <View style={styles.metaContainer}>
        {location && (
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.subtext} />
            <Text style={[styles.metaText, { color: colors.subtext }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}
        {tags.length > 0 && (
          <View style={styles.metaItem}>
            <Tag size={14} color={colors.subtext} />
            <Text style={[styles.metaText, { color: colors.subtext }]} numberOfLines={1}>
              {tags.join(', ')}
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  const styles = createStyles(colors);


  
  return (
    <TouchableOpacity 
      style={[styles.container, isActive && styles.activeContainer]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.colorIndicator, { backgroundColor: color || colors.primary }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.title} numberOfLines={1}>{name || 'Untitled Job'}</Text>
            <Text style={styles.client} numberOfLines={1}>{client || 'No Client'}</Text>
            {renderTagsAndLocation()}
          </View>
          <View style={styles.headerRight}>
            {isActive && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active</Text>
              </View>
            )}
            {onDelete && (
              <TouchableOpacity 
                style={[styles.optionsButton, { backgroundColor: colors.surface }]} 
                onPress={handleOptions}
              >
                <MoreVertical size={18} color={colors.subtext} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Clock size={16} color={colors.subtext} />
            <Text style={styles.statText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {formatDuration(totalDuration || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {formatCurrency(earnings || 0, taxSettings.currency, taxSettings.currencySymbol)}
            </Text>
          </View>
          {hasPaidEarnings && (
            <View style={styles.statItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={[styles.statText, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {formatCurrency(paidEarnings, taxSettings.currency, taxSettings.currencySymbol)}
              </Text>
            </View>
          )}
        </View>
        
        {(onClockIn || onClockOut) && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isActive ? styles.clockOutButton : styles.clockInButton
            ]}
            onPress={handleClockAction}
          >
            {isActive ? (
              <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
            )}
            <Text style={styles.actionButtonText}>
              {isActive ? 'Clock Out' : 'Clock In'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 12,
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeContainer: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
  },
  colorIndicator: {
    width: 6,
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  client: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
    marginBottom: 8,
  },
  metaContainer: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  activeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 80,
  },
  statText: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
    flexShrink: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  clockInButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
  },
  clockOutButton: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  optionsButton: {
    padding: 8,
    borderRadius: 10,
  },
});