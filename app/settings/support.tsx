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
import { ChevronLeft, MessageCircle, Send, Mail, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';

export default function SupportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  
  const submitSupportMutation = trpc.support.submit.useMutation({
    onSuccess: (data: { message: string }) => {
      Alert.alert('Success', data.message);
      setMessage('');
      if (!user) setEmail('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit support request. Please try again.');
    },
  });
  
  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your message');
      return;
    }
    
    if (!user && !email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    const deviceInfo = Platform.select({
      ios: `iOS ${Platform.Version}`,
      android: `Android ${Platform.Version}`,
      web: 'Web',
      default: 'Unknown'
    });
    
    submitSupportMutation.mutate({
      message: message.trim(),
      userEmail: user?.email || email.trim(),
      deviceInfo,
      appVersion: '1.0.0',
    });
  };
  
  const styles = createStyles(colors);
  
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen 
        options={{
          title: 'Customer Support',
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
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MessageCircle size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>How can we help?</Text>
          <Text style={styles.subtitle}>
            Send us a message and we will get back to you as soon as possible.
          </Text>
        </View>
        
        <View style={styles.form}>
          {!user && (
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
          )}
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message</Text>
            <View style={[styles.inputContainer, styles.messageContainer]}>
              <TextInput
                style={[styles.textInput, styles.messageInput]}
                placeholder="Describe your issue or question..."
                placeholderTextColor={colors.placeholder}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.submitButton, { opacity: submitSupportMutation.isLoading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={submitSupportMutation.isLoading}
          >
            {submitSupportMutation.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Smartphone size={24} color={colors.primary} />
            <Text style={styles.infoTitle}>Device Information</Text>
          </View>
          <Text style={styles.infoText}>
            Platform: {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}
          </Text>
          <Text style={styles.infoText}>
            Version: {Platform.Version}
          </Text>
          <Text style={styles.infoText}>
            App Version: 1.0.0
          </Text>
          <Text style={styles.infoDescription}>
            This information helps us provide better support.
          </Text>
        </View>
        
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Common Issues</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>• Data not syncing</Text>
            <Text style={styles.tipDescription}>Make sure you are signed in to sync data across devices.</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>• Time tracking issues</Text>
            <Text style={styles.tipDescription}>Check your device time settings and app permissions.</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>• Invoice generation problems</Text>
            <Text style={styles.tipDescription}>Ensure all required business information is filled out.</Text>
          </View>
        </View>
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
  messageContainer: {
    alignItems: 'flex-start',
    paddingVertical: 8,
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
  messageInput: {
    minHeight: 120,
    paddingVertical: 12,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  infoCard: {
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
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  infoText: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoDescription: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 8,
    fontStyle: 'italic',
  },
  tipsCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  tipItem: {
    marginBottom: 16,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    paddingLeft: 12,
  },
});