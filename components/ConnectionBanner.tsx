import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { AlertCircle, RefreshCw, CheckCircle, Wifi, WifiOff } from 'lucide-react-native';
import { useServerHealth } from '@/hooks/useServerHealth';

export function ConnectionBanner() {
  const { isOnline, isChecking, error, checkHealth } = useServerHealth();
  const [showDetails, setShowDetails] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Show a brief success message when connection is restored
  React.useEffect(() => {
    if (isOnline && !error) {
      // Fade out after showing success briefly
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // Fade in when there's an issue
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, error, fadeAnim]);

  // Don't render if connection is good and fade animation is complete
  // Note: We can't access _value directly in production, so we'll use a state to track visibility
  const [isVisible, setIsVisible] = React.useState(true);
  
  React.useEffect(() => {
    if (isOnline && !error) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2500); // Hide after fade animation completes
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isOnline, error]);
  
  if (!isVisible) {
    return null;
  }

  // Determine the message based on connection status
  let title = 'Connection Issue';
  let subtitle = 'Using offline mode. Your data will sync when connection is restored.';
  let iconColor = '#f59e0b';
  let IconComponent = AlertCircle;
  let backgroundColor = '#fffbeb';
  let borderColor = '#fed7aa';
  
  if (isOnline && !error) {
    title = 'Connection Restored';
    subtitle = 'Your data is now syncing with the server.';
    iconColor = '#10b981';
    IconComponent = CheckCircle;
    backgroundColor = '#f0fdf4';
    borderColor = '#bbf7d0';
  } else if (error === 'No internet connection') {
    title = 'No Internet Connection';
    subtitle = 'Please check your network connection and try again.';
    iconColor = '#ef4444';
    IconComponent = WifiOff;
    backgroundColor = '#fef2f2';
    borderColor = '#fecaca';
  } else if (error?.includes('Server') || error?.includes('timeout')) {
    title = error?.includes('timeout') ? 'Connection Timeout' : 'Server Unavailable';
    subtitle = 'The server is temporarily unavailable. Using offline mode.';
    iconColor = '#f59e0b';
    IconComponent = Wifi;
  } else if (error?.includes('Network')) {
    title = 'Network Error';
    subtitle = 'Having trouble connecting. Your data will sync when connection improves.';
    iconColor = '#f59e0b';
    IconComponent = WifiOff;
  }

  return (
    <Animated.View style={[styles.banner, { backgroundColor, borderBottomColor: borderColor, opacity: fadeAnim }]}>
      <TouchableOpacity 
        style={styles.content} 
        onPress={() => setShowDetails(!showDetails)}
        activeOpacity={0.7}
      >
        <IconComponent size={20} color={iconColor} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: iconColor === '#10b981' ? '#065f46' : '#92400e' }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: iconColor === '#10b981' ? '#047857' : '#a16207' }]}>{subtitle}</Text>
          {showDetails && error && error !== 'No internet connection' && (
            <Text style={styles.error}>Details: {error}</Text>
          )}
          {showDetails && (
            <Text style={styles.hint}>Tap to {showDetails ? 'hide' : 'show'} details • Pull to refresh</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={(e) => {
            e.stopPropagation();
            checkHealth();
          }}
          disabled={isChecking}
        >
          <RefreshCw 
            size={16} 
            color={isOnline ? "#10b981" : "#6366f1"} 
            style={[styles.icon, isChecking && styles.spinning]}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    color: '#dc2626',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
    backgroundColor: '#fef2f2',
    padding: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  hint: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
  retryButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    // Base icon styles
  },
  spinning: {
    opacity: 0.6,
  },
});