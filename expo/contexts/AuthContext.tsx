import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useBusinessStore } from '@/store/businessStore';
import { useJobsStore } from '@/store/jobsStore';
import { supabase } from '@/lib/supabase';
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
      
      // Use Supabase for authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase login error:', error);
        throw new Error(error.message || 'Login failed. Please check your credentials.');
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed. No user data returned.');
      }

      console.log('Login successful:', data.user.id);

      // Store token securely
      await secureStorage.setItem(TOKEN_KEY, data.session.access_token);
      
      // Update state - make sure user is marked as logged in
      const loggedInUser: UserAccount = {
        id: data.user.id,
        uid: data.user.id,
        email: data.user.email || email,
        displayName: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'User',
        isLoggedIn: true,
        photoURL: data.user.user_metadata?.avatar_url || null,
      };
      
      setUserAccount(loggedInUser);
      setAuthToken(data.session.access_token);
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
      
      // Use Supabase for registration
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        console.error('Supabase registration error:', error);
        throw new Error(error.message || 'Registration failed. Please try again.');
      }

      if (!data.user) {
        throw new Error('Registration failed. No user data returned.');
      }

      console.log('Registration successful:', data.user.id);

      // If session exists (email confirmation disabled), store token and log in
      if (data.session) {
        await secureStorage.setItem(TOKEN_KEY, data.session.access_token);
        
        const loggedInUser: UserAccount = {
          id: data.user.id,
          uid: data.user.id,
          email: data.user.email || email,
          displayName: displayName,
          isLoggedIn: true,
          photoURL: null,
        };
        
        setUserAccount(loggedInUser);
        setAuthToken(data.session.access_token);
        setAuthState({ 
          isAuthenticated: true, 
          isLoading: false, 
          error: null 
        });
      } else {
        // Email confirmation required
        setAuthState({ 
          isAuthenticated: false, 
          isLoading: false, 
          error: 'Please check your email to confirm your account.' 
        });
      }

      console.log('Registration completed successfully');

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
      
      // Sign out from Supabase
      if (authState.isAuthenticated) {
        try {
          await supabase.auth.signOut();
          console.log('Supabase logout successful');
        } catch (error) {
          console.log('Supabase logout failed:', error);
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
      
      // Get profile from Supabase
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Failed to get user:', error);
        await logout();
        return;
      }

      if (user) {
        const loggedInUser: UserAccount = {
          id: user.id,
          uid: user.id,
          email: user.email || '',
          displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
          isLoggedIn: true,
          photoURL: user.user_metadata?.avatar_url || null,
        };
        setUserAccount(loggedInUser);
        console.log('Profile refreshed successfully');
      }
    } catch (error) {
      console.log('Failed to refresh profile:', error);
      await logout();
    }
  };

  // Initialize auth state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setAuthState({ isLoading: true, error: null });
        
        console.log('Initializing auth state');
        
        // Check for existing Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAuthState({ isAuthenticated: false, isLoading: false, error: null });
          return;
        }
        
        if (session && session.user) {
          console.log('Existing session found:', session.user.id);
          
          // Store token
          await secureStorage.setItem(TOKEN_KEY, session.access_token);
          setAuthToken(session.access_token);
          
          // Set user account
          const loggedInUser: UserAccount = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
            isLoggedIn: true,
            photoURL: session.user.user_metadata?.avatar_url || null,
          };
          
          setUserAccount(loggedInUser);
          setAuthState({ isAuthenticated: true, isLoading: false, error: null });
          console.log('Session restored successfully');
        } else {
          console.log('No existing session found');
          setAuthState({ isAuthenticated: false, isLoading: false, error: null });
        }
      } catch (error) {
        console.log('Auth initialization failed:', error);
        setAuthState({ isAuthenticated: false, isLoading: false, error: null });
      }
    };

    initializeAuth();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        await secureStorage.setItem(TOKEN_KEY, session.access_token);
        setAuthToken(session.access_token);
        
        const loggedInUser: UserAccount = {
          id: session.user.id,
          uid: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          isLoggedIn: true,
          photoURL: session.user.user_metadata?.avatar_url || null,
        };
        
        setUserAccount(loggedInUser);
        setAuthState({ isAuthenticated: true, isLoading: false, error: null });
      } else if (event === 'SIGNED_OUT') {
        await secureStorage.removeItem(TOKEN_KEY);
        clearAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const forgotPassword = async (email: string) => {
    try {
      console.log('Password reset requested for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log('Password reset email sent successfully');
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
