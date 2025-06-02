import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Switch, 
  Alert, 
  ScrollView,
  Modal,
  Share,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Moon, 
  Bell, 
  Trash2, 
  ChevronRight, 
  Briefcase,
  DollarSign,
  CreditCard,
  MessageCircle,
  Star,
  Share2,
  Settings as SettingsIcon,
  User,
  Shield,
  X
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useJobsStore } from '@/store/jobsStore';
import { useBusinessStore } from '@/store/businessStore';
import { useInvoiceStore } from '@/store/invoiceStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  
  const resetJobsData = useJobsStore(state => state.resetAllData);
  const resetBusinessData = useBusinessStore(state => state.resetAllData);
  const resetInvoiceData = useInvoiceStore(state => state.resetAllData);
  const submitAppRating = useBusinessStore(state => state.submitAppRating);
  const getLatestRating = useBusinessStore(state => state.getLatestRating);
  
  const handleResetData = () => {
    Alert.alert(
      "Reset All Data",
      "Are you sure you want to delete all jobs and time entries? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Reset", 
          onPress: () => {
            // Reset all stores
            resetJobsData();
            resetBusinessData();
            resetInvoiceData();
            
            Alert.alert("Data Reset", "All data has been reset successfully.");
          },
          style: "destructive"
        }
      ]
    );
  };

  const navigateToProfile = () => {
    router.push('/settings/account');
  };

  const navigateToBusinessInfo = () => {
    router.push('/settings/business-info');
  };

  const navigateToTaxCurrency = () => {
    router.push('/settings/tax-currency');
  };

  const navigateToPaymentOptions = () => {
    router.push('/settings/payment-options');
  };

  const navigateToSupport = () => {
    router.push('/settings/support');
  };

  const handleRateApp = () => {
    setShowRatingModal(true);
  };

  const handleSubmitRating = () => {
    if (selectedRating > 0) {
      submitAppRating(selectedRating);
      setShowRatingModal(false);
      setSelectedRating(0);
      Alert.alert("Thank You!", "Thanks for your feedback! Your rating helps us improve the app.");
    }
  };

  const handleShareApp = async () => {
    try {
      const shareOptions = {
        message: "Check out this amazing time tracking app! It helps me manage my work hours and generate professional invoices. Perfect for freelancers and small businesses!",
        url: Platform.select({
          ios: "https://apps.apple.com/app/time-tracker-invoice",
          android: "https://play.google.com/store/apps/details?id=com.timetracker.invoice",
          default: "https://timetracker-invoice.app"
        }),
        title: "Time Tracker & Invoice App"
      };

      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared via specific activity (iOS)
          console.log('Shared via:', result.activityType);
        } else {
          // Shared successfully (Android)
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // Share dialog was dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert(
        "Share Failed",
        "Unable to share the app at this time. Please try again later.",
        [{ text: "OK" }]
      );
    }
  };

  const renderStarRating = () => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setSelectedRating(star)}
            style={styles.starButton}
          >
            <Star
              size={40}
              color={star <= selectedRating ? colors.warning : colors.inactive}
              fill={star <= selectedRating ? colors.warning : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const latestRating = getLatestRating();
  
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <SettingsIcon size={32} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your preferences</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={navigateToProfile}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                <User size={22} color={colors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Profile</Text>
                <Text style={styles.settingDescription}>
                  {isAuthenticated && user 
                    ? `Signed in as ${user.displayName || user.email}`
                    : 'Sign in to sync your data'
                  }
                </Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <ChevronRight size={20} color={colors.subtext} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
                <Shield size={22} color={colors.success} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Privacy & Security</Text>
                <Text style={styles.settingDescription}>Control your data and privacy</Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <ChevronRight size={20} color={colors.subtext} />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Business Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={navigateToBusinessInfo}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
                <Briefcase size={22} color={colors.success} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Business Information</Text>
                <Text style={styles.settingDescription}>Company details and branding</Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <ChevronRight size={20} color={colors.subtext} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={navigateToTaxCurrency}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.warning + '15' }]}>
                <DollarSign size={22} color={colors.warning} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Tax & Currency</Text>
                <Text style={styles.settingDescription}>Financial settings and rates</Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <ChevronRight size={20} color={colors.subtext} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={navigateToPaymentOptions}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#EC489915' }]}>
                <CreditCard size={22} color="#EC4899" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Payment Options</Text>
                <Text style={styles.settingDescription}>Configure payment methods</Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <ChevronRight size={20} color={colors.subtext} />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.accentLight }]}>
                <Moon size={22} color={colors.accent} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Switch to dark theme</Text>
              </View>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: colors.inactive, true: colors.primary }}
                thumbColor="#FFFFFF"
                style={styles.switch}
              />
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#3B82F615' }]}>
                <Bell size={22} color="#3B82F6" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingDescription}>Manage app notifications</Text>
              </View>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.inactive, true: colors.primary }}
                thumbColor="#FFFFFF"
                style={styles.switch}
              />
            </View>
          </View>
        </View>
        
        {/* Support & Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Feedback</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={navigateToSupport}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#2563EB15' }]}>
                <MessageCircle size={22} color="#2563EB" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Customer Support</Text>
                <Text style={styles.settingDescription}>Get help and report issues</Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <ChevronRight size={20} color={colors.subtext} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleRateApp}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.warning + '15' }]}>
                <Star size={22} color={colors.warning} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Rate App</Text>
                <Text style={styles.settingDescription}>
                  {latestRating 
                    ? `You rated us ${latestRating.rating} star${latestRating.rating !== 1 ? 's' : ''}`
                    : 'Share your experience'
                  }
                </Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <ChevronRight size={20} color={colors.subtext} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleShareApp}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
                <Share2 size={22} color={colors.success} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Share App</Text>
                <Text style={styles.settingDescription}>Tell others about this app</Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <ChevronRight size={20} color={colors.subtext} />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleResetData}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.danger + '15' }]}>
                <Trash2 size={22} color={colors.danger} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: colors.danger }]}>Reset All Data</Text>
                <Text style={styles.settingDescription}>Permanently delete all data</Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <ChevronRight size={20} color={colors.subtext} />
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>Made with ❤️ for productivity</Text>
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Our App</Text>
              <TouchableOpacity
                onPress={() => setShowRatingModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              How would you rate your experience with our app?
            </Text>
            
            {renderStarRating()}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { opacity: selectedRating > 0 ? 1 : 0.5 }
                ]}
                onPress={handleSubmitRating}
                disabled={selectedRating === 0}
              >
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              </TouchableOpacity>
            </View>
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
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.background,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    letterSpacing: -0.4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  chevronContainer: {
    padding: 8,
  },
  switchContainer: {
    padding: 8,
  },
  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  footer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  footerText: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
    letterSpacing: -0.05,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  starButton: {
    padding: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.subtext,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});