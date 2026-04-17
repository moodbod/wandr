import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';

export function WandrContentPanel({ children }: PropsWithChildren) {
  return (
    <ThemedView
      lightColor={designSystem.colors.surface}
      darkColor={designSystem.colors.darkSurface}
      style={styles.panel}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: designSystem.radii.panel,
    padding: 18,
    gap: 14,
  },
});
