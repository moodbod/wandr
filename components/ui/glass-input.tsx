import { BlurView, type BlurTint } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { MagnifyingGlass } from 'phosphor-react-native';
import React, { forwardRef } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface GlassInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: BlurTint;
  radius?: number;
  leftIcon?: React.ReactNode;
}

export const GlassInput = forwardRef<TextInput, GlassInputProps>(
  (
    {
      autoCapitalize = 'none',
      autoCorrect = false,
      containerStyle,
      intensity = 80,
      leftIcon,
      radius = designSystem.radii.pill,
      style,
      tint,
      ...props
    },
    ref
  ) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const textColor = useThemeColor(
      { light: designSystem.colors.ink, dark: designSystem.colors.darkText },
      'text'
    );
    const placeholderTextColor = useThemeColor(
      { light: 'rgba(14,15,12,0.35)', dark: 'rgba(249,249,246,0.35)' },
      'icon'
    );

    const icon = leftIcon ?? <MagnifyingGlass color={placeholderTextColor} size={20} weight="bold" />;
    const resolvedTint = tint ?? (isDark ? 'dark' : 'light');
    const shouldUseNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

    if (shouldUseNativeGlass) {
      return (
        <View style={[styles.container, { borderRadius: radius }, containerStyle]}>
          <View style={[styles.nativeGlassShell, { borderRadius: radius }]}>
            <GlassView
              style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
              glassEffectStyle="clear"
              tintColor={isDark ? "rgba(12, 14, 12, 0.08)" : "rgba(255, 255, 255, 0.12)"}
              isInteractive
            />
            <View
              pointerEvents="none"
              style={[
                styles.nativeGlassOverlay,
                {
                  borderRadius: radius,
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)',
                  backgroundColor: isDark ? 'rgba(12,14,12,0.02)' : 'rgba(255,255,255,0.02)',
                },
              ]}
            />
            <View style={styles.nativeGlassContent}>
              <View style={styles.leftIcon}>{icon}</View>
              <TextInput
                ref={ref}
                autoCapitalize={autoCapitalize}
                autoCorrect={autoCorrect}
                placeholderTextColor={placeholderTextColor}
                style={[styles.input, { color: textColor }, style]}
                {...props}
              />
            </View>
          </View>
        </View>
      );
    }

    if (Platform.OS === 'ios') {
      return (
        <View style={[styles.container, { borderRadius: radius }, containerStyle]}>
          <BlurView intensity={intensity} tint={resolvedTint} style={[styles.blur, { borderRadius: radius }]}>
            <View style={[styles.innerHighlight, { borderRadius: radius }]}>
              <View style={styles.leftIcon}>{icon}</View>
              <TextInput
                ref={ref}
                autoCapitalize={autoCapitalize}
                autoCorrect={autoCorrect}
                placeholderTextColor={placeholderTextColor}
                style={[styles.input, { color: textColor }, style]}
                {...props}
              />
            </View>
          </BlurView>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.container,
          styles.androidFill,
          {
            borderRadius: radius,
            backgroundColor: isDark ? 'rgba(22,25,20,0.84)' : 'rgba(244,244,241,0.88)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(14,15,12,0.08)',
          },
          containerStyle,
        ]}
      >
        <View style={styles.leftIcon}>{icon}</View>
        <TextInput
          ref={ref}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          placeholderTextColor={placeholderTextColor}
          style={[styles.input, { color: textColor }, style]}
          {...props}
        />
      </View>
    );
  }
);

GlassInput.displayName = 'GlassInput';

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    overflow: 'hidden',
  },
  nativeGlassShell: {
    minHeight: 48,
    overflow: 'hidden',
  },
  nativeGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nativeGlassContent: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  innerHighlight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  androidFill: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    paddingVertical: 0,
  },
  leftIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
