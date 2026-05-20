import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { MapFrame } from '@/components/wandr/maps/map-frame';
import { ThemedText } from '@/components/themed-text';
import type { ExploreMapMarker } from '@/constants/explore-content';
import { designSystem } from '@/constants/design-system';

type JourneyMapCtaProps = {
  centerCoordinate: readonly [number, number];
  loadingAction?: 'primary' | 'secondary' | null;
  markers?: readonly ExploreMapMarker[];
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  primaryLabel: string;
  secondaryLabel?: string;
  variant?: 'default' | 'webDetail';
};

export function JourneyMapCta({
  centerCoordinate,
  loadingAction = null,
  markers = [],
  onPrimaryPress,
  onSecondaryPress,
  primaryLabel,
  secondaryLabel,
  variant = 'default',
}: JourneyMapCtaProps) {
  const isPrimaryLoading = loadingAction === 'primary';
  const isSecondaryLoading = loadingAction === 'secondary';
  const isDisabled = loadingAction !== null;
  const isWebDetail = variant === 'webDetail' && Platform.OS === 'web';

  return (
    <View style={[styles.shell, isWebDetail && styles.webDetailShell]}>
      <MapFrame
        shellStyle={[styles.mapWrap, isWebDetail && styles.webDetailMapWrap]}
        centerCoordinate={centerCoordinate}
        interactionEnabled={!isWebDetail}
        markers={markers}
        zoomLevel={isWebDetail ? 12.6 : 11.7}
      >
        <View style={[styles.actions, isWebDetail && styles.webDetailActions]}>
          <Pressable disabled={isDisabled} onPress={onPrimaryPress} style={[styles.primaryAction, isWebDetail && styles.webDetailAction]}>
            <ThemedText lightColor={designSystem.colors.background} darkColor={designSystem.colors.background} style={styles.primaryActionLabel}>
              {isPrimaryLoading ? 'Saving...' : primaryLabel}
            </ThemedText>
          </Pressable>
          {secondaryLabel && onSecondaryPress ? (
            <Pressable disabled={isDisabled} onPress={onSecondaryPress} style={[styles.secondaryAction, isWebDetail && styles.webDetailAction]}>
              <ThemedText
                lightColor={designSystem.colors.ink}
                darkColor={designSystem.colors.ink}
                style={styles.secondaryActionLabel}
              >
                {isSecondaryLoading ? 'Saving...' : secondaryLabel}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </MapFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 360,
  },
  webDetailShell: {
    minHeight: 300,
    marginHorizontal: -8,
  },
  mapWrap: {
    minHeight: 360,
    borderRadius: designSystem.radii.section,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: designSystem.colors.surfaceMuted,
  },
  webDetailMapWrap: {
    minHeight: 300,
    borderRadius: 14,
  },
  actions: {
    position: 'absolute',
    left: designSystem.spacing.md,
    right: designSystem.spacing.md,
    bottom: designSystem.spacing.md,
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
  },
  webDetailActions: {
    left: 10,
    right: 10,
    bottom: 10,
    gap: 8,
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
  webDetailAction: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  primaryActionLabel: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.background,
    textAlign: 'center',
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: designSystem.colors.lightGlass,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: designSystem.spacing.md,
  },
  secondaryActionLabel: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
