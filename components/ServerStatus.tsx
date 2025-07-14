import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { useServerHealth } from '@/hooks/useServerHealth';

interface ServerStatusProps {
  onRetry?: () => void;
}

export function ServerStatus({ onRetry }: ServerStatusProps) {
  const { isOnline, isChecking, error, checkHealth } = useServerHealth();

  const handleRetry = () => {
    checkHealth();
    onRetry?.();
  };

  if (isOnline) {
    return null; // Don't show anything when server is online
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <WifiOff size={20} color="#ef4444" />
        <Text style={styles.text}>Server unavailable</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={handleRetry}
          disabled={isChecking}
        >
          <RefreshCw 
            size={16} 
            color="#6366f1" 
            style={isChecking ? styles.spinning : undefined}
          />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  retryText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '500',
  },
  spinning: {
    // Add rotation animation if needed
  },
});