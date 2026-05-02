import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ProfileActivitySummaryProps = {
  addedCount: number;
  savedCount: number;
  friendCount: number;
};

export function ProfileActivitySummary({
  addedCount,
  friendCount,
  savedCount,
}: ProfileActivitySummaryProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <View style={styles.statsRow}>
      <SummaryMetric backgroundColor={colors.surface} label="Bookings" value={addedCount} />
      <SummaryMetric backgroundColor={colors.surface} label="Saved" value={savedCount} />
      <SummaryMetric backgroundColor={colors.surface} label="Friends" value={friendCount} />
    </View>
  );
}

function SummaryMetric({ backgroundColor, label, value }: { backgroundColor: string; label: string; value: number }) {
  return (
    <View style={[styles.metric, { backgroundColor }]}>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  metricValue: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  metricLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
});
