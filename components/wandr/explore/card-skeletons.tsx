import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

const CARD_RADIUS = 32;
const CARD_PADDING = 12;
const INNER_RADIUS = CARD_RADIUS - CARD_PADDING;

export function ExploreActivityCardSkeleton() {
  const isDark = useColorScheme() === 'dark';

  return (
    <ThemedView
      lightColor="#ffffff"
      darkColor={designSystem.colors.darkSurface}
      style={[
        styles.activityShell,
        { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
      ]}>
      <SkeletonBlock style={styles.activityImage} />
      <View style={styles.activityBody}>
        <View style={styles.metaRow}>
          <SkeletonBlock style={styles.badge} />
          <SkeletonBlock style={styles.inlinePrice} />
        </View>
        <View style={styles.copy}>
          <SkeletonBlock style={styles.titleLine} />
          <SkeletonBlock style={styles.subtitleLine} />
          <SkeletonBlock style={styles.subtitleShortLine} />
        </View>
        <View style={styles.priceRow}>
          <SkeletonBlock style={styles.priceLine} />
          <SkeletonBlock style={styles.priceSuffixLine} />
        </View>
      </View>
    </ThemedView>
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
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    padding: CARD_PADDING,
    gap: 14,
  },
  activityImage: {
    height: 240,
    borderRadius: INNER_RADIUS,
  },
  activityBody: {
    paddingHorizontal: 6,
    paddingBottom: 8,
    gap: 14,
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
  inlinePrice: {
    width: 92,
    height: 18,
  },
  copy: {
    gap: 8,
  },
  titleLine: {
    width: '74%',
    height: 30,
  },
  subtitleLine: {
    width: '100%',
    height: 20,
  },
  subtitleShortLine: {
    width: '68%',
    height: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  priceLine: {
    width: 108,
    height: 34,
  },
  priceSuffixLine: {
    width: 84,
    height: 20,
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
