import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Colors from '@/constants/colors';

export default function InvoicePreview() {
  return (
    <View style={styles.container}>
      <View style={styles.comingSoonContainer}>
        <Text style={styles.comingSoonTitle}>Coming Soon</Text>
        <Text style={styles.comingSoonText}>
          Invoice functionality will be available in a future update.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonContainer: {
    padding: 24,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 16,
    color: Colors.light.subtext,
    textAlign: 'center',
  },
});