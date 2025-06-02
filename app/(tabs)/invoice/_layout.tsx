import { Stack } from "expo-router";

export default function InvoiceLayout() {
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
        name="[id]" 
        options={{ 
          title: "Invoice Details",
          headerBackVisible: true,
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="new" 
        options={{ 
          title: "Create Invoice",
          presentation: "modal",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="edit/[id]" 
        options={{ 
          title: "Edit Invoice",
          presentation: "modal",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="preview/[id]" 
        options={{ 
          title: "Invoice Preview",
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="customize/[id]" 
        options={{ 
          title: "Customize Invoice",
          headerShown: false
        }} 
      />
    </Stack>
  );
}