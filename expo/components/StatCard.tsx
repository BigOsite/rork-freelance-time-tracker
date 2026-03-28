import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  style?: ViewStyle;
};

export default function StatCard({ title, value, icon, color, style }: StatCardProps) {
  const { colors } = useTheme();
  const iconColor = color || colors.primary;
  
  const styles = createStyles(colors);
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          {icon}
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.1,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    textAlign: 'left',
    includeFontPadding: false,
    textAlignVertical: 'center',
    numberOfLines: 1,
    flexShrink: 0,
  },
});