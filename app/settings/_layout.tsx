import React from 'react';
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
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.text,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.surface,
        },
      }}
    >
      <Stack.Screen 
        name="business-info" 
        options={{ 
          title: 'Business Information',
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="tax-currency" 
        options={{ 
          title: 'Tax & Currency',
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="payment-options" 
        options={{ 
          title: 'Payment Options',
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="support" 
        options={{ 
          title: 'Customer Support',
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="account" 
        options={{ 
          title: 'Account',
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="whats-new" 
        options={{ 
          title: "What's New",
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="upgrade" 
        options={{ 
          title: 'Upgrade',
          presentation: 'modal'
        }} 
      />
    </Stack>
  );
}