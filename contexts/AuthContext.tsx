import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
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
  updateProfilePhoto: (imageUri: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const TOKEN_KEY = 'auth_token';

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

  const login = async (email: string, password: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      
      const response = await trpcClient.auth.login.mutate({
        email,
        password,
      });

      // Store token securely
      await secureStorage.setItem(TOKEN_KEY, response.token);
      
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
    } catch (error) {
      console.log('Logout API call failed:', error);
    } finally {
      // Clear local auth data regardless of API call result
      await secureStorage.removeItem(TOKEN_KEY);
      clearAuth();
    }
  };

  const refreshProfile = async () => {
    try {
      if (!authState.isAuthenticated) return;
      
      const profile = await trpcClient.auth.profile.query();
      const loggedInUser: UserAccount = {
        ...profile,
        isLoggedIn: true,
        photoURL: profile.photoURL || null,
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

  const updateProfilePhoto = async (imageUri: string) => {
    try {
      setAuthState({ isLoading: true, error: null });

      if (!userAccount?.uid) {
        throw new Error('User not authenticated');
      }

      // Read the image file
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }

      // Create a unique filename
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userAccount.uid}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to blob for upload
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${fileExt}` });

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
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
          setAuthState({ isAuthenticated: true, isLoading: false, error: null });
          // Try to refresh profile to get latest user data
          try {
            const profile = await trpcClient.auth.profile.query();
            const loggedInUser: UserAccount = {
              ...profile,
              isLoggedIn: true,
              photoURL: profile.photoURL || null,
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