import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, AppStateStatus, Linking, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { trpc, trpcClient } from '@/lib/trpc';
import { ThemeProvider as CustomThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from 'react-native';
import { useJobsStore } from '@/store/jobsStore';
import { useBusinessStore } from '@/store/businessStore';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.message?.includes('UNAUTHORIZED') || error?.message?.includes('401')) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.message?.includes('UNAUTHORIZED') || error?.message?.includes('401')) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundSyncInitialized = useRef(false);
  const lastSyncTime = useRef<number>(0);
  
  // Get store methods
  const { 
    setNetworkInfo, 
    initializeBackgroundSync, 
    stopBackgroundSync, 
    processSyncQueue,
    syncWithSupabase 
  } = useJobsStore();
  const { userAccount } = useBusinessStore();

  useEffect(() => {
    // Hide splash screen after a short delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);

    // Handle deep linking for password reset
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      if (url.includes('reset-password')) {
        // Navigate to reset password screen
        // The router will handle this automatically based on the URL structure
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription?.remove();
    };
  }, []);

  // Network monitoring and sync initialization
  useEffect(() => {
    // Set up network monitoring
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      setNetworkInfo({
        isConnected,
        type: state.type,
      });
      
      // If we regain connectivity and have a user, try to sync
      if (isConnected && userAccount?.uid) {
        const now = Date.now();
        // Only sync if it's been more than 30 seconds since last sync
        if (now - lastSyncTime.current > 30000) {
          lastSyncTime.current = now;
          processSyncQueue(userAccount.uid).catch(error => {
            console.log('Auto-sync on connectivity restore failed:', error);
          });
        }
      }
    });

    // Initialize network state
    NetInfo.fetch().then(state => {
      setNetworkInfo({
        isConnected: state.isConnected ?? false,
        type: state.type,
      });
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, [setNetworkInfo, userAccount?.uid, processSyncQueue]);

  // Background sync initialization
  useEffect(() => {
    if (userAccount?.uid && !backgroundSyncInitialized.current) {
      initializeBackgroundSync(userAccount.uid);
      backgroundSyncInitialized.current = true;
    }

    return () => {
      if (backgroundSyncInitialized.current) {
        stopBackgroundSync();
        backgroundSyncInitialized.current = false;
      }
    };
  }, [userAccount?.uid, initializeBackgroundSync, stopBackgroundSync]);

  // App state change handling for background sync
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - trigger sync
        if (userAccount?.uid) {
          try {
            const now = Date.now();
            // Only sync if it's been more than 10 seconds since last sync
            if (now - lastSyncTime.current > 10000) {
              lastSyncTime.current = now;
              await processSyncQueue(userAccount.uid);
            }
          } catch (error) {
            console.error('Error syncing on app foreground:', error);
          }
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [userAccount?.uid, processSyncQueue]);

  // Enhanced periodic sync when app is active
  useEffect(() => {
    if (!userAccount?.uid) return;

    const periodicSync = setInterval(async () => {
      if (AppState.currentState === 'active') {
        try {
          const now = Date.now();
          // Only sync if it's been more than 5 minutes since last sync
          if (now - lastSyncTime.current > 5 * 60 * 1000) {
            lastSyncTime.current = now;
            await processSyncQueue(userAccount.uid);
          }
        } catch (error) {
          console.error('Error in periodic sync:', error);
        }
      }
    }, 10 * 60 * 1000); // Check every 10 minutes when app is active

    return () => {
      clearInterval(periodicSync);
    };
  }, [userAccount?.uid, processSyncQueue]);

  // Enhanced background sync for data consistency
  useEffect(() => {
    if (!userAccount?.uid) return;

    const backgroundSync = setInterval(async () => {
      try {
        const now = Date.now();
        // Background sync every 2 hours
        if (now - lastSyncTime.current > 2 * 60 * 60 * 1000) {
          lastSyncTime.current = now;
          await processSyncQueue(userAccount.uid);
        }
      } catch (error) {
        console.error('Error in background sync:', error);
      }
    }, 2 * 60 * 60 * 1000); // Every 2 hours

    return () => {
      clearInterval(backgroundSync);
    };
  }, [userAccount?.uid, processSyncQueue]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <CustomThemeProvider>
          <AuthProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="+not-found" />
                <Stack.Screen 
                  name="settings" 
                  options={{ 
                    headerShown: false,
                    presentation: 'card'
                  }} 
                />
              </Stack>
            </ThemeProvider>
          </AuthProvider>
        </CustomThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}