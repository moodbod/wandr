import type React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ProfileSettingScreenProps = {
  title: string;
  description?: string;
  bottomNote?: string;
  children: React.ReactNode;
};

export function ProfileSettingScreen({ bottomNote, children, description }: ProfileSettingScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 16,
            paddingBottom: insets.bottom + 64,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {description ? (
          <ThemedText style={[styles.description, { color: colors.textSubtle }]}>{description}</ThemedText>
        ) : null}

        <View style={styles.section}>{children}</View>
        {bottomNote ? <ThemedText style={[styles.bottomNote, { color: colors.textSubtle }]}>{bottomNote}</ThemedText> : null}
      </ScrollView>
    </ThemedView>
  );
}

type SettingFieldProps = {
  label: string;
  value: string;
};

export function SettingField({ label, value }: SettingFieldProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <View style={[styles.field, { borderBottomColor: colors.borderSoft }]}>
      <ThemedText style={[styles.fieldLabel, { color: colors.textSubtle }]}>{label}</ThemedText>
      <ThemedText style={[styles.fieldValue, { color: colors.text }]}>{value || 'Not set'}</ThemedText>
    </View>
  );
}

type SettingTextInputProps = {
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function SettingTextInput({ label, onChangeText, placeholder, value }: SettingTextInputProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <View style={[styles.inputWrap, { borderBottomColor: colors.borderSoft }]}>
      <ThemedText style={[styles.fieldLabel, { color: colors.textSubtle }]}>{label}</ThemedText>
      <Input
        autoCapitalize="words"
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[styles.input, { color: colors.text }]}
        value={value}
      />
    </View>
  );
}

type SettingOption<T extends string> = {
  label: string;
  value: T;
};

type SettingOptionGroupProps<T extends string> = {
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  options: readonly SettingOption<T>[];
  value: T;
};

export function SettingOptionGroup<T extends string>({ disabled = false, label, onChange, options, value }: SettingOptionGroupProps<T>) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <View style={[styles.optionGroup, { borderBottomColor: colors.borderSoft }]}>
      <ThemedText style={[styles.fieldLabel, { color: colors.textSubtle }]}>{label}</ThemedText>
      <View style={styles.optionGrid}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: isSelected }}
              disabled={disabled}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.optionPill,
                {
                  backgroundColor: isSelected ? designSystem.colors.lime : colors.surfaceRaised,
                  borderColor: isSelected ? designSystem.colors.darkGreen : colors.borderSoft,
                },
                disabled ? styles.optionPillDisabled : null,
              ]}>
              <ThemedText
                style={[
                  styles.optionLabel,
                  { color: isSelected ? designSystem.colors.darkGreen : colors.textMuted },
                ]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type SettingActionButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function SettingActionButton({ disabled = false, label, onPress, variant = 'primary' }: SettingActionButtonProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        {
          backgroundColor: isPrimary ? colors.text : colors.surface,
          borderColor: colors.borderSoft,
          opacity: disabled ? 0.58 : 1,
        },
      ]}>
      <ThemedText style={[styles.actionButtonText, { color: isPrimary ? colors.background : colors.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type SettingRowProps = {
  label: string;
  description?: string;
  value?: string;
};

export function SettingRow({ description, label, value }: SettingRowProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;
  const valueColor = colorScheme === 'dark' ? designSystem.colors.lime : designSystem.colors.darkGreen;

  return (
    <View style={[styles.row, { borderBottomColor: colors.borderSoft }]}>
      <View style={styles.rowCopy}>
        <ThemedText style={[styles.rowLabel, { color: colors.text }]}>{label}</ThemedText>
        {description ? <ThemedText style={[styles.rowDescription, { color: colors.textSubtle }]}>{description}</ThemedText> : null}
      </View>
      {value ? <ThemedText style={[styles.rowValue, { color: valueColor }]}>{value}</ThemedText> : null}
    </View>
  );
}

type SettingSwitchRowProps = {
  description?: string;
  disabled?: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

export function SettingSwitchRow({ description, disabled = false, label, onValueChange, value }: SettingSwitchRowProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <View style={[styles.row, { borderBottomColor: colors.borderSoft }, disabled && styles.rowDisabled]}>
      <View style={styles.rowCopy}>
        <ThemedText style={[styles.rowLabel, { color: colors.text }]}>{label}</ThemedText>
        {description ? <ThemedText style={[styles.rowDescription, { color: colors.textSubtle }]}>{description}</ThemedText> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        ios_backgroundColor={colors.overlay}
        onValueChange={onValueChange}
        thumbColor={value ? designSystem.colors.darkGreen : colors.surfaceRaised}
        trackColor={{ false: colors.borderSoft, true: designSystem.colors.lime }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingHorizontal: designSystem.spacing.lg,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 0,
  },
  field: {
    gap: 6,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  inputWrap: {
    gap: 8,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    minHeight: 28,
    padding: 0,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  optionGroup: {
    gap: 12,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  optionPillDisabled: {
    opacity: 0.58,
  },
  optionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 18,
  },
  actionButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  rowDisabled: {
    opacity: 0.7,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  rowDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  rowValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  bottomNote: {
    marginTop: 4,
    paddingBottom: 12,
    fontSize: 12,
    lineHeight: 18,
  },
});
