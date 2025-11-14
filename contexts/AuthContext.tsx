import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useBusinessStore } from '@/store/businessStore';
import { useJobsStore } from '@/store/jobsStore';
import { trpcClient } from '@/lib/trpc';
import { AuthState, UserAccount } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  updateProfilePhoto: (photoUri: string) => Promise<void>;
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

  const { setCurrentUser } = useJobsStore();

  // Set up the current user in the jobs store whenever userAccount changes
  useEffect(() => {
    setCurrentUser(userAccount);
  }, [userAccount, setCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      
      console.log('Starting login process for:', email);
      
      // Test backend connectivity first
      try {
        const baseUrl = 'https://8e23p8rts6cegks6ymhco.rork.com';
        console.log('Testing backend connectivity at:', baseUrl);
        
        const healthCheck = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        console.log('Health check status:', healthCheck.status);
        
        if (!healthCheck.ok) {
          console.warn('Backend health check failed with status:', healthCheck.status);
        } else {
          const healthData = await healthCheck.json();
          console.log('Backend is healthy:', healthData);
        }
      } catch (healthError) {
        console.error('Backend health check failed:', healthError);
        throw new Error('Unable to connect to server. The backend service may be starting up. Please wait a moment and try again.');
      }
      
      // Use tRPC for authentication
      console.log('Making login request via tRPC');
      const response = await trpcClient.auth.login.mutate({
        email,
        password,
      });

      console.log('Login response received:', response.success);

      // Store token securely
      await secureStorage.setItem(TOKEN_KEY, response.token);
      
      // Update state - make sure user is marked as logged in
      const loggedInUser: UserAccount = {
        ...response.user,
        id: response.user.uid,
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

      console.log('User state updated successfully');

    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage = error.message || 'Login failed. Please try again.';
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
      
      console.log('Starting registration process for:', email);
      
      // Use tRPC for registration
      const response = await trpcClient.auth.register.mutate({
        email,
        password,
        displayName,
      });

      console.log('Registration response received:', response.success);

      // Store token securely
      await secureStorage.setItem(TOKEN_KEY, response.token);
      
      // Update state - make sure user is marked as logged in
      const loggedInUser: UserAccount = {
        ...response.user,
        id: response.user.uid,
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

      console.log('User state updated successfully');

    } catch (error: any) {
      console.error('Registration failed:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      setAuthState({ 
        isLoading: false, 
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      console.log('Starting logout process');
      
      // Call logout endpoint if authenticated
      if (authState.isAuthenticated) {
        try {
          await trpcClient.auth.logout.mutate();
          console.log('Logout API call successful');
        } catch (error) {
          console.log('Logout API call failed:', error);
        }
      }
    } catch (error) {
      console.log('Logout process failed:', error);
    } finally {
      // Clear local auth data regardless of API call result
      await secureStorage.removeItem(TOKEN_KEY);
      clearAuth();
      console.log('Local auth data cleared');
    }
  };

  const refreshProfile = async () => {
    try {
      if (!authState.isAuthenticated) return;
      
      console.log('Refreshing profile');
      
      // Get profile from backend
      const profile = await trpcClient.auth.profile.query();
      
      const loggedInUser: UserAccount = {
        ...profile,
        id: profile.uid,
        isLoggedIn: true,
        photoURL: profile.photoURL || null,
      };
      setUserAccount(loggedInUser);

      console.log('Profile refreshed successfully');
    } catch (error) {
      console.log('Failed to refresh profile:', error);
      // If profile fetch fails, user might be logged out
      await logout();
    }
  };

  // Initialize auth state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setAuthState({ isLoading: true, error: null });
        
        console.log('Initializing auth state');
        
        const token = await secureStorage.getItem(TOKEN_KEY);
        console.log('Stored token found:', !!token);
        
        if (token) {
          setAuthToken(token);
          setAuthState({ isAuthenticated: true, isLoading: false, error: null });
          
          // Try to refresh profile to get latest user data
          try {
            console.log('Refreshing profile on app start');
            const profile = await trpcClient.auth.profile.query();
            
            const loggedInUser: UserAccount = {
              ...profile,
              id: profile.uid,
              isLoggedIn: true,
              photoURL: profile.photoURL || null,
            };
            setUserAccount(loggedInUser);

            console.log('Profile refreshed successfully');
          } catch (error) {
            console.log('Failed to refresh profile on init:', error);
            // If profile fetch fails, clear auth
            await secureStorage.removeItem(TOKEN_KEY);
            clearAuth();
          }
        } else {
          console.log('No valid auth state found');
          setAuthState({ isAuthenticated: false, isLoading: false, error: null });
        }
      } catch (error) {
        console.log('Auth initialization failed:', error);
        setAuthState({ isAuthenticated: false, isLoading: false, error: null });
      }
    };

    initializeAuth();
  }, []);

  const forgotPassword = async (email: string) => {
    try {
      console.log('Password reset requested for:', email);
      throw new Error('Password reset functionality is not yet implemented. Please contact support for password recovery.');
    } catch (error: any) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      if (!authState.isAuthenticated || !userAccount) {
        throw new Error('You must be logged in to change your password.');
      }
      console.log('Password change not yet implemented');
      throw new Error('Password change functionality is not yet implemented.');
    } catch (error: any) {
      console.error('Password change failed:', error);
      throw error;
    }
  };

  const updateDisplayName = async (displayName: string) => {
    try {
      if (!authState.isAuthenticated || !userAccount) {
        throw new Error('You must be logged in to update your display name.');
      }
      
      console.log('Updating display name to:', displayName);
      
      const updatedUser: UserAccount = {
        ...userAccount,
        displayName,
      };
      
      setUserAccount(updatedUser);
      console.log('Display name updated successfully');
    } catch (error: any) {
      console.error('Display name update failed:', error);
      throw error;
    }
  };

  const updateProfilePhoto = async (photoUri: string) => {
    try {
      if (!authState.isAuthenticated || !userAccount) {
        throw new Error('You must be logged in to update your profile photo.');
      }
      
      console.log('Updating profile photo');
      
      const updatedUser: UserAccount = {
        ...userAccount,
        photoURL: photoUri,
      };
      
      setUserAccount(updatedUser);
      console.log('Profile photo updated successfully');
    } catch (error: any) {
      console.error('Profile photo update failed:', error);
      throw error;
    }
  };

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
