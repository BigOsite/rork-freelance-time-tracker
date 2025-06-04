import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useJobsStore } from '@/store/jobsStore';
import { useAuth } from '@/contexts/AuthContext';
import TimeEntryCard from '@/components/TimeEntryCard';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';

export default function HistoryScreen() {
  const router = useRouter();
  const store = useJobsStore();
  const [filterPaid, setFilterPaid] = useState<boolean | null>(null); // null = all, true = paid, false = unpaid
  const { colors } = useTheme();
  const { user } = useAuth();
  const refreshing = store.isLoading;
  
  // Get all completed time entries (with endTime) sorted by startTime (newest first)
  const completedEntries = React.useMemo(() => {
    try {
      const allEntries = Array.isArray(store.timeEntries) ? store.timeEntries.filter(Boolean) : [];
      return allEntries
        .filter(entry => entry && entry.endTime !== null)
        .filter(entry => filterPaid === null || (filterPaid ? !!entry?.paidInPeriodId : !entry?.paidInPeriodId))
        .sort((a, b) => (b?.startTime || 0) - (a?.startTime || 0));
    } catch (error) {
      console.error('Error filtering time entries:', error);
      return [];
    }
  }, [store.timeEntries, filterPaid]);
  
  const handleEditEntry = React.useCallback((entryId: string) => {
    if (entryId) {
      router.push(`/(tabs)/time-entry/edit/${entryId}`);
    }
  }, [router]);
  
  const handleDeleteEntry = React.useCallback((entryId: string) => {
    Alert.alert(
      "Delete Time Entry",
      "Are you sure you want to delete this time entry? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => {
            try {
              if (entryId) {
                store.deleteTimeEntry(entryId);
              }
            } catch (error) {
              console.error('Error deleting time entry:', error);
            }
          },
          style: "destructive"
        }
      ]
    );
  }, [store]);
  
  const onRefresh = React.useCallback(async () => {
    try {
      if (user?.uid) {
        await store.refreshFromSupabase(user.uid);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [store, user?.uid]);
  
  const renderItem = React.useCallback(({ item }: { item: typeof completedEntries[0] }) => {
    if (!item) return null;
    
    const job = store.getJobById(item.jobId);
    if (!job) return null;
    
    return (
      <TimeEntryCard
        entry={item}
        job={job}
        onEdit={() => handleEditEntry(item.id)}
        onDelete={() => handleDeleteEntry(item.id)}
      />
    );
  }, [store, handleEditEntry, handleDeleteEntry]);
  
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Time History</Text>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterPaid === null && styles.activeFilterButton
            ]}
            onPress={() => setFilterPaid(null)}
          >
            <Text style={[
              styles.filterText,
              filterPaid === null && styles.activeFilterText
            ]}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterPaid === true && styles.paidFilterButton
            ]}
            onPress={() => setFilterPaid(true)}
          >
            <CheckCircle 
              size={14} 
              color={filterPaid === true ? '#FFFFFF' : colors.success} 
              style={styles.filterIcon} 
            />
            <Text style={[
              styles.filterText,
              filterPaid === true && styles.activeFilterText
            ]}>Paid</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterPaid === false && styles.unpaidFilterButton
            ]}
            onPress={() => setFilterPaid(false)}
          >
            <AlertCircle 
              size={14} 
              color={filterPaid === false ? '#FFFFFF' : colors.warning} 
              style={styles.filterIcon} 
            />
            <Text style={[
              styles.filterText,
              filterPaid === false && styles.activeFilterText
            ]}>Unpaid</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {completedEntries.length > 0 ? (
        <FlatList
          data={completedEntries}
          keyExtractor={(item) => item?.id || ''}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        <EmptyState
          title={`No ${filterPaid !== null ? (filterPaid ? 'paid' : 'unpaid') : ''} time entries`}
          message={`${filterPaid !== null ? (filterPaid ? 'Paid' : 'Unpaid') : 'Completed'} time entries will appear here`}
          icon={<Clock size={40} color={colors.inactive} />}
        />
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    padding: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
  },
  paidFilterButton: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.2,
  },
  unpaidFilterButton: {
    backgroundColor: colors.warning,
    shadowColor: colors.warning,
    shadowOpacity: 0.2,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontWeight: '600',
    color: colors.text,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
});