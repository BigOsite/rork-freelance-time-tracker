import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { AlertCircle, RefreshCw, CheckCircle, Wifi, WifiOff } from 'lucide-react-native';
import { useServerHealth } from '@/hooks/useServerHealth';

export function ConnectionBanner() {
  // Don't render the connection banner
  return null;
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