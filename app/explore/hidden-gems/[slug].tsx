import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { ExperienceGalleryCarousel } from '@/components/wandr/explore/experience-gallery-carousel';
import { JourneyMapCta } from '@/components/wandr/explore/journey-map-cta';
import { TripFitSummary } from '@/components/wandr/explore/trip-fit-summary';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { ExploreHiddenGem } from '@/constants/explore-content';
import { getHiddenGemSlug, hiddenGemDetails, type HiddenGemDetailContent } from '@/constants/hidden-gems-content';
import type { Id } from '@/convex/_generated/dataModel';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { bookExperienceRef, getExplorePageContentRef, getLocationLikeStateRef, listUserTripsRef, toggleLocationLikeRef } from '@/lib/convex';

export default function HiddenGemDetailScreen({
  onClose,
  slug,
}: {
  onClose?: () => void;
  slug?: string;
} = {}) {
  return <ConnectedHiddenGemDetailScreen onClose={onClose} slug={slug} />;
}

function ConnectedHiddenGemDetailScreen({ onClose, slug: slugProp }: { onClose?: () => void; slug?: string }) {
  const { slug: routeSlug } = useLocalSearchParams<{ slug: string }>();
  const slug = slugProp ?? routeSlug;
  const insets = useSafeAreaInsets();
  const traveler = useCurrentTraveler();
  const travelerSlug = traveler?.slug ?? '';
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });
  const trips = useQuery(listUserTripsRef, { travelerSlug });
  const likeState = useQuery(getLocationLikeStateRef, {
    travelerSlug,
    locationKind: 'hiddenGem',
    locationSlug: typeof slug === 'string' ? slug : '',
  });
  const bookExperience = useMutation(bookExperienceRef);
  const toggleLocationLike = useMutation(toggleLocationLikeRef);
  const tripSheetRef = useRef<BottomSheet>(null);
  const [bookingAction, setBookingAction] = useState<'primary' | null>(null);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  useEffect(() => {
    setOptimisticLiked(null);
  }, [slug]);

  if (!slug || page === undefined || page === null) {
    return <HiddenGemDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} />;
  }

  const card = page.search.hiddenGems.items.find((item) => getHiddenGemSlug(item.title) === slug);
  const detail = hiddenGemDetails[slug] ?? (card ? buildHiddenGemDetail(slug, card) : undefined);

  if (!detail || !card) {
    return <HiddenGemDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} />;
  }
  const isLiked = optimisticLiked ?? likeState?.liked ?? false;
  const mapCenterCoordinate = card.coordinate ?? page.search.map.centerCoordinate;
  const mapMarkers = card.coordinate
    ? [
        {
          id: slug,
          coordinate: card.coordinate,
          imageUri: card.imageUri,
          label: detail.title,
          tone: 'accent' as const,
          status: 'active' as const,
        },
      ]
    : [];

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

  const addHiddenGemToTrip = async (tripId?: Id<'trips'>) => {
    if (bookingAction || !travelerSlug) {
      return;
    }

    setBookingAction('primary');
    try {
      await bookExperience({
        experienceSlug: slug,
        travelerSlug,
        tripId,
      });
      tripSheetRef.current?.close();
    } finally {
      setBookingAction(null);
    }
  };

  const handleAddToTripPress = () => {
    if (trips && trips.length === 0) {
      void addHiddenGemToTrip();
      return;
    }

    tripSheetRef.current?.snapToIndex(0);
  };

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: onClose
            ? { kind: 'back', accessibilityLabel: 'Close hidden gem', onPress: onClose }
            : { kind: 'back', accessibilityLabel: 'Go back' },
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + designSystem.spacing.xxxl },
        ]}>
        <View style={styles.carouselContainer}>
          <ExperienceGalleryCarousel height={420} images={[card.imageUri]} />
        </View>

        <View style={styles.paddedContent}>
          <View style={styles.titleBlock}>
            {detail.badge ? (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{detail.badge}</ThemedText>
              </View>
            ) : null}
            <View style={styles.titleStack}>
              <ThemedText style={styles.title} adjustsFontSizeToFit>
                {detail.title}
              </ThemedText>
            </View>
            <ThemedText style={styles.locationLabel}>{detail.locationLabel}</ThemedText>
          </View>

          <ThemedText style={styles.description}>{detail.summary}</ThemedText>

          <TripFitSummary items={detail.tripFit} />

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

          <JourneyMapCta
            centerCoordinate={mapCenterCoordinate}
            loadingAction={bookingAction}
            markers={mapMarkers}
            primaryLabel={detail.primaryLabel ?? 'Add to trip'}
            onPrimaryPress={handleAddToTripPress}
          />
        </View>
      </ScrollView>

      <GlassBottomSheet ref={tripSheetRef} index={-1} snapPoints={['60%', '90%']}>
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <ThemedText style={styles.sheetTitle}>Add to trip</ThemedText>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            {trips?.map((trip) => (
              <Pressable
                key={trip._id}
                onPress={() => void addHiddenGemToTrip(trip._id as Id<'trips'>)}
                style={styles.tripRow}
              >
                <ThemedText style={styles.tripName}>{trip.name}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </BottomSheetView>
      </GlassBottomSheet>
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

function buildHiddenGemDetail(slug: string, card: ExploreHiddenGem): HiddenGemDetailContent {
  return {
    slug,
    title: card.title,
    badge: card.badge ?? 'Hidden Gem',
    locationLabel: card.locationLabel ?? card.geography?.town ?? card.geography?.region ?? card.countryLabel ?? 'Local detour',
    summary: card.summary ?? card.description,
    tripFit: card.tripFit ?? [
      {
        label: 'Best vibe',
        value: 'LOW-FRICTION DETOUR',
        detail: 'A flexible stop when you want texture between larger trip anchors.',
        icon: 'compass',
        tone: 'dark',
      },
      {
        label: 'Time ask',
        value: 'SHORT STOP',
        detail: 'Easy to add around meals, drives, or quieter parts of the day.',
        icon: 'clock',
        tone: 'accent',
      },
      {
        label: 'Who it suits',
        value: 'CURIOUS TRAVELERS',
        detail: 'Works best for people who like smaller places with a specific sense of place.',
        icon: 'users',
        tone: 'light',
      },
    ],
    sectionsTitle: 'Why it is worth the detour',
    sections: card.sections?.length
      ? card.sections
      : [
          {
            title: 'Why it lands',
            body: card.description,
          },
        ],
    visitTips: card.visitTips?.length ? card.visitTips : ['Keep it flexible in the route plan', 'Check local access and timing before you go'],
    primaryLabel: card.primaryLabel ?? 'Add to trip',
    secondaryLabel: card.secondaryLabel ?? 'Back to gems',
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: 28,
  },
  carouselContainer: {
    height: 420,
  },
  paddedContent: {
    paddingHorizontal: 24,
    gap: 32,
  },
  titleBlock: {
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
    textTransform: 'uppercase',
  },
  titleStack: {
    gap: 4,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '600',
  },
  locationLabel: {
    fontSize: 17,
    color: designSystem.colors.gray,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: designSystem.colors.gray,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  storyStack: {
    gap: 18,
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
    color: designSystem.colors.gray,
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
  sheetContainer: {
    flex: 1,
    padding: 24,
  },
  sheetHeader: {
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  sheetContent: {
    gap: 12,
  },
  tripRow: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: designSystem.colors.surface,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
