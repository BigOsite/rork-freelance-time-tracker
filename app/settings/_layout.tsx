import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerShadowVisible: true,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          letterSpacing: -0.3,
        },
        contentStyle: {
          backgroundColor: "#F8FAFC",
        },
        headerTintColor: "#1E293B",
      }}
    >
      <Stack.Screen 
        name="business-info" 
        options={{ 
          title: "Business Information",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="tax-currency" 
        options={{ 
          title: "Tax and Currency",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="payment-options" 
        options={{ 
          title: "Payment Options",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="payment-options/stripe" 
        options={{ 
          title: "Stripe Setup",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="payment-options/paypal" 
        options={{ 
          title: "PayPal Setup",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="support" 
        options={{ 
          title: "Customer Support",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="whats-new" 
        options={{ 
          title: "What's New",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="account" 
        options={{ 
          title: "Account",
          headerBackVisible: false
        }} 
      />
      <Stack.Screen 
        name="upgrade" 
        options={{ 
          title: "Upgrade",
          headerBackVisible: false
        }} 
      />
    </Stack>
  );
}