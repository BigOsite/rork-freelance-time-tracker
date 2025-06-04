import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Coins, Briefcase, Plus, Timer, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react-native';
import { useJobsStore } from '@/store/jobsStore';
import { useBusinessStore } from '@/store/businessStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration } from '@/utils/time';
import { formatCurrency } from '@/utils/helpers';
import StatCard from '@/components/StatCard';
import JobCard from '@/components/JobCard';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  
  // Get store methods and data
  const store = useJobsStore();
  const { taxSettings } = useBusinessStore();
  
  // Get data with error handling and memoization
  const jobs = React.useMemo(() => {
    try {
      const allJobs = store.getJobsWithStats();
      return Array.isArray(allJobs) ? allJobs.filter(Boolean) : [];
    } catch (error) {
      console.error('Error getting jobs with stats:', error);
      return [];
    }
  }, [store]);
  
  const activeJobs = React.useMemo(() => {
    try {
      const allActiveJobs = store.getActiveJobs();
      return Array.isArray(allActiveJobs) ? allActiveJobs.filter(Boolean) : [];
    } catch (error) {
      console.error('Error getting active jobs:', error);
      return [];
    }
  }, [store]);
  
  const totalEarnings = React.useMemo(() => {
    try {
      return store.getTotalEarnings() || 0;
    } catch (error) {
      console.error('Error getting total earnings:', error);
      return 0;
    }
  }, [store]);
  
  const totalHours = React.useMemo(() => {
    try {
      return store.getTotalHours() || 0;
    } catch (error) {
      console.error('Error getting total hours:', error);
      return 0;
    }
  }, [store]);
  
  // Calculate total paid and unpaid earnings
  const totalPaidEarnings = React.useMemo(() => {
    try {
      return Array.isArray(store.payPeriods) ? store.payPeriods
        .filter(period => period && period.isPaid)
        .reduce((total, period) => total + (period?.totalEarnings || 0), 0) : 0;
    } catch (error) {
      console.error('Error calculating paid earnings:', error);
      return 0;
    }
  }, [store.payPeriods]);
  
  const totalUnpaidEarnings = React.useMemo(() => {
    return Math.max(0, totalEarnings - totalPaidEarnings);
  }, [totalEarnings, totalPaidEarnings]);
  
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
  
  // Generate personalized greeting
  const greeting = React.useMemo(() => {
    if (isAuthenticated && user?.displayName) {
      return `Good morning, ${user.displayName}`;
    }
    return 'Good morning';
  }, [isAuthenticated, user?.displayName]);
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Just simulate a refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  const handleClockIn = React.useCallback((jobId: string) => {
    try {
      if (jobId) {
        store.clockIn(jobId);
      }
    } catch (error) {
      console.error('Error clocking in:', error);
    }
  }, [store]);
  
  const handleClockOut = React.useCallback((jobId: string, entryId?: string) => {
    try {
      if (entryId) {
        store.clockOut(entryId);
      }
    } catch (error) {
      console.error('Error clocking out:', error);
    }
  }, [store]);
  
  const navigateToNewJob = React.useCallback(() => {
    router.push('/job/new');
  }, [router]);
  
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={navigateToNewJob}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Earnings" 
            value={formatCurrency(totalEarnings, taxSettings.currency, taxSettings.currencySymbol)}
            icon={<Coins size={24} color={colors.primary} />}
            style={styles.statCard}
          />
          <StatCard 
            title="Total Hours" 
            value={formatDuration(totalHours * 60 * 60 * 1000)}
            icon={<Clock size={24} color={colors.accent} />}
            color={colors.accent}
            style={styles.statCard}
          />
          <StatCard 
            title="Active Jobs" 
            value={activeJobs.length.toString()}
            icon={<Timer size={24} color={colors.success} />}
            color={colors.success}
            style={styles.statCard}
          />
          <StatCard 
            title="Total Jobs" 
            value={jobs.length.toString()}
            icon={<Briefcase size={24} color={colors.warning} />}
            color={colors.warning}
            style={styles.statCard}
          />
        </View>
        
        {/* Earnings Status Section */}
        <View style={styles.earningsSection}>
          <Text style={styles.sectionTitle}>Earnings Overview</Text>
          <View style={styles.earningsCards}>
            <View style={[styles.earningsCard, styles.paidCard]}>
              <View style={styles.earningsIconContainer}>
                <CheckCircle size={24} color={colors.success} />
              </View>
              <View style={styles.earningsContent}>
                <Text style={styles.earningsValue}>
                  {formatCurrency(totalPaidEarnings, taxSettings.currency, taxSettings.currencySymbol)}
                </Text>
                <Text style={styles.earningsLabel}>Paid</Text>
              </View>
            </View>
            
            <View style={[styles.earningsCard, styles.unpaidCard]}>
              <View style={styles.earningsIconContainer}>
                <AlertCircle size={24} color={colors.warning} />
              </View>
              <View style={styles.earningsContent}>
                <Text style={styles.earningsValue}>
                  {formatCurrency(totalUnpaidEarnings, taxSettings.currency, taxSettings.currencySymbol)}
                </Text>
                <Text style={styles.earningsLabel}>Unpaid</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Jobs</Text>
            {activeJobs.length > 0 && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>{activeJobs.length} running</Text>
              </View>
            )}
          </View>
          {activeJobs.length > 0 ? (
            activeJobs.map((job) => (
              job ? (
                <JobCard 
                  key={job.id} 
                  job={job}
                  onClockOut={() => handleClockOut(job.id, job.activeEntryId)}
                  paidEarnings={jobPaidEarnings[job.id] || 0}
                  showSwipeToDelete={false}
                />
              ) : null
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Timer size={32} color={colors.inactive} />
              <Text style={styles.emptyStateText}>No active jobs</Text>
              <Text style={styles.emptyStateSubtext}>
                Start tracking time by clocking in on a job
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Jobs</Text>
            <TouchableOpacity onPress={() => router.push('/jobs')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {jobs.length > 0 ? (
            jobs
              .slice(0, 3)
              .map((job) => (
                job ? (
                  <JobCard 
                    key={job.id} 
                    job={job}
                    onClockIn={() => handleClockIn(job.id)}
                    onClockOut={() => handleClockOut(job.id, job.activeEntryId)}
                    paidEarnings={jobPaidEarnings[job.id] || 0}
                    showSwipeToDelete={false}
                  />
                ) : null
              ))
          ) : (
            <EmptyState
              title="No jobs yet"
              message="Add your first job to start tracking time"
              actionLabel="Add Job"
              onAction={navigateToNewJob}
              icon={<Briefcase size={40} color={colors.inactive} />}
            />
          )}
        </View>
      </ScrollView>
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
  greeting: {
    fontSize: 16,
    color: colors.subtext,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
  },
  earningsSection: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  earningsCards: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  earningsCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  paidCard: {
    backgroundColor: colors.success + '10',
  },
  unpaidCard: {
    backgroundColor: colors.warning + '10',
  },
  earningsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  earningsContent: {
    flex: 1,
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.2,
    flexShrink: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
    numberOfLines: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  activeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyStateContainer: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
});