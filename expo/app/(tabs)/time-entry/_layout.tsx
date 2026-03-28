import { Stack } from "expo-router";

export default function TimeEntryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: "600",
        },
        contentStyle: {
          backgroundColor: "#F7F9FC",
        },
      }}
    >
      <Stack.Screen 
        name="new/[jobId]" 
        options={{ 
          title: "Add Time Entry",
          presentation: "modal",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="edit/[id]" 
        options={{ 
          headerShown: false,
          presentation: "modal",
          headerBackVisible: false
        }} 
      />
    </Stack>
  );
}