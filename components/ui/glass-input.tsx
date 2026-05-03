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
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  plain?: boolean;
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
      contentStyle,
      intensity = 80,
      leftIcon,
      plain = false,
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
      { light: designSystem.colors.placeholderText, dark: designSystem.colors.darkPlaceholderText },
      'icon'
    );

    const icon = leftIcon === undefined ? <MagnifyingGlass color={placeholderTextColor} size={20} weight="regular" /> : leftIcon;
    const resolvedTint = tint ?? (isDark ? 'dark' : 'light');
    const shouldUseNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
    const surfaceColor = isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.whiteOverlayFaint;
    const borderColor = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft;
    const androidSurfaceColor = isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised;
    const androidBorderColor = isDark ? designSystem.colors.darkBorder : designSystem.colors.lightSurfaceAlt;

    if (plain) {
      return (
        <View style={[styles.plainContainer, contentStyle, containerStyle]}>
          {icon ? <View style={styles.leftIcon}>{icon}</View> : null}
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

    if (shouldUseNativeGlass) {
      return (
        <View style={[styles.container, { borderRadius: radius }, containerStyle]}>
          <View style={[styles.nativeGlassShell, { borderRadius: radius }]}>
            <GlassView
              style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
              glassEffectStyle="clear"
              tintColor={designSystem.colors.transparentWhite}
              isInteractive
            />
            <View
              pointerEvents="none"
              style={[
                styles.nativeGlassOverlay,
                {
                  borderRadius: radius,
                  borderColor,
                  backgroundColor: surfaceColor,
                },
              ]}
            />
            <View style={[styles.nativeGlassContent, contentStyle]}>
              {icon ? <View style={styles.leftIcon}>{icon}</View> : null}
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
            <View
              style={[
                styles.innerHighlight,
                { borderRadius: radius, backgroundColor: surfaceColor, borderColor },
                contentStyle,
              ]}>
              {icon ? <View style={styles.leftIcon}>{icon}</View> : null}
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
            backgroundColor: androidSurfaceColor,
            borderColor: androidBorderColor,
          },
          contentStyle,
          containerStyle,
        ]}
      >
        {icon ? <View style={styles.leftIcon}>{icon}</View> : null}
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
    height: designSystem.layout.inputHeight,
    overflow: 'hidden',
  },
  plainContainer: {
    height: designSystem.layout.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.layout.inputGap,
  },
  blur: {
    flex: 1,
    overflow: 'hidden',
  },
  nativeGlassShell: {
    height: designSystem.layout.inputHeight,
    overflow: 'hidden',
  },
  nativeGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nativeGlassContent: {
    height: designSystem.layout.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.layout.inputGap,
    paddingHorizontal: designSystem.layout.inputPaddingHorizontal,
  },
  innerHighlight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.layout.inputGap,
    paddingHorizontal: designSystem.layout.inputPaddingHorizontal,
    borderWidth: 1,
  },
  androidFill: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.layout.inputGap,
    paddingHorizontal: designSystem.layout.inputPaddingHorizontal,
  },
  input: {
    flex: 1,
    height: designSystem.type.bodyStrong.lineHeight,
    ...designSystem.type.bodyStrong,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  leftIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
