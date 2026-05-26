import { ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { WandrHeader } from '@/components/wandr/header';
import { styles } from '@/components/wandr/explore/experience-detail-route.styles';
import { designSystem } from '@/constants/design-system';
export function ExperienceDetailLoadingScreen({
  insetsBottom,
  insetsTop,
  isDark,
}: {
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
}) {
  return (
    <ThemedView style={[styles.root, isDark && styles.rootDark]}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          trailingActions: [{ kind: 'favorite', accessibilityLabel: 'Save experience' }],
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + designSystem.spacing.xxxl },
        ]}>
        <SkeletonBlock style={styles.detailHeroSkeleton} />
        <View style={styles.paddedContent}>
          <SkeletonBlock style={styles.detailBadgeSkeleton} />
          <SkeletonBlock style={styles.detailTitleSkeleton} />
          <SkeletonBlock style={styles.detailSubtitleSkeleton} />
          <SkeletonBlock style={styles.detailBodySkeleton} />
          <SkeletonBlock style={styles.detailPanelSkeleton} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

export function SectionHeading({ title, subtitle, isDark }: { title: string; subtitle?: string; isDark: boolean }) {
  return (
    <View style={styles.sectionHeading}>
      <ThemedText style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{title}</ThemedText>
      {subtitle ? (
        <ThemedText style={[styles.sectionSubtitle, isDark && styles.sectionSubtitleDark]}>{subtitle}</ThemedText>
      ) : null}
    </View>
  );
}
