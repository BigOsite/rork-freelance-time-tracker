import React, { useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Animated, 
  PanResponder,
  Dimensions,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, CheckCircle, Play, Square, Trash2, MapPin, Tag } from 'lucide-react-native';
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
  showSwipeToDelete?: boolean;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 50;
const DELETE_BUTTON_WIDTH = 80;

export default function JobCard({ 
  job, 
  onClockIn, 
  onClockOut, 
  onDelete, 
  paidEarnings = 0,
  showSwipeToDelete = true 
}: JobCardProps) {
  const router = useRouter();
  const { taxSettings } = useBusinessStore();
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  
  if (!job) {
    return null;
  }
  
  const { title, client, hourlyRate, color, totalDuration, isActive, id, settings } = job;
  
  const earnings = (totalDuration / (1000 * 60 * 60)) * hourlyRate;
  const hasPaidEarnings = paidEarnings > 0;
  
  // Extract tags and location from settings with proper type checking
  const tags = settings?.tags?.filter((tag: string) => tag.trim()) || [];
  const location = settings?.location?.trim();
  const hasTagsOrLocation = tags.length > 0 || !!location;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes and only if delete is enabled
        if (!showSwipeToDelete || !onDelete) {
          return false;
        }
        // Reduced threshold for more responsive gesture recognition
        const shouldRespond = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && 
               Math.abs(gestureState.dx) > 5;
        return shouldRespond;
      },
      onPanResponderGrant: () => {
        // Immediately reset any previous swipe state for instant responsiveness
        setIsSwipeActive(false);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow left swipe (negative dx)
        if (gestureState.dx < 0) {
          const newValue = Math.max(gestureState.dx, -DELETE_BUTTON_WIDTH);
          translateX.setValue(newValue);
          
          // Set swipe active only when meaningfully moving
          if (!isSwipeActive && Math.abs(gestureState.dx) > 8) {
            setIsSwipeActive(true);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Immediately reset swipe active state for instant responsiveness
        setIsSwipeActive(false);
        
        // Use velocity for more natural feel
        const velocity = Math.abs(gestureState.vx);
        const shouldReveal = gestureState.dx < -SWIPE_THRESHOLD || velocity > 0.5;
        
        if (shouldReveal && gestureState.dx < 0) {
          // Swipe threshold met, show delete button with improved animation
          Animated.spring(translateX, {
            toValue: -DELETE_BUTTON_WIDTH,
            useNativeDriver: true,
            tension: 300,
            friction: 8,
            velocity: gestureState.vx,
          }).start();
        } else {
          // Reset to original position with smooth animation
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 8,
            velocity: gestureState.vx,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // Ensure state is reset if gesture is interrupted
        setIsSwipeActive(false);
      },
    })
  ).current;
  
  const handlePress = React.useCallback(() => {
    if (id && !isSwipeActive) {
      // Reset swipe position before navigating
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }).start(() => {
        router.push(`/job/${id}`);
      });
    }
  }, [id, router, isSwipeActive, translateX]);
  
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
  
  const handleDelete = React.useCallback(() => {
    Alert.alert(
      "Delete Job",
      `Are you sure you want to delete "${title}"? This will also delete all time entries and cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            // Reset swipe position with smooth animation
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 300,
              friction: 8,
            }).start();
          }
        },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            if (onDelete) {
              onDelete();
            }
          }
        }
      ]
    );
  }, [title, onDelete, translateX]);

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
  
  // If swipe to delete is disabled or no delete handler, render simple card
  if (!showSwipeToDelete || !onDelete) {
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
              <Text style={styles.title} numberOfLines={1}>{title || 'Untitled Job'}</Text>
              <Text style={styles.client} numberOfLines={1}>{client || 'No Client'}</Text>
              {renderTagsAndLocation()}
            </View>
            {isActive && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active</Text>
              </View>
            )}
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
  
  return (
    <View style={styles.cardContainer}>
      {/* Delete Button (behind the card) */}
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Trash2 size={20} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
      
      {/* Main Card */}
      <Animated.View
        style={[
          styles.cardWrapper,
          { transform: [{ translateX }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={[styles.container, isActive && styles.activeContainer]} 
          onPress={handlePress}
          activeOpacity={0.7}
          disabled={isSwipeActive}
        >
          <View style={[styles.colorIndicator, { backgroundColor: color || colors.primary }]} />
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleSection}>
                <Text style={styles.title} numberOfLines={1}>{title || 'Untitled Job'}</Text>
                <Text style={styles.client} numberOfLines={1}>{client || 'No Client'}</Text>
                {renderTagsAndLocation()}
              </View>
              {isActive && (
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Active</Text>
                </View>
              )}
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
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  cardContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  cardWrapper: {
    width: '100%',
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: -40, // Extended further left beneath the card
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH + 60, // Wider to ensure full coverage
    justifyContent: 'center',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  deleteButton: {
    backgroundColor: colors.danger,
    width: DELETE_BUTTON_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // Square off left corners, keep right corners rounded
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    // Enhanced shadow for depth effect
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  container: {
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
});