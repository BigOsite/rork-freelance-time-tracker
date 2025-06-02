import React from "react";
import { Tabs } from "expo-router";
import { Clock, BarChart2, Briefcase, Settings, FileText } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";

export default function TabLayout() {
  const { colors } = useTheme();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        },
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        },
        headerShadowVisible: true,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          letterSpacing: -0.3,
          color: colors.text,
        },
        headerTintColor: colors.text,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: -0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <BarChart2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color }) => <Briefcase size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
      
      {/* Nested stacks for job and time entry screens */}
      <Tabs.Screen
        name="job"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="time-entry"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="invoice"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}