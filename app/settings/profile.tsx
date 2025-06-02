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
  Platform,
  Modal
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, User, Mail, Lock, LogOut, UserPlus, Key, X, Edit } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { 
    isAuthenticated, 
    user, 
    login, 
    register, 
    logout, 
    isLoading, 
    error,
    forgotPassword,
    changePassword,
    updateDisplayName
  } = useAuth();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  
  // Change password modal state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Change display name modal state
  const [showChangeDisplayName, setShowChangeDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  
  const handleSubmit = async () => {
    if (isLoginMode) {
      // Login
      if (!email || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      
      try {
        await login(email, password);
        // Clear form after successful login
        setEmail('');
        setPassword('');
      } catch (error: any) {
        Alert.alert('Login Failed', error.message || 'Please check your credentials and try again.');
      }
    } else {
      // Register
      if (!email || !password || !displayName || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return;
      }
      
      try {
        await register(email, password, displayName);
        // Clear form after successful registration
        setEmail('');
        setPassword('');
        setDisplayName('');
        setConfirmPassword('');
      } catch (error: any) {
        Alert.alert('Registration Failed', error.message || 'Please try again.');
      }
    }
  };
  
  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      await forgotPassword(forgotEmail);
      setForgotPasswordSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      await changePassword(newPassword);
      setShowChangePassword(false);
      setNewPassword('');
      setConfirmNewPassword('');
      Alert.alert('Success', 'Password changed successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!newDisplayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    try {
      await updateDisplayName(newDisplayName.trim());
      setShowChangeDisplayName(false);
      Alert.alert('Success', 'Display name updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update display name');
    }
  };

  const resetForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotPasswordSent(false);
  };
  
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
        {isAuthenticated && user?.isLoggedIn ? (
          // Authenticated User View
          <View style={styles.authenticatedContainer}>
            <View style={styles.profileCard}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <User size={40} color={colors.primary} />
                </View>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.displayName || 'User'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.createdAt && (
                  <Text style={styles.memberSince}>
                    Member since {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Settings</Text>
              
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => {
                  setNewDisplayName(user.displayName || '');
                  setShowChangeDisplayName(true);
                }}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Edit size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.actionText}>Change Display Name</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => setShowChangePassword(true)}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Key size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.actionText}>Change Password</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.danger + '15' }]}>
                    <LogOut size={20} color={colors.danger} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.danger }]}>Sign Out</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Data Sync</Text>
              <Text style={styles.infoDescription}>
                Your data is automatically synced across all your devices when you are signed in. 
                When you sign out, your data remains on this device but will not sync until you sign in again.
              </Text>
            </View>
          </View>
        ) : (
          // Authentication Form
          <View style={styles.authContainer}>
            <View style={styles.authHeader}>
              <View style={styles.authIcon}>
                <User size={32} color={colors.primary} />
              </View>
              <Text style={styles.authTitle}>
                {isLoginMode ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={styles.authSubtitle}>
                {isLoginMode 
                  ? 'Sign in to sync your data across devices'
                  : 'Join to backup and sync your data'
                }
              </Text>
            </View>
            
            <View style={styles.form}>
              {!isLoginMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Display Name</Text>
                  <View style={styles.inputContainer}>
                    <UserPlus size={20} color={colors.subtext} style={styles.inputIcon} />
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
                <Text style={styles.inputLabel}>Email</Text>
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
              
              {!isLoginMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={20} color={colors.subtext} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Confirm your password"
                      placeholderTextColor={colors.placeholder}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}
              
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              
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

              {isLoginMode && (
                <TouchableOpacity 
                  style={styles.forgotPasswordButton}
                  onPress={() => setShowForgotPassword(true)}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.switchModeButton}
                onPress={() => {
                  setIsLoginMode(!isLoginMode);
                  setEmail('');
                  setPassword('');
                  setDisplayName('');
                  setConfirmPassword('');
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
            
            <View style={styles.disclaimerCard}>
              <Text style={styles.disclaimerTitle}>Optional Sign In</Text>
              <Text style={styles.disclaimerText}>
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

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent
        animationType="fade"
        onRequestClose={resetForgotPasswordModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {forgotPasswordSent ? 'Check Your Email' : 'Reset Password'}
                </Text>
                <TouchableOpacity 
                  onPress={resetForgotPasswordModal}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              {forgotPasswordSent ? (
                <View style={styles.modalBody}>
                  <Text style={styles.modalDescription}>
                    We have sent a password reset link to {forgotEmail}. 
                    Please check your email and follow the instructions to reset your password.
                  </Text>
                  <TouchableOpacity 
                    style={styles.modalButton}
                    onPress={resetForgotPasswordModal}
                  >
                    <Text style={styles.modalButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.modalBody}>
                  <Text style={styles.modalDescription}>
                    Enter your email address and we will send you a link to reset your password.
                  </Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <View style={styles.inputContainer}>
                      <Mail size={20} color={colors.subtext} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter your email"
                        placeholderTextColor={colors.placeholder}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.modalButton, { opacity: isLoading ? 0.7 : 1 }]}
                    onPress={handleForgotPassword}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalButtonText}>Send Reset Link</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity 
                  onPress={() => setShowChangePassword(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  Enter your new password below. Make sure it is at least 6 characters long.
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={20} color={colors.subtext} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.placeholder}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={20} color={colors.subtext} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.placeholder}
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.modalButton, { opacity: isLoading ? 0.7 : 1 }]}
                  onPress={handleChangePassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalButtonText}>Change Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Change Display Name Modal */}
      <Modal
        visible={showChangeDisplayName}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangeDisplayName(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Display Name</Text>
                <TouchableOpacity 
                  onPress={() => setShowChangeDisplayName(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  Enter your new display name. This is how your name will appear in the app.
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Display Name</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color={colors.subtext} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter display name"
                      placeholderTextColor={colors.placeholder}
                      value={newDisplayName}
                      onChangeText={setNewDisplayName}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.modalButton, { opacity: isLoading ? 0.7 : 1 }]}
                  onPress={handleUpdateDisplayName}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalButtonText}>Update Display Name</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  
  // Authenticated User Styles
  authenticatedContainer: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 16,
    color: colors.subtext,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  infoDescription: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
  },
  
  // Authentication Form Styles
  authContainer: {
    flex: 1,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  authIcon: {
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
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.6,
  },
  authSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
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
  errorContainer: {
    backgroundColor: colors.danger + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '500',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
  },
  switchModeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchModeText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
  },
  disclaimerCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  disclaimerText: {
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  modalBody: {
    padding: 24,
    paddingTop: 0,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});