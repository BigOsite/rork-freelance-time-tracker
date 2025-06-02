import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsLayout() {
  const { colors } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="business-info" />
      <Stack.Screen name="payment-options" />
      <Stack.Screen name="tax-currency" />
      <Stack.Screen name="account" />
      <Stack.Screen name="whats-new" />
      <Stack.Screen name="upgrade" />
      <Stack.Screen name="support" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}