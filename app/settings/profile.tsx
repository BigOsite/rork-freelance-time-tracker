import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, User, Mail, Lock, LogOut, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, login, logout } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data: any) => {
      login(data.user, data.token);
      Alert.alert('Success', 'Logged in successfully!');
      setEmail('');
      setPassword('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to log in. Please try again.');
    },
  });
  
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data: any) => {
      login(data.user, data.token);
      Alert.alert('Success', 'Account created successfully!');
      setEmail('');
      setPassword('');
      setDisplayName('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create account. Please try again.');
    },
  });
  
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      logout();
      Alert.alert('Success', 'Logged out successfully!');
    },
    onError: (error: any) => {
      // Even if the server request fails, we should still log out locally
      logout();
      console.warn('Logout error:', error.message);
    },
  });
  
  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (!isLoginMode && !displayName.trim()) {
      Alert.alert('Error', 'Please enter your display name');
      return;
    }
    
    if (isLoginMode) {
      loginMutation.mutate({
        email: email.trim(),
        password: password.trim(),
      });
    } else {
      registerMutation.mutate({
        email: email.trim(),
        password: password.trim(),
        displayName: displayName.trim(),
      });
    }
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: () => logoutMutation.mutate(),
          style: 'destructive'
        }
      ]
    );
  };
  
  const isLoading = loginMutation.isLoading || registerMutation.isLoading || logoutMutation.isLoading;
  
  const styles = createStyles(colors);
  
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen 
        options={{
          title: 'Profile',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {user ? (
          // Logged in state
          <View style={styles.loggedInContainer}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <User size={32} color={colors.primary} />
              </View>
              <Text style={styles.title}>Welcome back!</Text>
              <Text style={styles.subtitle}>You are signed in to your account</Text>
            </View>
            
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userLabel}>Display Name</Text>
                <Text style={styles.userValue}>{user.displayName}</Text>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userLabel}>Email</Text>
                <Text style={styles.userValue}>{user.email}</Text>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userLabel}>User ID</Text>
                <Text style={styles.userValue}>{user.uid}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.logoutButton, { opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <LogOut size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.logoutButtonText}>Sign Out</Text>
                </>
              )}
            </TouchableOpacity>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Data Sync</Text>
              <Text style={styles.infoText}>
                Your data is automatically synced across all your devices when you are signed in.
              </Text>
            </View>
          </View>
        ) : (
          // Not logged in state
          <View style={styles.authContainer}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <UserPlus size={32} color={colors.primary} />
              </View>
              <Text style={styles.title}>
                {isLoginMode ? 'Sign In' : 'Create Account'}
              </Text>
              <Text style={styles.subtitle}>
                {isLoginMode 
                  ? 'Sign in to sync your data across devices' 
                  : 'Create an account to backup and sync your data'
                }
              </Text>
            </View>
            
            <View style={styles.form}>
              {!isLoginMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Display Name</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color={colors.subtext} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your name"
                      placeholderTextColor={colors.placeholder}
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Mail size={20} color={colors.subtext} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color={colors.subtext} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.submitButton, { opacity: isLoading ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isLoginMode ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.switchModeButton}
                onPress={() => {
                  setIsLoginMode(!isLoginMode);
                  setEmail('');
                  setPassword('');
                  setDisplayName('');
                }}
              >
                <Text style={styles.switchModeText}>
                  {isLoginMode 
                    ? "Don't have an account? Create one" 
                    : 'Already have an account? Sign in'
                  }
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Optional Sign In</Text>
              <Text style={styles.infoText}>
                You can use this app without signing in. Your data will be stored locally on your device. 
                Sign in to backup and sync your data across multiple devices.
              </Text>
            </View>
            
            <View style={styles.demoCard}>
              <Text style={styles.demoTitle}>Demo Account</Text>
              <Text style={styles.demoText}>
                Email: demo@example.com{'\n'}
                Password: password123
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  headerButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Logged in styles
  loggedInContainer: {
    flex: 1,
  },
  userCard: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 24,
  },
  userInfo: {
    marginBottom: 20,
  },
  userLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.subtext,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 24,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  // Auth form styles
  authContainer: {
    flex: 1,
  },
  form: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  switchModeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchModeText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Info cards
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  infoText: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  demoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});