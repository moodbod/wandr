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
      <View style={styles.sectionHeaderSkeleton}>
        <SkeletonBlock style={styles.sectionTitleSkeleton} />
        <SkeletonBlock style={styles.sectionMetaSkeleton} />
      </View>

      <View style={styles.listContainerSkeleton}>
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
              <View style={styles.cardContentSkeleton}>
                <View style={styles.cardLeftSkeleton}>
                  <SkeletonBlock style={styles.dayBadgeSkeleton} />
                  <SkeletonBlock style={styles.timelineTitle} />
                  <SkeletonBlock style={styles.timelineBody} />
                  <View style={styles.timelineTags}>
                    <SkeletonBlock style={styles.timelineTag} />
                    <SkeletonBlock style={styles.timelineTag} />
                  </View>
                </View>
                <SkeletonBlock style={styles.timelineImageSmall} />
              </View>
            </ThemedView>
          </View>
        ))}
      </View>
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
    paddingVertical: 4,
  },
  sectionHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitleSkeleton: {
    width: 120,
    height: 32,
    borderRadius: 8,
  },
  sectionMetaSkeleton: {
    width: 80,
    height: 20,
    borderRadius: 6,
  },
  listContainerSkeleton: {
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  markerColumn: {
    width: 48,
    alignItems: 'center',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 100,
    backgroundColor: 'rgba(14,15,12,0.08)',
  },
  timelineCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.08)',
    padding: 16,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  timelineCardDark: {
    borderColor: designSystem.colors.darkBorder,
  },
  cardContentSkeleton: {
    flexDirection: 'row',
    gap: 16,
  },
  cardLeftSkeleton: {
    flex: 1,
    gap: 8,
  },
  dayBadgeSkeleton: {
    width: 60,
    height: 20,
    borderRadius: 10,
  },
  timelineTitle: {
    width: '90%',
    height: 24,
    borderRadius: 6,
  },
  timelineBody: {
    width: '100%',
    height: 36,
    borderRadius: 6,
  },
  timelineImageSmall: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  timelineTags: {
    flexDirection: 'row', 
    gap: 8,
    marginTop: 4,
  },
  timelineTag: {
    width: 70,
    height: 24,
    borderRadius: 12,
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
