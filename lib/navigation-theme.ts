import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
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
    animation: (Platform.OS === 'web' ? 'none' : 'fade') as any,
    animationDuration: Platform.OS === 'web' ? 0 : 160,
    contentStyle: {
      backgroundColor: getNavigationBackground(isDark),
    },
  };
}
