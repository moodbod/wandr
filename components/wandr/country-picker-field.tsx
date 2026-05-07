import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import CountryPicker, { type Country, type CountryCode } from 'react-native-country-picker-modal';

import { ThemedText } from '@/components/themed-text';
import { CountryFlagAvatar } from '@/components/wandr/country-flag-avatar';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CountryPickerFieldProps = {
  accessibilityLabel: string;
  countryCode: CountryCode | string;
  label: string;
  value: string;
  onSelect: (country: Country) => void;
  variant?: 'card' | 'compact';
};

export function CountryPickerField({
  accessibilityLabel,
  countryCode,
  label,
  value,
  onSelect,
  variant = 'card',
}: CountryPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDark = useColorScheme() === 'dark';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setIsOpen(true)}
        style={variant === 'compact' ? styles.compactRow : styles.row}>
        <CountryFlagAvatar countryCode={countryCode} size={30} />
        {variant === 'compact' ? (
          <ThemedText style={styles.compactValue}>{value}</ThemedText>
        ) : (
          <View style={styles.copy}>
            <ThemedText style={styles.label}>{label}</ThemedText>
            <ThemedText style={styles.value}>{value}</ThemedText>
          </View>
        )}
        <MaterialCommunityIcons color={designSystem.colors.darkGreen} name="chevron-down" size={20} />
      </Pressable>
      {isOpen ? (
        <CountryPicker
          countryCode={countryCode as CountryCode}
          onClose={() => setIsOpen(false)}
          onSelect={(country) => {
            onSelect(country);
            setIsOpen(false);
          }}
          theme={{
            backgroundColor: isDark ? designSystem.semantic.dark.surfaceRaised : designSystem.colors.white,
            onBackgroundTextColor: isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text,
            primaryColor: designSystem.colors.lime,
            primaryColorVariant: designSystem.colors.darkGreen,
          }}
          visible={isOpen}
          withFilter
          withFlag
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.white,
    borderColor: designSystem.colors.border,
    borderRadius: designSystem.radii.card - designSystem.spacing.xxs / 2,
    borderWidth: 1,
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    minHeight: 76,
    paddingHorizontal: designSystem.spacing.sm,
    paddingVertical: 18,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    ...designSystem.type.caption,
    color: designSystem.colors.gray,
    textTransform: 'uppercase',
  },
  value: {
    ...designSystem.type.bodyStrong,
  },
  compactRow: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.white,
    borderColor: designSystem.colors.border,
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    height: designSystem.layout.inputHeight,
    paddingHorizontal: designSystem.spacing.xs,
  },
  compactValue: {
    ...designSystem.type.bodyStrong,
  },
});
