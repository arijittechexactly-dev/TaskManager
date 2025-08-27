import React, { createContext, useContext, useMemo } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';

export type ThemeColors = {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  badgeBg: string;
  success: string;
  danger: string;
  warning: string;
  muted: string;
};

export type Theme = {
  colors: ThemeColors;
  isDark: boolean;
  scheme: ColorSchemeName;
};

const lightColors: ThemeColors = {
  background: '#eef2ff',
  surface: '#ffffff',
  primary: '#4f46e5',
  accent: '#a78bfa',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  badgeBg: '#f3f4f6',
  success: '#16a34a',
  danger: '#ef4444',
  warning: '#f59e0b',
  muted: '#9ca3af',
};

const darkColors: ThemeColors = {
  background: '#0b1020',
  surface: '#111826',
  primary: '#8b93ff',
  accent: '#8b5cf6',
  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  border: '#1f2937',
  badgeBg: '#1f2433',
  success: '#22c55e',
  danger: '#f87171',
  warning: '#fbbf24',
  muted: '#6b7280',
};

const ThemeContext = createContext<Theme | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = useMemo<Theme>(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, scheme }),
    [isDark, scheme]
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
