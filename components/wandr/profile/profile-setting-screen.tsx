import type React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ProfileSettingScreenProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function ProfileSettingScreen({ children, description, title }: ProfileSettingScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.root}>
      <WandrHeader config={{ overlay: true, leadingAction: { kind: 'back', accessibilityLabel: 'Go back' } }} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 88,
            paddingBottom: insets.bottom + 64,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
        </View>

        <View style={styles.section}>{children}</View>
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
    <View style={[styles.field, { backgroundColor: colors.surface }]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <ThemedText style={styles.fieldValue}>{value || 'Not set'}</ThemedText>
    </View>
  );
}

type SettingRowProps = {
  label: string;
  description: string;
  value?: string;
};

export function SettingRow({ description, label, value }: SettingRowProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={styles.rowCopy}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        <ThemedText style={styles.rowDescription}>{description}</ThemedText>
      </View>
      {value ? <ThemedText style={styles.rowValue}>{value}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: 24,
    paddingHorizontal: designSystem.spacing.lg,
  },
  hero: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: designSystem.colors.warmDark,
  },
  section: {
    gap: 12,
  },
  field: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  fieldValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 22,
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
    color: designSystem.colors.ink,
  },
  rowDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.warmDark,
  },
  rowValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
});
