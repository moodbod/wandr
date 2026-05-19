import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ComponentProps } from 'react';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { AUTH_LAYOUT, type AuthPalette } from './auth-palette';

type AuthPrimaryButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  palette: AuthPalette;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
};

export function AuthPrimaryButton({
  disabled,
  label,
  loading,
  palette,
  onPress,
  variant = 'primary',
  icon,
}: AuthPrimaryButtonProps) {
  const { isLargeScreen } = useResponsive();
  const isDesktop = Platform.OS === 'web' && isLargeScreen;

  const isSecondary = variant === 'secondary';
  const backgroundColor = isSecondary ? palette.surfaceRaised : palette.primary;
  const textColor = isSecondary ? palette.text : palette.primaryText;
  const borderColor = isSecondary ? palette.border : undefined;
  const borderWidth = isSecondary ? 1 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isDesktop ? styles.desktopButton : null,
        {
          backgroundColor,
          borderColor,
          borderWidth,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={isDesktop ? 18 : 20}
              color={textColor}
              style={styles.icon}
            />
          ) : null}
          <ThemedText lightColor={textColor} darkColor={textColor} style={[styles.label, isDesktop ? styles.desktopLabel : null]}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: designSystem.radii.pill,
    height: AUTH_LAYOUT.primaryButtonHeight,
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing.lg,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designSystem.spacing.xs,
  },
  icon: {
    marginRight: 2,
  },
  disabled: {
    opacity: 0.45,
  },
  desktopButton: {
    height: 44,
    paddingHorizontal: designSystem.spacing.md,
  },
  desktopLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    ...designSystem.type.bodyStrong,
  },
  pressed: {
    opacity: 0.82,
  },
});
