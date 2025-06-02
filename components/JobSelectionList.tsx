import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  FlatList,
  SafeAreaView
} from 'react-native';
import { X } from 'lucide-react-native';
import { Job } from '@/types';
import Colors from '@/constants/colors';

type JobSelectionListProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
  onClose: () => void;
};

export default function JobSelectionList({ 
  jobs, 
  onSelect, 
  onClose 
}: JobSelectionListProps) {
  
  const safeJobs = Array.isArray(jobs) ? jobs.filter(Boolean) : [];
  
  const renderJobItem = ({ item }: { item: Job }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity
        style={styles.jobItem}
        onPress={() => onSelect(item)}
      >
        <View style={[styles.colorIndicator, { backgroundColor: item.color || Colors.light.primary }]} />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title || 'Untitled Job'}</Text>
          <Text style={styles.jobClient}>{item.client || 'No Client'}</Text>
        </View>
        <Text style={styles.jobRate}>${item.hourlyRate || 0}/hr</Text>
      </TouchableOpacity>
    );
  };
  
  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Job</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={safeJobs}
            renderItem={renderJobItem}
            keyExtractor={(item) => item?.id || ''}
            contentContainerStyle={styles.jobsList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No jobs available</Text>
              </View>
            }
          />
          
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  jobsList: {
    marginBottom: 20,
  },
  jobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 4,
  },
  jobClient: {
    fontSize: 14,
    color: Colors.light.subtext,
  },
  jobRate: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primary,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.light.subtext,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '500',
  },
});