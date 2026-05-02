import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

export type TripFitSummaryItem = {
  label: string;
  value: string;
  detail: string;
};

type TripFitSummaryProps = {
  items: readonly TripFitSummaryItem[];
};

export function TripFitSummary({ items }: TripFitSummaryProps) {
  return (
    <View style={styles.stack}>
      {items.map((item, index) => (
        <View
          key={`${item.label}-${item.value}`}
          style={[styles.row, index < items.length - 1 ? styles.rowBorder : null]}>
          <ThemedText style={styles.value}>
            {item.label}: {item.value}
          </ThemedText>
          <ThemedText style={styles.detail}>{item.detail}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    marginHorizontal: -designSystem.spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: designSystem.colors.border,
  },
  row: {
    paddingHorizontal: designSystem.spacing.lg,
    paddingVertical: 18,
    gap: 6,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderColor: designSystem.colors.border,
  },
  value: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  detail: {
    maxWidth: '82%',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: designSystem.colors.warmDark,
  },
});
