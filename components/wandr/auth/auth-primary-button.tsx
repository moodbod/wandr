import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';

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
};

export function AuthPrimaryButton({ disabled, label, loading, palette, onPress }: AuthPrimaryButtonProps) {
  const { isLargeScreen } = useResponsive();
  const isDesktop = Platform.OS === 'web' && isLargeScreen;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isDesktop ? styles.desktopButton : null,
        { backgroundColor: palette.primary },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.primaryText} />
      ) : (
        <ThemedText lightColor={palette.primaryText} darkColor={palette.primaryText} style={[styles.label, isDesktop ? styles.desktopLabel : null]}>
          {label}
        </ThemedText>
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
