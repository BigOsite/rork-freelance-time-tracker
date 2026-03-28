import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import EmptyState from '@/components/EmptyState';
import { FileText } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function InvoiceDetailScreen() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <EmptyState
        title="Coming Soon"
        message="Invoice functionality will be available in a future update."
        actionLabel="Go Back"
        onAction={() => router.back()}
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
});