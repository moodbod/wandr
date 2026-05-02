import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const flattenedStyle = StyleSheet.flatten(style);
  const resolvedStyleBackground = resolveThemeBackgroundColor(flattenedStyle, isDark);
  const resolvedBackgroundColor = resolvedStyleBackground ?? backgroundColor;

  return <View style={[style, { backgroundColor: resolvedBackgroundColor }]} {...otherProps} />;
}

function resolveThemeBackgroundColor(style: ViewStyle | undefined, isDark: boolean) {
  const backgroundColor = style?.backgroundColor;

  if (typeof backgroundColor !== 'string') {
    return undefined;
  }

  if (backgroundColor === designSystem.colors.background) {
    return isDark ? designSystem.semantic.dark.background : designSystem.semantic.light.background;
  }

  if (backgroundColor === designSystem.colors.surface) {
    return isDark ? designSystem.semantic.dark.surface : designSystem.semantic.light.surface;
  }

  if (backgroundColor === designSystem.colors.surfaceRaised || backgroundColor === designSystem.colors.white) {
    return isDark ? designSystem.semantic.dark.surfaceRaised : designSystem.semantic.light.surfaceRaised;
  }

  if (backgroundColor === designSystem.colors.surfaceMuted) {
    return isDark ? designSystem.semantic.dark.surface : designSystem.colors.surfaceMuted;
  }

  return backgroundColor;
}
