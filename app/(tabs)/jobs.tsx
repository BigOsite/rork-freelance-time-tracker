import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Briefcase, Search, Filter, X, Check } from 'lucide-react-native';
import { useJobsStore } from '@/store/jobsStore';
import { useAuth } from '@/contexts/AuthContext';
import JobCard from '@/components/JobCard';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';
import { JobWithDuration } from '@/types';

type SortOption = 'dateNewest' | 'dateOldest' | 'titleAZ' | 'titleZA' | 'clientAZ' | 'clientZA';

export default function JobsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('dateNewest');
  
  // Get store instance
  const store = useJobsStore();
  const refreshing = store.isLoading;
  
  const allJobs = React.useMemo(() => {
    try {
      const allJobs = store.getJobsWithStats();
      if (!Array.isArray(allJobs)) return [];
      
      return allJobs.filter(Boolean);
    } catch (error) {
      console.error('Error getting jobs:', error);
      return [];
    }
  }, [store]);
  
  // Filter jobs based on search query
  const filteredJobs = React.useMemo(() => {
    if (!searchQuery.trim()) return allJobs;
    
    const query = searchQuery.toLowerCase().trim();
    return allJobs.filter(job => {
      if (!job) return false;
      
      // Safely handle undefined/null values for title and client
      const title = (job.title || '').toLowerCase();
      const client = (job.client || '').toLowerCase();
      
      const titleMatch = title.includes(query);
      const clientMatch = client.includes(query);
      
      return titleMatch || clientMatch;
    });
  }, [allJobs, searchQuery]);
  
  // Sort filtered jobs
  const jobs = React.useMemo(() => {
    const jobsToSort = [...filteredJobs];
    
    switch (sortOption) {
      case 'dateNewest':
        return jobsToSort.sort((a, b) => {
          // Sort active jobs first, then by creation date (newest first)
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return b.createdAt - a.createdAt;
        });
      case 'dateOldest':
        return jobsToSort.sort((a, b) => {
          // Sort active jobs first, then by creation date (oldest first)
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return a.createdAt - b.createdAt;
        });
      case 'titleAZ':
        return jobsToSort.sort((a, b) => {
          // Sort active jobs first, then by title A-Z
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return (a.title || '').localeCompare(b.title || '');
        });
      case 'titleZA':
        return jobsToSort.sort((a, b) => {
          // Sort active jobs first, then by title Z-A
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return (b.title || '').localeCompare(a.title || '');
        });
      case 'clientAZ':
        return jobsToSort.sort((a, b) => {
          // Sort active jobs first, then by client A-Z
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return (a.client || '').localeCompare(b.client || '');
        });
      case 'clientZA':
        return jobsToSort.sort((a, b) => {
          // Sort active jobs first, then by client Z-A
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return (b.client || '').localeCompare(a.client || '');
        });
      default:
        return jobsToSort;
    }
  }, [filteredJobs, sortOption]);
  
  // Pre-calculate paid earnings for all jobs to avoid state updates during render
  const jobPaidEarnings = React.useMemo(() => {
    const earnings: Record<string, number> = {};
    jobs.forEach(job => {
      if (job && job.id) {
        try {
          earnings[job.id] = store.getPaidEarningsForJob(job.id) || 0;
        } catch (error) {
          console.error('Error getting paid earnings for job:', error);
          earnings[job.id] = 0;
        }
      }
    });
    return earnings;
  }, [jobs, store]);
  
  const handleClockIn = React.useCallback((jobId: string) => {
    try {
      if (jobId) {
        store.clockIn(jobId);
      }
    } catch (error) {
      console.error('Error clocking in:', error);
    }
  }, [store]);
  
  const handleClockOut = React.useCallback((job: JobWithDuration) => {
    try {
      if (job.activeEntryId) {
        store.clockOut(job.activeEntryId);
      }
    } catch (error) {
      console.error('Error clocking out:', error);
    }
  }, [store]);
  
  const handleDeleteJob = React.useCallback((jobId: string) => {
    try {
      if (jobId) {
        // Delete the job immediately - no navigation needed since we're already on the jobs list
        store.deleteJob(jobId);
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  }, [store]);
  
  const navigateToNewJob = React.useCallback(() => {
    router.push('/job/new');
  }, [router]);
  
  const onRefresh = React.useCallback(async () => {
    try {
      if (user?.uid) {
        // Enhanced pull-to-refresh: First upload local changes, then download remote data
        console.log('Starting enhanced pull-to-refresh sync...');
        
        // Step 1: Process any pending local changes (upload to Supabase)
        await store.processSyncQueue(user.uid);
        
        // Step 2: Fetch and merge latest data from Supabase
        await store.syncWithSupabase(user.uid);
        
        console.log('Enhanced pull-to-refresh sync completed successfully');
      }
    } catch (error) {
      console.error('Error during enhanced refresh:', error);
    }
  }, [store, user?.uid]);
  
  const handleSearchPress = React.useCallback(() => {
    setShowSearchBar(!showSearchBar);
    if (showSearchBar) {
      setSearchQuery('');
    }
  }, [showSearchBar]);
  
  const handleSortPress = React.useCallback(() => {
    setShowSortModal(true);
  }, []);
  
  const handleSortSelect = React.useCallback((option: SortOption) => {
    setSortOption(option);
    setShowSortModal(false);
  }, []);
  
  const sortOptions = [
    { label: 'Date Created (Newest First)', value: 'dateNewest' as SortOption },
    { label: 'Date Created (Oldest First)', value: 'dateOldest' as SortOption },
    { label: 'Job Title (A-Z)', value: 'titleAZ' as SortOption },
    { label: 'Job Title (Z-A)', value: 'titleZA' as SortOption },
    { label: 'Client Name (A-Z)', value: 'clientAZ' as SortOption },
    { label: 'Client Name (Z-A)', value: 'clientZA' as SortOption },
  ];
  
  const renderItem = React.useCallback(({ item }: { item: JobWithDuration }) => {
    if (!item) return null;
    
    return (
      <JobCard 
        job={item}
        onClockIn={() => handleClockIn(item.id)}
        onClockOut={() => handleClockOut(item)}
        onDelete={() => handleDeleteJob(item.id)}
        paidEarnings={jobPaidEarnings[item.id] || 0}
        showSwipeToDelete={true}
      />
    );
  }, [handleClockIn, handleClockOut, handleDeleteJob, jobPaidEarnings]);
  
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Jobs</Text>
            <Text style={styles.subtitle}>
              {searchQuery ? `${jobs.length} of ${allJobs.length} jobs` : `${jobs.length} total jobs`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                showSearchBar && styles.searchButtonActive
              ]}
              onPress={handleSearchPress}
            >
              <Search size={20} color={showSearchBar ? colors.primary : colors.subtext} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton} onPress={handleSortPress}>
              <Filter size={20} color={colors.subtext} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={navigateToNewJob}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {showSearchBar && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by job title or client name..."
              placeholderTextColor={colors.placeholder}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <X size={16} color={colors.subtext} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      
      {jobs.length > 0 ? (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item?.id || ''}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          {searchQuery ? (
            <EmptyState
              title="No jobs found"
              message={`No jobs match "${searchQuery}". Try a different search term.`}
              actionLabel="Clear Search"
              onAction={() => setSearchQuery('')}
              icon={<Search size={48} color={colors.inactive} />}
            />
          ) : (
            <EmptyState
              title="No jobs yet"
              message="Add your first job to start tracking time and managing your work"
              actionLabel="Create Job"
              onAction={navigateToNewJob}
              icon={<Briefcase size={48} color={colors.inactive} />}
            />
          )}
        </View>
      )}
      
      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Jobs</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <X size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.sortOptions}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.sortOption}
                  onPress={() => handleSortSelect(option.value)}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortOption === option.value && styles.sortOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {sortOption === option.value && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchButtonActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  searchContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  sortOptions: {
    maxHeight: 400,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortOptionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});