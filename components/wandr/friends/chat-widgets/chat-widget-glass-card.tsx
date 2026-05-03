import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { designSystem } from '@/constants/design-system';

type ChatWidgetGlassCardProps = {
  children: ReactNode;
  isDark?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function ChatWidgetGlassCard({
  children,
  isDark = true,
  radius = 18,
  style,
  contentStyle,
}: ChatWidgetGlassCardProps) {
  const shouldUseNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const isAndroid = Platform.OS === 'android';
  const surfaceColor = isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.whiteOverlayFaint;
  const borderColor = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft;
  const fallbackSurfaceColor = isAndroid
    ? (isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised)
    : surfaceColor;
  const fallbackBorderColor = isAndroid
    ? (isDark ? designSystem.colors.darkBorder : designSystem.colors.lightSurfaceAlt)
    : borderColor;

  return (
    <View style={[styles.shell, { borderRadius: radius }, style]}>
      {shouldUseNativeGlass ? (
        <GlassView
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
          glassEffectStyle="clear"
          tintColor={designSystem.colors.transparentWhite}
          isInteractive
        />
      ) : Platform.OS === 'ios' ? (
        <BlurView
          intensity={72}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
        />
      ) : null}

      <View
        pointerEvents="none"
        style={[
          styles.tint,
          {
            borderRadius: radius,
            backgroundColor: fallbackSurfaceColor,
            borderColor: fallbackBorderColor,
          },
        ]}
      />

      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
