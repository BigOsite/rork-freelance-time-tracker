import React, { createContext, useContext, ReactNode } from 'react';
import { useBusinessStore } from '@/store/businessStore';
import Colors from '@/constants/colors';

type Theme = typeof Colors.light;

interface ThemeContextType {
  colors: Theme;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { isDarkMode, toggleDarkMode } = useBusinessStore();
  
  const colors = isDarkMode ? Colors.dark : Colors.light;
  
  return (
    <ThemeContext.Provider value={{ colors, isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}