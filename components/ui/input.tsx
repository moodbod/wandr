import React, { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps, View, ViewStyle, StyleProp } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { designSystem } from '@/constants/design-system';
import { GlassView, isLiquidGlassAvailable } from '@/lib/glass-effect';

export interface InputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  lightColor?: string;
  darkColor?: string;
  radius?: number;
  frameless?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      style,
      leftIcon,
      rightIcon,
      containerStyle,
      lightColor,
      darkColor,
      frameless = false,
      radius,
      multiline,
      selectionColor,
      ...props
    },
    ref
  ) => {
    const resolvedRadius = radius ?? (multiline ? designSystem.radii.card : designSystem.radii.pill);
    const hasNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
    const backgroundColor = useThemeColor(
      {
        light: lightColor || 'rgba(255,255,255,0.16)',
        dark: darkColor || 'rgba(249,249,246,0.08)',
      },
      'card'
    );
    const textColor = useThemeColor(
      { light: designSystem.colors.ink, dark: designSystem.colors.darkText },
      'text'
    );
    const placeholderTextColor = useThemeColor(
      { light: designSystem.colors.placeholderText, dark: designSystem.colors.darkPlaceholderText },
      'icon'
    );
    const accentColor = useThemeColor(
      { light: designSystem.colors.darkGreen, dark: designSystem.colors.lime },
      'tint'
    );

    const content = (
      <>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          multiline={multiline}
          selectionColor={selectionColor ?? accentColor}
          style={[
            styles.input,
            multiline && !frameless && styles.multilineInput,
            { color: textColor },
            style,
          ]}
          placeholderTextColor={placeholderTextColor}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </>
    );

    if (frameless) {
      return (
        <View style={[styles.framelessContainer, containerStyle]}>
          {content}
        </View>
      );
    }

    return (
      <GlassView
        glassEffectStyle="regular"
        style={[
          styles.container,
          multiline && styles.multilineContainer,
          { backgroundColor, borderRadius: resolvedRadius },
          containerStyle,
          // When native liquid glass is available, force the surface transparent — applied
          // LAST so a caller's containerStyle backgroundColor can't cover the glass (which
          // made inputs render as an opaque blur instead of real GlassView).
          hasNativeGlass ? styles.glassSurface : null,
        ]}>
        {content}
      </GlassView>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    height: designSystem.layout.inputHeight,
    paddingHorizontal: designSystem.layout.inputPaddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.layout.inputGap,
    overflow: 'hidden',
  },
  glassSurface: {
    backgroundColor: 'transparent',
  },
  framelessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.layout.inputGap,
  },
  multilineContainer: {
    alignItems: 'flex-start',
    paddingVertical: designSystem.spacing.sm,
    height: undefined,
    minHeight: designSystem.layout.inputHeight,
  },
  input: {
    flex: 1,
    fontSize: designSystem.type.bodyStrong.fontSize,
    fontWeight: designSystem.type.bodyStrong.fontWeight,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  multilineInput: {
    height: undefined,
    minHeight: 78,
    textAlignVertical: 'top',
  },
  leftIcon: {
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rightIcon: {
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
