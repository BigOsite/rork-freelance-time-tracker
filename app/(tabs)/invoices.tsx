import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import Colors from '@/constants/colors';
import EmptyState from '@/components/EmptyState';

export default function InvoicesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
      </View>
      
      <EmptyState
        title="Coming Soon"
        message="Invoice functionality will be available in a future update."
        icon={<FileText size={40} color={Colors.light.inactive} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
});