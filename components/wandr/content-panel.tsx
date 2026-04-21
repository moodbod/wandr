import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';

type WandrContentPanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function WandrContentPanel({ children, style }: WandrContentPanelProps) {
  return (
    <ThemedView
      lightColor={designSystem.colors.surface}
      darkColor={designSystem.colors.darkSurface}
      style={[styles.panel, style]}>
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
