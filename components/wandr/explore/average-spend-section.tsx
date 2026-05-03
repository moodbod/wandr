import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type AverageSpendSectionProps = {
  amount: string;
  priceSuffix?: string;
};

function normalizeSpendSuffix(priceSuffix?: string) {
  if (!priceSuffix) {
    return 'per booking';
  }

  return priceSuffix.trim().replace(/^\/pp$/i, 'per person').toLowerCase();
}

function getAverageSpendNote(priceSuffix?: string) {
  const normalized = normalizeSpendSuffix(priceSuffix);

  if (normalized.includes('night')) {
    return 'Most travelers use this as the nightly benchmark before meals, transport, and extras.';
  }

  if (normalized.includes('entry')) {
    return 'This is a useful planning number for admission before transport, snacks, and add-ons.';
  }

  if (normalized.includes('rider')) {
    return 'A solid budgeting anchor per rider before private upgrades or extra route time.';
  }

  return 'A reliable planning number before transport, tips, and any optional add-ons.';
}

export function AverageSpendSection({ amount, priceSuffix }: AverageSpendSectionProps) {
  const note = getAverageSpendNote(priceSuffix);

  return (
    <View style={styles.section}>
      <View style={styles.amountRow}>
        <ThemedText style={styles.lead}>People spend about</ThemedText>
        <ThemedText style={styles.amount}>{amount}</ThemedText>
      </View>
      <ThemedText style={styles.note}>{note}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: designSystem.spacing.xl,
    gap: 12,
  },
  amountRow: {
    gap: 4,
  },
  lead: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  amount: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  note: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    maxWidth: '88%',
    color: designSystem.colors.warmDark,
  },
});
