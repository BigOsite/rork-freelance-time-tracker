import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { FileText } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface InvoiceCardProps {
  onPress: () => void;
}

export default function InvoiceCard({ onPress }: InvoiceCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        <FileText size={24} color={Colors.light.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>Invoice functionality will be available in a future update.</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.subtext,
  },
});