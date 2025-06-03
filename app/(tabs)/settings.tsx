import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Building2, 
  CreditCard, 
  Calculator, 
  User, 
  Sparkles, 
  Crown, 
  MessageCircle, 
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  
  const settingsGroups = [
    {
      title: 'Business',
      items: [
        {
          icon: Building2,
          title: 'Business Information',
          subtitle: 'Company details and contact info',
          route: '/settings/business-info',
        },
        {
          icon: CreditCard,
          title: 'Payment Options',
          subtitle: 'Configure payment methods',
          route: '/settings/payment-options',
        },
        {
          icon: Calculator,
          title: 'Tax & Currency',
          subtitle: 'Tax rates and currency settings',
          route: '/settings/tax-currency',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: User,
          title: 'Profile',
          subtitle: user ? `Signed in as ${user.displayName}` : 'Sign in to sync data',
          route: '/settings/profile',
        },
      ],
    },
    {
      title: 'App',
      items: [
        {
          icon: isDark ? Sun : Moon,
          title: 'Theme',
          subtitle: isDark ? 'Switch to light mode' : 'Switch to dark mode',
          onPress: toggleTheme,
        },
        {
          icon: Sparkles,
          title: "What's New",
          subtitle: 'Latest features and updates',
          route: '/settings/whats-new',
        },
        {
          icon: Crown,
          title: 'Upgrade to Pro',
          subtitle: 'Unlock premium features',
          route: '/settings/upgrade',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: MessageCircle,
          title: 'Customer Support',
          subtitle: 'Get help and send feedback',
          route: '/settings/support',
        },
      ],
    },
  ];
  
  const handleItemPress = (item: any) => {
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      router.push(item.route);
    }
  };
  
  const styles = createStyles(colors);
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupContent}>
              {group.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex === group.items.length - 1 && styles.lastItem,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingIcon}>
                    <item.icon size={24} color={colors.primary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{item.title}</Text>
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                  </View>
                  {!item.onPress && (
                    <ChevronRight size={20} color={colors.subtext} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Freelance Time Tracker v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Made with ❤️ for freelancers and contractors
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 32,
    letterSpacing: -0.8,
  },
  group: {
    marginBottom: 32,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.subtext,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
  },
});