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
        <View style={styles.copy}>
          <SkeletonBlock style={styles.titleLine} />
          <SkeletonBlock style={styles.subtitleLine} />
        </View>
        <View style={styles.travelerRow}>
          <SkeletonBlock style={styles.travelerGroup} />
          <SkeletonBlock style={styles.travelerText} />
        </View>
      </View>
    </View>
  );
}

export function ExploreSheetHeaderSkeleton() {
  return (
    <View style={styles.sheetHeaderShell}>
      <View style={styles.sheetHeaderCopy}>
        <SkeletonBlock style={styles.sheetTitleLine} />
        <SkeletonBlock style={styles.sheetTitleShortLine} />
      </View>
      <SkeletonBlock style={styles.sheetSearchButton} />
    </View>
  );
}

export function ExploreMobileSheetHeaderSkeleton() {
  return (
    <View style={styles.mobileHeaderShell}>
      <View style={styles.mobileHeaderCopy}>
        <SkeletonBlock style={styles.mobileTitleLine} />
        <SkeletonBlock style={styles.mobileSubtitleLine} />
        <SkeletonBlock style={styles.mobileSubtitleShortLine} />
      </View>
      <SkeletonBlock style={styles.sheetSearchButton} />
    </View>
  );
}

export function ExploreTripFilterSkeleton() {
  return (
    <View style={styles.filterRow}>
      <SkeletonBlock style={styles.filterChipWide} />
      <SkeletonBlock style={styles.filterChip} />
      <SkeletonBlock style={styles.filterChipShort} />
    </View>
  );
}

export function ExploreMobileTripRailSkeleton() {
  return <SkeletonBlock style={styles.mobileTripRail} />;
}

export function ExploreMobileFeatureCardSkeleton() {
  return (
    <SkeletonBlock style={styles.mobileFeaturePanel} />
  );
}

export function ExploreHiddenGemCardSkeleton() {
  const isDark = useColorScheme() === 'dark';

  return (
    <ThemedView
      lightColor={designSystem.colors.white}
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
    gap: 14,
    marginBottom: 20,
  },
  activityImage: {
    width: '100%',
    height: 280,
    borderRadius: 28,
  },
  activityBody: {
    paddingHorizontal: 2,
    gap: 12,
  },
  copy: {
    gap: 8,
  },
  titleLine: {
    width: '76%',
    height: 26,
    borderRadius: 13,
  },
  subtitleLine: {
    width: '94%',
    height: 22,
    borderRadius: 11,
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
    borderRadius: 9,
  },
  sheetHeaderShell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  sheetHeaderCopy: {
    flex: 1,
    gap: 8,
    paddingTop: 2,
  },
  sheetTitleLine: {
    width: '88%',
    height: 28,
    borderRadius: 14,
  },
  sheetTitleShortLine: {
    width: '58%',
    height: 28,
    borderRadius: 14,
  },
  sheetSearchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  mobileHeaderShell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  mobileHeaderCopy: {
    flex: 1,
    gap: 8,
    paddingTop: 2,
    paddingRight: 8,
  },
  mobileTitleLine: {
    width: '56%',
    height: 28,
    borderRadius: 14,
  },
  mobileSubtitleLine: {
    width: '58%',
    height: 14,
    borderRadius: 7,
  },
  mobileSubtitleShortLine: {
    display: 'none',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    overflow: 'hidden',
    width: '100%',
  },
  filterChipWide: {
    flexBasis: 0,
    flexGrow: 1.35,
    minWidth: 92,
    height: 42,
    borderRadius: designSystem.radii.pill,
  },
  filterChip: {
    flexBasis: 0,
    flexGrow: 1.05,
    minWidth: 78,
    height: 42,
    borderRadius: designSystem.radii.pill,
  },
  filterChipShort: {
    flexBasis: 0,
    flexGrow: 0.85,
    minWidth: 64,
    height: 42,
    borderRadius: designSystem.radii.pill,
  },
  mobileTripRail: {
    width: 148,
    height: 42,
    borderRadius: designSystem.radii.pill,
  },
  mobileFeaturePanel: {
    width: '100%',
    height: 164,
    borderRadius: 28,
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
