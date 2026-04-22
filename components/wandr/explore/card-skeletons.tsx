import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

const CARD_RADIUS = 32;
const CARD_PADDING = 12;
const INNER_RADIUS = CARD_RADIUS - CARD_PADDING;

export function ExploreActivityCardSkeleton() {
  return (
    <View style={styles.activityShell}>
      <SkeletonBlock style={styles.activityImage} />
      <View style={styles.activityBody}>
        <View style={styles.metaRow}>
          <SkeletonBlock style={styles.badge} />
        </View>
        <View style={styles.copy}>
          <SkeletonBlock style={styles.titleLine} />
          <SkeletonBlock style={styles.subtitleLine} />
        </View>
        <View style={styles.travelerRow}>
          <SkeletonBlock style={styles.travelerGroup} />
          <SkeletonBlock style={styles.travelerText} />
        </View>
        <SkeletonBlock style={styles.ctaButton} />
      </View>
    </View>
  );
}

export function ExploreHiddenGemCardSkeleton() {
  const isDark = useColorScheme() === 'dark';

  return (
    <ThemedView
      lightColor="#ffffff"
      darkColor={designSystem.colors.darkSurface}
      style={[
        styles.hiddenGemShell,
        { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
      ]}>
      <SkeletonBlock style={styles.hiddenGemImage} />
      <View style={styles.hiddenGemCopy}>
        <SkeletonBlock style={styles.hiddenGemTitle} />
        <SkeletonBlock style={styles.hiddenGemDescription} />
        <SkeletonBlock style={styles.hiddenGemDescriptionShort} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  activityShell: {
    gap: 16,
    marginBottom: 24,
  },
  activityImage: {
    height: 320,
    borderRadius: CARD_RADIUS,
  },
  activityBody: {
    paddingHorizontal: 4,
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    width: 104,
    height: 26,
    borderRadius: designSystem.radii.pill,
  },
  copy: {
    gap: 8,
  },
  titleLine: {
    width: '84%',
    height: 36,
  },
  subtitleLine: {
    width: '100%',
    height: 24,
  },
  travelerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  travelerGroup: {
    width: 100,
    height: 42,
    borderRadius: 21,
  },
  travelerText: {
    width: 140,
    height: 18,
  },
  ctaButton: {
    width: '100%',
    height: 54,
    borderRadius: designSystem.radii.pill,
  },
  hiddenGemShell: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    padding: CARD_PADDING,
  },
  hiddenGemImage: {
    width: '100%',
    height: 280,
    borderRadius: INNER_RADIUS,
  },
  hiddenGemCopy: {
    paddingTop: 16,
    paddingBottom: 6,
    gap: 8,
  },
  hiddenGemTitle: {
    width: '62%',
    height: 24,
  },
  hiddenGemDescription: {
    width: '100%',
    height: 18,
  },
  hiddenGemDescriptionShort: {
    width: '76%',
    height: 18,
  },
});
