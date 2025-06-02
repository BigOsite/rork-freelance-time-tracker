import React from 'react';
import { Stack } from 'expo-router';

export default function JobLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
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
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: 'Edit Job',
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}