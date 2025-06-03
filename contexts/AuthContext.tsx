import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useBusinessStore } from '@/store/businessStore';
import { useJobsStore } from '@/store/jobsStore';
import { trpcClient } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import { AuthState, UserAccount } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  updateProfilePhoto: (imageUri?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const TOKEN_KEY = 'auth_token';
const SUPABASE_SESSION_KEY = 'supabase_session';

// Secure storage wrapper that works on all platforms
const secureStorage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export function AuthProvider({ children }: AuthProviderProps) {
  const { 
    userAccount, 
    setUserAccount, 
    authState, 
    setAuthState,
    setAuthToken,
    clearAuth 
  } = useBusinessStore();

  const { syncWithSupabase } = useJobsStore();

  // Helper function to establish Supabase session
  const establishSupabaseSession = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Supabase session establishment failed:', error);
        return false;
      }

      if (data.session) {
        // Store session for persistence
        await secureStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(data.session));
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error establishing Supabase session:', error);
      return false;
    }
  };

  // Helper function to restore Supabase session
  const restoreSupabaseSession = async () => {
    try {
      const sessionData = await secureStorage.getItem(SUPABASE_SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // Check if session is still valid (not expired)
        const now = Math.round(Date.now() / 1000);
        if (session.expires_at && session.expires_at < now) {
          console.log('Stored session is expired, removing it');
          await secureStorage.removeItem(SUPABASE_SESSION_KEY);
          return false;
        }
        
        const { error } = await supabase.auth.setSession(session);
        if (error) {
          console.log('Failed to restore Supabase session:', error);
          await secureStorage.removeItem(SUPABASE_SESSION_KEY);
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error restoring Supabase session:', error);
      return false;
    }
  };

  // Helper function to ensure we have an active Supabase session
  const ensureSupabaseSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        return session;
      }

      // Try to restore session from storage
      const restored = await restoreSupabaseSession();
      if (restored) {
        const { data: { session: newSession } } = await supabase.auth.getSession();
        return newSession;
      }

      return null;
    } catch (error) {
      console.log('Error ensuring Supabase session:', error);
      return null;
    }
  };

  // Helper function to refresh session if needed
  const refreshSessionIfNeeded = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('Error getting session:', error);
        return false;
      }
      
      if (!session) {
        console.log('No active session found');
        return false;
      }
      
      // Check if session is close to expiring (within 5 minutes)
      const now = Math.round(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 300) { // Less than 5 minutes
        console.log('Session expiring soon, refreshing...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.log('Failed to refresh session:', refreshError);
          return false;
        }
        
        if (refreshData.session) {
          // Update stored session
          await secureStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(refreshData.session));
          return true;
        }
      }
      
      return true;
    } catch (error) {
      console.log('Error refreshing session:', error);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      
      const response = await trpcClient.auth.login.mutate({
        email,
        password,
      });

      // Store token securely
      await secureStorage.setItem(TOKEN_KEY, response.token);
      
      // Establish Supabase session for profile operations
      await establishSupabaseSession(email, password);
      
      // Update state - make sure user is marked as logged in
      const loggedInUser: UserAccount = {
        ...response.user,
        isLoggedIn: true,
        photoURL: response.user.photoURL || null,
      };
      
      setUserAccount(loggedInUser);
      setAuthToken(response.token);
      setAuthState({ 
        isAuthenticated: true, 
        isLoading: false, 
        error: null 
      });

      // Sync data with Supabase after successful login
      try {
        await syncWithSupabase(response.user.uid);
      } catch (syncError) {
        console.log('Data sync failed, but login successful:', syncError);
      }

    } catch (error: any) {
      const errorMessage = getCleanErrorMessage(error);
      setAuthState({ 
        isLoading: false, 
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      
      const response = await trpcClient.auth.register.mutate({
        email,
        password,
        displayName,
      });

      // Store token securely
      await secureStorage.setItem(TOKEN_KEY, response.token);
      
      // Establish Supabase session for profile operations
      await establishSupabaseSession(email, password);
      
      // Update state - make sure user is marked as logged in
      const loggedInUser: UserAccount = {
        ...response.user,
        isLoggedIn: true,
        photoURL: response.user.photoURL || null,
      };
      
      setUserAccount(loggedInUser);
      setAuthToken(response.token);
      setAuthState({ 
        isAuthenticated: true, 
        isLoading: false, 
        error: null 
      });

      // Sync data with Supabase after successful registration
      try {
        await syncWithSupabase(response.user.uid);
      } catch (syncError) {
        console.log('Data sync failed, but registration successful:', syncError);
      }

    } catch (error: any) {
      const errorMessage = getCleanErrorMessage(error);
      setAuthState({ 
        isLoading: false, 
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if authenticated
      if (authState.isAuthenticated) {
        await trpcClient.auth.logout.mutate();
      }
      
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.log('Logout API call failed:', error);
    } finally {
      // Clear local auth data regardless of API call result
      await secureStorage.removeItem(TOKEN_KEY);
      await secureStorage.removeItem(SUPABASE_SESSION_KEY);
      clearAuth();
    }
  };

  const refreshProfile = async () => {
    try {
      if (!authState.isAuthenticated) return;
      
      // Refresh session if needed
      await refreshSessionIfNeeded();
      
      const profile = await trpcClient.auth.profile.query();
      
      // Get updated profile data from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      const photoURL = user?.user_metadata?.avatar_url || user?.user_metadata?.photo_url || profile.photoURL;
      
      const loggedInUser: UserAccount = {
        ...profile,
        isLoggedIn: true,
        photoURL: photoURL || null,
      };
      setUserAccount(loggedInUser);

      // Sync data after profile refresh
      try {
        await syncWithSupabase(profile.uid);
      } catch (syncError) {
        console.log('Data sync failed during profile refresh:', syncError);
      }
    } catch (error) {
      console.log('Failed to refresh profile:', error);
      // If profile fetch fails, user might be logged out
      await logout();
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Platform.OS === 'web' 
          ? `${window.location.origin}/settings/reset-password`
          : 'myapp://reset-password'
      });

      if (error) {
        throw error;
      }

      setAuthState({ isLoading: false, error: null });
    } catch (error: any) {
      const errorMessage = getCleanErrorMessage(error);
      setAuthState({ 
        isLoading: false, 
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  };

  const resetPassword = async (newPassword: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      setAuthState({ isLoading: false, error: null });
    } catch (error: any) {
      const errorMessage = getCleanErrorMessage(error);
      setAuthState({ 
        isLoading: false, 
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      
      // Ensure we have an active Supabase session
      const session = await ensureSupabaseSession();
      if (!session) {
        throw new Error('Session expired. Please sign in again.');
      }
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      setAuthState({ isLoading: false, error: null });
    } catch (error: any) {
      const errorMessage = getCleanErrorMessage(error);
      setAuthState({ 
        isLoading: false, 
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  };

  const updateDisplayName = async (displayName: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      
      // Ensure we have an active Supabase session
      const session = await ensureSupabaseSession();
      if (!session) {
        throw new Error('Session expired. Please sign in again.');
      }
      
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });

      if (error) {
        throw error;
      }

      // Update local user state
      if (userAccount) {
        const updatedUser: UserAccount = {
          ...userAccount,
          displayName,
        };
        setUserAccount(updatedUser);
      }

      setAuthState({ isLoading: false, error: null });
    } catch (error: any) {
      const errorMessage = getCleanErrorMessage(error);
      setAuthState({ 
        isLoading: false, 
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  };

  const updateProfilePhoto = async (imageUri?: string) => {
    try {
      setAuthState({ isLoading: true, error: null });

      // If no imageUri provided, launch image picker
      let finalImageUri = imageUri;
      if (!finalImageUri) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          setAuthState({ isLoading: false, error: null });
          return;
        }

        finalImageUri = result.assets[0].uri;
      }

      // Ensure we have an active Supabase session
      const session = await ensureSupabaseSession();
      if (!session || !session.user) {
        throw new Error('Session expired. Please sign in again.');
      }

      const userId = session.user.id;

      // Read the image file
      const fileInfo = await FileSystem.getInfoAsync(finalImageUri);
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }

      // Create a unique filename
      const fileExt = finalImageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      let uploadData;
      let uploadError;

      if (Platform.OS === 'web') {
        // On web, convert image URI to File object
        try {
          const response = await fetch(finalImageUri);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: `image/${fileExt}` });
          
          const result = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });
          
          uploadData = result.data;
          uploadError = result.error;
        } catch (fetchError) {
          console.log('Web file conversion error:', fetchError);
          throw new Error('Failed to process image file');
        }
      } else {
        // On native platforms, read as base64 and convert to Uint8Array
        try {
          const base64 = await FileSystem.readAsStringAsync(finalImageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Convert base64 to Uint8Array
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const result = await supabase.storage
            .from('avatars')
            .upload(filePath, bytes, {
              cacheControl: '3600',
              upsert: true,
              contentType: `image/${fileExt}`
            });
          
          uploadData = result.data;
          uploadError = result.error;
        } catch (conversionError) {
          console.log('Native file conversion error:', conversionError);
          throw new Error('Failed to process image file');
        }
      }

      if (uploadError) {
        console.log('Upload error:', uploadError);
        throw uploadError;
      }

      if (!uploadData) {
        throw new Error('Upload failed - no data returned');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      // Update user profile with new photo URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: urlData.publicUrl,
          photo_url: urlData.publicUrl 
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Update local user state
      if (userAccount) {
        const updatedUser: UserAccount = {
          ...userAccount,
          photoURL: urlData.publicUrl,
        };
        setUserAccount(updatedUser);
      }

      setAuthState({ isLoading: false, error: null });
    } catch (error: any) {
      const errorMessage = getCleanErrorMessage(error);
      setAuthState({ 
        isLoading: false, 
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  };

  // Helper function to clean up error messages
  const getCleanErrorMessage = (error: any): string => {
    if (!error) return 'An unexpected error occurred.';
    
    const message = typeof error === 'string' ? error : error.message || '';
    
    // Handle common Supabase/auth errors with user-friendly messages
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (message.includes('User already registered')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (message.includes('Password should be at least 6 characters')) {
      return 'Password must be at least 6 characters long.';
    }
    if (message.includes('Unable to validate email address')) {
      return 'Please enter a valid email address.';
    }
    if (message.includes('Email not confirmed')) {
      return 'Please check your email and confirm your account before signing in.';
    }
    if (message.includes('Too many requests')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    if (message.includes('Network request failed') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('signup is disabled')) {
      return 'Account registration is currently disabled. Please contact support.';
    }
    if (message.includes('Email rate limit exceeded')) {
      return 'Too many emails sent. Please wait before requesting another reset link.';
    }
    if (message.includes('The resource was not found')) {
      return 'Upload failed. Please try again.';
    }
    if (message.includes('Image file not found')) {
      return 'Selected image could not be found. Please try selecting another image.';
    }
    if (message.includes('Session expired')) {
      return 'Session expired. Please sign in again.';
    }
    if (message.includes('Auth session missing') || message.includes('No active session')) {
      return 'Session expired. Please sign in again.';
    }
    if (message.includes('new row violates row-level security policy')) {
      return 'Upload permission denied. Please try signing out and back in.';
    }
    if (message.includes('Creating blobs from') || message.includes('ArrayBuffer')) {
      return 'Upload failed. Please try again.';
    }
    if (message.includes('Failed to process image file')) {
      return 'Failed to process image file. Please try selecting another image.';
    }
    if (message.includes('Upload failed - no data returned')) {
      return 'Upload failed. Please check your connection and try again.';
    }
    
    // Return the original message if it's already user-friendly
    return message || 'An unexpected error occurred. Please try again.';
  };

  // Initialize auth state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await secureStorage.getItem(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          
          // Try to restore Supabase session
          await restoreSupabaseSession();
          
          setAuthState({ isAuthenticated: true, isLoading: false, error: null });
          // Try to refresh profile to get latest user data
          try {
            const profile = await trpcClient.auth.profile.query();
            
            // Get updated profile data from Supabase auth
            const { data: { user } } = await supabase.auth.getUser();
            const photoURL = user?.user_metadata?.avatar_url || user?.user_metadata?.photo_url || profile.photoURL;
            
            const loggedInUser: UserAccount = {
              ...profile,
              isLoggedIn: true,
              photoURL: photoURL || null,
            };
            setUserAccount(loggedInUser);

            // Sync data on app start if user is authenticated
            try {
              await syncWithSupabase(profile.uid);
            } catch (syncError) {
              console.log('Data sync failed on app start:', syncError);
            }
          } catch (error) {
            console.log('Failed to refresh profile on init:', error);
            // If profile fetch fails, clear auth
            await logout();
          }
        } else {
          setAuthState({ isAuthenticated: false, isLoading: false, error: null });
        }
      } catch (error) {
        console.log('Auth initialization failed:', error);
        setAuthState({ isAuthenticated: false, isLoading: false, error: null });
      }
    };

    initializeAuth();
  }, []);

  // Set up auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          // Handle sign out
          await secureStorage.removeItem(SUPABASE_SESSION_KEY);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Handle sign in or token refresh
          if (session) {
            await secureStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session));
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated: authState.isAuthenticated,
    user: userAccount,
    token: authState.token,
    isLoading: authState.isLoading,
    error: authState.error,
    login,
    register,
    logout,
    refreshProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateDisplayName,
    updateProfilePhoto,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}