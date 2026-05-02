import type React from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type SegmentedTabOption<Key extends string> = {
  key: Key;
  label: string;
};

type SegmentedTabsProps<Key extends string> = {
  value: Key;
  options: readonly SegmentedTabOption<Key>[];
  onChange: (value: Key) => void;
  leadingAccessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tabStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function SegmentedTabs<Key extends string>({
  value,
  options,
  onChange,
  leadingAccessory,
  style,
  tabStyle,
  contentContainerStyle,
}: SegmentedTabsProps<Key>) {
  const isDark = useColorScheme() === 'dark';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={[styles.row, contentContainerStyle]}
    >
      {leadingAccessory ? <View style={styles.accessory}>{leadingAccessory}</View> : null}
      {options.map((option) => {
        const active = option.key === value;

        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={styles.pressable}
          >
            <ThemedView
              lightColor={active ? designSystem.colors.lime : designSystem.colors.surface}
              darkColor={active ? designSystem.colors.lime : designSystem.colors.darkSurface}
              style={[
                styles.tab,
                {
                  borderColor: active
                    ? designSystem.colors.lime
                    : isDark
                      ? designSystem.colors.darkBorderSoft
                      : designSystem.colors.borderSoft,
                },
                tabStyle,
              ]}
            >
              <ThemedText
                lightColor={active ? designSystem.colors.darkGreen : designSystem.colors.ink}
                darkColor={active ? designSystem.colors.darkGreen : designSystem.colors.darkText}
                style={styles.label}
              >
                {option.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SegmentedTabsAccessory({ children }: { children: React.ReactNode }) {
  const isDark = useColorScheme() === 'dark';

  return (
    <ThemedView
      lightColor={designSystem.colors.surface}
      darkColor={designSystem.colors.darkSurface}
      style={[
        styles.accessoryShell,
        { borderColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft },
      ]}
    >
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: designSystem.spacing.xs,
    paddingRight: designSystem.spacing.lg,
  },
  accessory: {
    borderRadius: designSystem.radii.pill,
  },
  accessoryShell: {
    width: 48,
    minHeight: 40,
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    borderRadius: designSystem.radii.pill,
  },
  tab: {
    minHeight: 40,
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    paddingHorizontal: designSystem.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...designSystem.type.bodySmallStrong,
  },
});
