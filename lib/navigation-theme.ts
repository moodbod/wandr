import { DarkTheme, DefaultTheme, type Theme } from "expo-router/react-navigation";
import { Platform } from 'react-native';

import { designSystem } from '@/constants/design-system';

export function getNavigationBackground(isDark: boolean) {
  return isDark ? designSystem.semantic.dark.background : designSystem.semantic.light.background;
}

export function getNavigationTheme(isDark: boolean): Theme {
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const background = getNavigationBackground(isDark);
  const surface = isDark ? designSystem.semantic.dark.surface : designSystem.semantic.light.surface;
  const text = isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text;
  const border = isDark ? designSystem.semantic.dark.borderSoft : designSystem.semantic.light.borderSoft;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background,
      card: surface,
      border,
      text,
    },
  };
}

export function getStackScreenOptions(isDark: boolean) {
  return {
    // 'default' = the platform's native push animation (iOS slide-from-right).
    // Do NOT use 'ios' — it is not a valid react-native-screens animation and crashes natively.
    animation: Platform.select({ web: 'none', default: 'default' }) as 'none' | 'default',
    headerTitle: '',
    title: '',
    contentStyle: {
      backgroundColor: getNavigationBackground(isDark),
    },
  };
}
