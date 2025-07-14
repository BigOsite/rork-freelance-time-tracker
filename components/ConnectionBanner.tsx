import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react-native';
import { useServerHealth } from '@/hooks/useServerHealth';

export function ConnectionBanner() {
  const { isOnline, isChecking, error, checkHealth } = useServerHealth();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <AlertCircle size={20} color="#f59e0b" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Server Connection Issue</Text>
          <Text style={styles.subtitle}>
            Using offline mode. Your data will sync when connection is restored.
          </Text>
          {error && (
            <Text style={styles.error}>Error: {error}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={checkHealth}
          disabled={isChecking}
        >
          <RefreshCw 
            size={16} 
            color="#6366f1" 
            style={[styles.icon, isChecking && styles.spinning]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
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
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#a16207',
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    color: '#dc2626',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  retryButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  icon: {
    // Base icon styles
  },
  spinning: {
    // Add rotation animation if needed
    opacity: 0.6,
  },
});