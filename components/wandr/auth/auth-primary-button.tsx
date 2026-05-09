import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

import { AUTH_LAYOUT, type AuthPalette } from './auth-palette';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type PrimaryButtonProps = {
  disabled?: boolean;
  iconName?: MaterialIconName;
  label: string;
  loading?: boolean;
  palette: AuthPalette;
  onPress: () => void;
};

export function AuthPrimaryButton({ disabled, iconName, label, loading, palette, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: palette.primary },
        disabled && styles.primaryButtonDisabled,
        pressed && styles.filledButtonPressed,
      ]}
      onPress={onPress}>
      {loading ? (
        <ActivityIndicator color={palette.primaryText} />
      ) : (
        <View style={styles.primaryButtonContent}>
          {iconName ? <MaterialCommunityIcons color={palette.primaryText} name={iconName} size={AUTH_LAYOUT.iconSizeMd} /> : null}
          <ThemedText lightColor={palette.primaryText} darkColor={palette.primaryText} style={styles.primaryButtonText}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: designSystem.radii.pill,
    justifyContent: 'center',
    minHeight: AUTH_LAYOUT.primaryButtonHeight,
    paddingHorizontal: designSystem.spacing.lg,
    width: '100%',
  },
  primaryButtonDisabled: {
    opacity: AUTH_LAYOUT.disabledOpacity,
  },
  primaryButtonText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  primaryButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    justifyContent: 'center',
  },
  filledButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
