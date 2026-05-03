import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { ExperienceFeatureCard } from '@/components/wandr/explore/experience-feature-card';
import { JourneyCtaCard } from '@/components/wandr/explore/journey-cta-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { getHiddenGemSlug, hiddenGemDetails } from '@/constants/hidden-gems-content';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { getExplorePageContentRef, getLocationLikeStateRef, toggleLocationLikeRef } from '@/lib/convex';

export default function HiddenGemDetailScreen() {
  return <ConnectedHiddenGemDetailScreen />;
}

function ConnectedHiddenGemDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const traveler = useCurrentTraveler();
  const travelerSlug = traveler?.slug ?? '';
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });
  const likeState = useQuery(getLocationLikeStateRef, {
    travelerSlug,
    locationKind: 'hiddenGem',
    locationSlug: typeof slug === 'string' ? slug : '',
  });
  const toggleLocationLike = useMutation(toggleLocationLikeRef);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  useEffect(() => {
    setOptimisticLiked(null);
  }, [slug]);

  if (!slug || page === undefined || page === null) {
    return <HiddenGemDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} />;
  }

  const detail = hiddenGemDetails[slug];
  const card = page.search.hiddenGems.items.find((item) => getHiddenGemSlug(item.title) === slug);

  if (!detail || !card) {
    return <HiddenGemDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} />;
  }
  const isLiked = optimisticLiked ?? likeState?.liked ?? false;

  const handleToggleLike = async () => {
    const nextLiked = !isLiked;
    setOptimisticLiked(nextLiked);

    try {
      const result = await toggleLocationLike({
        travelerSlug,
        locationKind: 'hiddenGem',
        locationSlug: slug,
      });
      setOptimisticLiked(result.liked);
    } catch {
      setOptimisticLiked(null);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          trailingActions: [
            {
              kind: 'favorite',
              accessibilityLabel: isLiked ? 'Remove saved hidden gem' : 'Save hidden gem',
              isActive: isLiked,
              onPress: () => {
                void handleToggleLike();
              },
            },
          ],
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + designSystem.spacing.xxxl },
        ]}>
        <View style={styles.titleBlock}>
          {detail.badge ? (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{detail.badge}</ThemedText>
            </View>
          ) : null}
          <View style={styles.titleStack}>
            <ThemedText style={styles.title} adjustsFontSizeToFit numberOfLines={1}>
              {detail.title}
            </ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>{detail.locationLabel}</ThemedText>
        </View>

        <View style={styles.heroCard}>
          <Image source={card.imageUri} contentFit="cover" style={styles.heroImage} />
        </View>

        <ThemedText style={styles.summary}>{detail.summary}</ThemedText>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Trip Fit</ThemedText>
          <View style={styles.tripFitColumn}>
            {detail.tripFit.map((item) => (
              <ExperienceFeatureCard key={`${item.label}-${item.value}`} {...item} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{detail.sectionsTitle}</ThemedText>
          <View style={styles.storyStack}>
            {detail.sections.map((section) => (
              <View key={section.title} style={styles.storyBlock}>
                <ThemedText style={styles.storyTitle}>{section.title}</ThemedText>
                <ThemedText style={styles.storyBody}>{section.body}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Before You Go</ThemedText>
          <View style={styles.tipList}>
            {detail.visitTips.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <View style={styles.bullet} />
                <ThemedText style={styles.tipText}>{tip}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <JourneyCtaCard
          title="Keep this detour"
          primaryLabel={detail.primaryLabel}
          secondaryLabel={detail.secondaryLabel}
          onPrimaryPress={() => router.push('/(tabs)/trip')}
          onSecondaryPress={() => router.push('/explore/hidden-gems')}
        />
      </ScrollView>
    </ThemedView>
  );
}

function HiddenGemDetailLoadingScreen({
  insetsBottom,
  insetsTop,
}: {
  insetsBottom: number;
  insetsTop: number;
}) {
  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          trailingActions: [{ kind: 'favorite', accessibilityLabel: 'Save hidden gem' }],
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + designSystem.spacing.xxxl },
        ]}>
        <View style={styles.titleBlock}>
          <SkeletonBlock style={styles.detailBadgeSkeleton} />
          <SkeletonBlock style={styles.detailTitleSkeleton} />
          <SkeletonBlock style={styles.detailSubtitleSkeleton} />
        </View>
        <SkeletonBlock style={styles.heroSkeleton} />
        <SkeletonBlock style={styles.summarySkeleton} />
        <SkeletonBlock style={styles.sectionSkeleton} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xxxl,
  },
  titleBlock: {
    paddingTop: 64,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.lime,
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  titleStack: {
    width: '100%',
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  heroCard: {
    borderRadius: designSystem.radii.feature,
    overflow: 'hidden',
    height: 420,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  summary: {
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
  },
  tripFitColumn: {
    gap: 16,
  },
  storyStack: {
    gap: 24,
  },
  storyBlock: {
    gap: 8,
  },
  storyTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
  },
  storyBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
    maxWidth: '96%',
  },
  tipList: {
    gap: 14,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: designSystem.colors.lime,
  },
  tipText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  detailBadgeSkeleton: {
    width: 112,
    height: 30,
    borderRadius: 15,
  },
  detailTitleSkeleton: {
    width: '82%',
    height: 52,
    borderRadius: 20,
  },
  detailSubtitleSkeleton: {
    width: '58%',
    height: 20,
    borderRadius: 10,
  },
  heroSkeleton: {
    height: 420,
    borderRadius: designSystem.radii.feature,
  },
  summarySkeleton: {
    height: 96,
    borderRadius: 24,
  },
  sectionSkeleton: {
    height: 220,
    borderRadius: 28,
  },
});
