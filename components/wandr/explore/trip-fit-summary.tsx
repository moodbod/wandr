import { CaretDown, CaretUp } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type TripFitSummaryItem = {
  label: string;
  value: string;
  detail: string;
};

type TripFitSummaryProps = {
  items: readonly TripFitSummaryItem[];
};

export function TripFitSummary({ items }: TripFitSummaryProps) {
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const isDark = useColorScheme() === 'dark';
  const mutedColor = isDark ? designSystem.colors.darkMutedText : designSystem.colors.warmDark;

  return (
    <View style={styles.stack}>
      {items.map((item, index) => {
        const itemKey = `${item.label}-${item.value}`;
        const open = openItemKey === itemKey;
        const Icon = open ? CaretUp : CaretDown;

        return (
          <Pressable
            accessibilityRole="button"
            key={itemKey}
            onPress={() => setOpenItemKey(open ? null : itemKey)}
            style={[styles.row, index < items.length - 1 ? styles.rowBorder : null]}>
            <View style={styles.summaryRow}>
              <View style={styles.copy}>
                <ThemedText style={styles.label}>{item.label}</ThemedText>
                <ThemedText style={styles.value}>{item.value}</ThemedText>
              </View>
              <Icon color={mutedColor} size={18} weight="bold" />
            </View>
            {open ? <ThemedText style={styles.detail}>{item.detail}</ThemedText> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: designSystem.colors.border,
  },
  row: {
    paddingVertical: 16,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderColor: designSystem.colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  value: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  detail: {
    maxWidth: '92%',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
});
