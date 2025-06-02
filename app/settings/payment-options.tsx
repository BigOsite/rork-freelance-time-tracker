import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image,
  ScrollView
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/colors';

export default function PaymentOptionsScreen() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ChevronLeft size={24} color={Colors.light.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyStateCard}>
          <EmptyState
            message="Payment options functionality will be available in a future update."
            actionLabel="Go Back"
            onAction={() => router.back()}
            icon={
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1589758438368-0ad531db3366?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' }} 
                  style={styles.comingSoonImage}
                />
              </View>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  headerButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  imageContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  comingSoonImage: {
    width: 180,
    height: 180,
    borderRadius: 24,
  },
});