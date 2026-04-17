import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MapPreview } from '@/components/wandr/mapbox/map-preview';
import { designSystem } from '@/constants/design-system';

type ExploreLiveMapPanelProps = {
  title: string;
  description: string;
  ctaLabel: string;
  centerCoordinate: readonly [number, number];
  markers: ReadonlyArray<{
    id: string;
    coordinate: readonly [number, number];
    label?: string;
    tone?: 'accent' | 'dark';
  }>;
};

export function ExploreLiveMapPanel({
  title,
  description,
  ctaLabel,
  centerCoordinate,
  markers,
}: ExploreLiveMapPanelProps) {
  return (
    <View style={styles.shell}>
      <MapPreview centerCoordinate={centerCoordinate} markers={markers} zoomLevel={11} />
      <View style={styles.overlayCard}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
        <Pressable style={styles.cta}>
          <ThemedText style={styles.ctaLabel}>{ctaLabel}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 400,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#e2e3e0',
  },
  overlayCard: {
    position: 'absolute',
    top: 24,
    left: 24,
    width: 240,
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(249,249,246,0.92)',
    gap: 8,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
  },
  title: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
  cta: {
    marginTop: 10,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaLabel: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#ffffff',
  },
});
