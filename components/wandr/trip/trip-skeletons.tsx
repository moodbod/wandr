import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function TripHeroSkeleton() {
  return (
    <View style={styles.hero}>
      <SkeletonBlock style={styles.heroTitle} />
      <View style={styles.progressGroup}>
        <SkeletonBlock style={styles.progressBar} />
        <View style={styles.progressRow}>
          <SkeletonBlock style={styles.progressLabel} />
          <SkeletonBlock style={styles.progressValue} />
        </View>
      </View>
    </View>
  );
}

export function TripActionSkeletons() {
  return (
    <View style={styles.actionsRow}>
      <SkeletonBlock style={styles.actionButton} />
      <SkeletonBlock style={styles.actionButton} />
    </View>
  );
}

export function TripTimelineSkeleton() {
  return (
    <View style={styles.timeline}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={`trip-timeline-skeleton-${index}`} style={styles.timelineRow}>
          <View style={styles.markerColumn}>
            <SkeletonBlock style={styles.marker} />
            {index < 2 ? <SkeletonBlock style={styles.connector} /> : null}
          </View>
          <ThemedView
            lightColor="#ffffff"
            darkColor={designSystem.colors.darkSurface}
            style={[
              styles.timelineCard,
              useColorScheme() === 'dark' ? styles.timelineCardDark : null,
            ]}>
            <SkeletonBlock style={styles.timelineTitle} />
            <SkeletonBlock style={styles.timelineSubtitle} />
            {index === 0 ? (
              <>
                <SkeletonBlock style={styles.timelineBody} />
                <SkeletonBlock style={styles.timelineImage} />
              </>
            ) : (
              <View style={styles.timelineTags}>
                <SkeletonBlock style={styles.timelineTag} />
                <SkeletonBlock style={styles.timelineTag} />
              </View>
            )}
          </ThemedView>
        </View>
      ))}
    </View>
  );
}

export function TripBentoSkeletons() {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.bentoGrid}>
      <ThemedView lightColor={designSystem.colors.darkGreen} darkColor={designSystem.colors.darkSurface} style={[styles.weatherCard, isDark && styles.weatherCardDark]}>
        <SkeletonBlock style={styles.weatherEyebrow} />
        <View style={styles.weatherFooter}>
          <SkeletonBlock style={styles.weatherTemp} />
          <SkeletonBlock style={styles.weatherDesc} />
        </View>
      </ThemedView>
      <ThemedView lightColor={designSystem.colors.surface} darkColor={designSystem.colors.darkSurface} style={[styles.mapCard, isDark && styles.mapCardDark]}>
        <SkeletonBlock style={styles.mapTitle} />
        <SkeletonBlock style={styles.mapSubtitle} />
        <SkeletonBlock style={styles.mapPreview} />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 24,
    gap: 24,
  },
  heroTitle: {
    width: '66%',
    height: 40,
  },
  progressGroup: {
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 32,
    borderRadius: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    width: 118,
    height: 16,
  },
  progressValue: {
    width: 112,
    height: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    height: 72,
    borderRadius: designSystem.radii.pill,
  },
  timeline: {
    gap: 18,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 16,
  },
  markerColumn: {
    width: 56,
    alignItems: 'center',
  },
  marker: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  connector: {
    width: 4,
    flex: 1,
    minHeight: 96,
    borderRadius: 999,
    marginTop: 8,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.12)',
    padding: 18,
    gap: 12,
  },
  timelineCardDark: {
    borderColor: designSystem.colors.darkBorder,
  },
  timelineTitle: {
    width: '58%',
    height: 22,
  },
  timelineSubtitle: {
    width: '40%',
    height: 16,
  },
  timelineBody: {
    width: '100%',
    height: 48,
  },
  timelineImage: {
    width: '100%',
    height: 148,
    borderRadius: 20,
  },
  timelineTags: {
    flexDirection: 'row',
    gap: 10,
  },
  timelineTag: {
    width: 92,
    height: 26,
    borderRadius: 999,
  },
  bentoGrid: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  weatherCard: {
    minHeight: 172,
    borderRadius: 30,
    padding: 18,
    justifyContent: 'space-between',
  },
  weatherCardDark: {
    borderWidth: 1,
    borderColor: designSystem.colors.darkBorder,
  },
  weatherEyebrow: {
    width: 90,
    height: 14,
  },
  weatherFooter: {
    gap: 8,
  },
  weatherTemp: {
    width: 116,
    height: 44,
  },
  weatherDesc: {
    width: 132,
    height: 18,
  },
  mapCard: {
    minHeight: 320,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.12)',
    padding: 20,
    gap: 8,
  },
  mapCardDark: {
    borderColor: designSystem.colors.darkBorder,
  },
  mapTitle: {
    width: 118,
    height: 18,
  },
  mapSubtitle: {
    width: 146,
    height: 16,
  },
  mapPreview: {
    marginTop: 12,
    flex: 1,
    minHeight: 220,
    borderRadius: 24,
  },
});
