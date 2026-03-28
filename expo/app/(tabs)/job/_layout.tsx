import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function JobLayout() {
  const { colors } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        presentation: 'card',
        gestureEnabled: true,
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '600',
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          presentation: 'card',
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'New Job',
          presentation: 'modal',
          gestureEnabled: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: 'Edit Job',
          presentation: 'modal',
          gestureEnabled: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '600',
          },
        }}
      />
    </Stack>
  );
}