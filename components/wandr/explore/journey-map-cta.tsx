import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import type { ExploreMapMarker } from '@/constants/explore-content';
import { designSystem } from '@/constants/design-system';

type JourneyMapCtaProps = {
  centerCoordinate: readonly [number, number];
  loadingAction?: 'primary' | 'secondary' | null;
  markers?: readonly ExploreMapMarker[];
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  primaryLabel: string;
  secondaryLabel: string;
};

export function JourneyMapCta({
  centerCoordinate,
  loadingAction = null,
  markers = [],
  onPrimaryPress,
  onSecondaryPress,
  primaryLabel,
  secondaryLabel,
}: JourneyMapCtaProps) {
  const isPrimaryLoading = loadingAction === 'primary';
  const isSecondaryLoading = loadingAction === 'secondary';
  const isDisabled = loadingAction !== null;

  return (
    <View style={styles.shell}>
      <View style={styles.mapWrap}>
        <MapPreview centerCoordinate={centerCoordinate} markers={markers} zoomLevel={11.7} />
        <View style={styles.actions}>
          <Pressable disabled={isDisabled} onPress={onPrimaryPress} style={styles.primaryAction}>
            <ThemedText lightColor="#f9f9f6" darkColor="#f9f9f6" style={styles.primaryActionLabel}>
              {isPrimaryLoading ? 'Saving...' : primaryLabel}
            </ThemedText>
          </Pressable>
          <Pressable disabled={isDisabled} onPress={onSecondaryPress} style={styles.secondaryAction}>
            <ThemedText style={styles.secondaryActionLabel}>
              {isSecondaryLoading ? 'Saving...' : secondaryLabel}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 360,
  },
  mapWrap: {
    minHeight: 360,
    borderRadius: designSystem.radii.section,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: designSystem.colors.surfaceMuted,
  },
  actions: {
    position: 'absolute',
    left: designSystem.spacing.md,
    right: designSystem.spacing.md,
    bottom: designSystem.spacing.md,
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: designSystem.colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: designSystem.spacing.md,
  },
  primaryActionLabel: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#f9f9f6',
    textAlign: 'center',
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(249,249,246,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: designSystem.spacing.md,
  },
  secondaryActionLabel: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: designSystem.colors.ink,
    textAlign: 'center',
  },
});
