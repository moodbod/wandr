import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type WandrSectionProps = PropsWithChildren<{
  title: string;
}>;

export function WandrSection({ title, children }: WandrSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: designSystem.spacing.sm,
  },
  title: designSystem.type.subtitle,
});
