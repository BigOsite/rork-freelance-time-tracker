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
        photoURL: response.user.photoURL || undefined,
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
      setAuthState({ 
        isLoading: false, 
        error: error.message || 'Login failed' 
      });
      throw error;
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
        photoURL: response.user.photoURL || undefined,
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
      setAuthState({ 
        isLoading: false, 
        error: error.message || 'Registration failed' 
      });
      throw error;
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
        photoURL: profile.photoURL || undefined,
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
              photoURL: profile.photoURL || undefined,
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