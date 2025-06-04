import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, Linking, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { trpc, trpcClient } from '@/lib/trpc';
import { ThemeProvider as CustomThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from 'react-native';
import { useJobsStore } from '@/store/jobsStore';
import { useBusinessStore } from '@/store/businessStore';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appState = useRef(AppState.currentState);
  const backgroundSyncInitialized = useRef(false);
  
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
      setNetworkInfo({
        isConnected: state.isConnected ?? false,
        type: state.type,
      });
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
  }, [setNetworkInfo]);

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
    const handleAppStateChange = async (nextAppState: string) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - trigger sync
        if (userAccount?.uid) {
          try {
            await processSyncQueue(userAccount.uid);
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

  // Periodic sync when app is active
  useEffect(() => {
    if (!userAccount?.uid) return;

    const periodicSync = setInterval(async () => {
      if (AppState.currentState === 'active') {
        try {
          await processSyncQueue(userAccount.uid);
        } catch (error) {
          console.error('Error in periodic sync:', error);
        }
      }
    }, 30 * 60 * 1000); // Every 30 minutes when app is active

    return () => {
      clearInterval(periodicSync);
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