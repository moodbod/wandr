import { BlurView, type BlurTint } from 'expo-blur';
import { MagnifyingGlass } from 'phosphor-react-native';
import React, { forwardRef } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  View,
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
            backgroundColor: isDark ? 'rgba(22,25,20,0.92)' : 'rgba(244,244,241,0.96)',
            borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  blur: {
    flex: 1,
    overflow: 'hidden',
  },
  innerHighlight: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderTopColor: 'rgba(255, 255, 255, 0.6)',
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
