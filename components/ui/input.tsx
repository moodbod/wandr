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
      { light: lightColor || '#f4f4f1', dark: darkColor || designSystem.colors.darkSurface },
      'card'
    );
    const textColor = useThemeColor(
      { light: designSystem.colors.ink, dark: designSystem.colors.darkText },
      'text'
    );
    const placeholderTextColor = useThemeColor(
      { light: 'rgba(14,15,12,0.35)', dark: 'rgba(249,249,246,0.35)' },
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  input: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  leftIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});