import React, { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps, View, ViewStyle, StyleProp } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { designSystem } from '@/constants/design-system';

export interface InputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  lightColor?: string;
  darkColor?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ style, leftIcon, rightIcon, containerStyle, lightColor, darkColor, ...props }, ref) => {
    const backgroundColor = useThemeColor(
      { light: lightColor || designSystem.colors.surface, dark: darkColor || designSystem.colors.darkSurface },
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

    return (
      <View style={[styles.container, { backgroundColor }, containerStyle]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={[styles.input, { color: textColor }, style]}
          placeholderTextColor={placeholderTextColor}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    borderRadius: designSystem.radii.pill,
    height: designSystem.layout.inputHeight,
    paddingHorizontal: designSystem.layout.inputPaddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.layout.inputGap,
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
  rightIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
