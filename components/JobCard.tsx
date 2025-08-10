import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Animated, 
  PanResponder,
  Alert,
  LayoutChangeEvent,
  Platform
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
  openJobId?: string | null;
  onRequestOpen?: (id: string) => void;
  onRequestClose?: () => void;
};

const DELETE_BUTTON_MIN_INTERACTABLE_PCT = 0.28 as const;
const OPEN_THRESHOLD_PCT = 0.35 as const;
const DELETE_BUTTON_WIDTH = 80;

export default function JobCard({ 
  job, 
  onClockIn, 
  onClockOut, 
  onDelete, 
  paidEarnings = 0,
  showSwipeToDelete = true,
  openJobId = null,
  onRequestOpen,
  onRequestClose,
}: JobCardProps) {
  const router = useRouter();
  const { taxSettings } = useBusinessStore();
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSwipeActive, setIsSwipeActive] = useState<boolean>(false);
  const [cardWidth, setCardWidth] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const openThreshold = useMemo(() => (cardWidth > 0 ? cardWidth * OPEN_THRESHOLD_PCT : 120), [cardWidth]);
  const interactableThreshold = useMemo(() => (cardWidth > 0 ? cardWidth * DELETE_BUTTON_MIN_INTERACTABLE_PCT : 96), [cardWidth]);
  
  const { name, client, hourlyRate, color, totalDuration, isActive, id, settings } = job;
  
  const earnings = (totalDuration / (1000 * 60 * 60)) * hourlyRate;
  const hasPaidEarnings = paidEarnings > 0;
  
  // Extract tags and location from settings with proper type checking
  const tags = settings?.tags?.filter((tag: string) => tag.trim()) || [];
  const location = settings?.location?.trim();
  const hasTagsOrLocation = tags.length > 0 || !!location;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        if (!showSwipeToDelete || !onDelete) return false;
        const dx = Math.abs(gestureState.dx);
        const dy = Math.abs(gestureState.dy);
        const shouldRespond = dx > dy && dx > 5;
        return shouldRespond;
      },
      onPanResponderGrant: () => {
        setIsSwipeActive(false);
        if (onRequestOpen && id) {
          onRequestOpen(id);
        }
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dx < 0) {
          const newValue = Math.max(gestureState.dx, -Math.max(DELETE_BUTTON_WIDTH, interactableThreshold));
          translateX.setValue(newValue);
          if (!isSwipeActive && Math.abs(gestureState.dx) > 10) {
            setIsSwipeActive(true);
          }
        } else {
          translateX.setValue(0);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        setIsSwipeActive(false);
        const distance = Math.abs(gestureState.dx);
        const shouldOpen = gestureState.dx < 0 && distance >= openThreshold;
        if (shouldOpen) {
          Animated.spring(translateX, {
            toValue: -Math.max(DELETE_BUTTON_WIDTH, interactableThreshold),
            useNativeDriver: true,
            tension: 300,
            friction: 25,
            velocity: gestureState.vx,
          }).start(() => {
            setIsOpen(true);
            if (Platform.OS !== 'web') {
              try {
                import('expo-haptics').then((Haptics) => Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light));
              } catch {}
            }
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 25,
            velocity: gestureState.vx,
          }).start(() => {
            setIsOpen(false);
            if (onRequestClose) onRequestClose();
          });
        }
      },
      onPanResponderTerminate: () => {
        setIsSwipeActive(false);
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 300,
          friction: 25,
        }).start(() => {
          setIsOpen(false);
          if (onRequestClose) onRequestClose();
        });
      },
    })
  ).current;
  
  const handlePress = React.useCallback(() => {
    if (!id) return;
    translateX.stopAnimation((value?: number) => {
      const openNow = (value ?? 0) <= -1;
      if (openNow) {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 300,
          friction: 20,
        }).start(() => {
          setIsOpen(false);
          if (onRequestClose) onRequestClose();
        });
        return;
      }
      if (!isSwipeActive) {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 300,
          friction: 20,
        }).start(() => {
          router.push(`/job/${id}`);
        });
      }
    });
  }, [id, router, isSwipeActive, translateX, onRequestClose]);
  
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
      `Are you sure you want to delete "${name}"? This will also delete all time entries and cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 300,
              friction: 20,
            }).start(() => {
              setIsOpen(false);
              if (onRequestClose) onRequestClose();
            });
          }
        },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== 'web') {
              try {
                import('expo-haptics').then((Haptics) => Haptics.notificationAsync?.(Haptics.NotificationFeedbackType?.Success));
              } catch {}
            }
            if (onDelete) {
              onDelete();
            }
          }
        }
      ]
    );
  }, [name, onDelete, translateX, onRequestClose]);

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

  const onCardLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== cardWidth) setCardWidth(w);
  };

  useEffect(() => {
    if (openJobId && openJobId !== id && isOpen) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }).start(() => {
        setIsOpen(false);
      });
    }
    if (!openJobId && isOpen) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }).start(() => setIsOpen(false));
    }
  }, [openJobId, id, isOpen, translateX]);
  
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
              <Text style={styles.title} numberOfLines={1}>{name || 'Untitled Job'}</Text>
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
      {/* Delete Button Background - positioned to extend under the card */}
      <View style={styles.deleteButtonBackground} testID="jobCard-delete-bg">
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
          testID="jobCard-delete-button"
          accessibilityRole="button"
          accessibilityLabel={`Delete job ${name ?? ''}`}
          disabled={!isOpen}
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
        testID="jobCard-swipeable"
      >
        <TouchableOpacity 
          style={[styles.container, isActive && styles.activeContainer]} 
          onPress={handlePress}
          activeOpacity={0.7}
          disabled={isSwipeActive}
          onLayout={onCardLayout}
        >
          <View style={[styles.colorIndicator, { backgroundColor: color || colors.primary }]} />
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleSection}>
                <Text style={styles.title} numberOfLines={1}>{name || 'Untitled Job'}</Text>
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
    overflow: 'hidden',
    borderRadius: 20,
  },
  cardWrapper: {
    width: '100%',
    borderRadius: 20,
  },
  deleteButtonBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  deleteButton: {
    backgroundColor: colors.danger,
    width: DELETE_BUTTON_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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