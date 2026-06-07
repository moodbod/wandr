import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Sheet, SheetScrollView, SheetRef } from '@/components/ui/sheet';
import { ThemedView } from '@/components/themed-view';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { ExperienceGalleryCarousel } from '@/components/wandr/explore/experience-gallery-carousel';
import { styles } from '@/components/wandr/explore/hidden-gem-detail-screen.styles';
import { TripMapActionCard } from '@/components/wandr/explore/trip-map-action-card';
import { TripFitSummary } from '@/components/wandr/explore/trip-fit-summary';
import { TripSwitcher } from '@/components/wandr/trip/trip-switcher';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { ExploreHiddenGem } from '@/constants/explore-content';
import { getHiddenGemSlug, type HiddenGemDetailContent } from '@/constants/hidden-gems-content';
import type { Id } from '@/convex/_generated/dataModel';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useRequireAuthAction } from '@/hooks/use-require-auth-action';
import { bookExperienceRef, createTripRef, getExplorePageContentRef, getLocationLikeStateRef, listUserTripsRef, toggleLocationLikeRef } from '@/lib/convex';
import { getTripActionState } from '@/lib/trip-action-state';

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
  const router = useRouter();
  const { slug: routeSlug } = useLocalSearchParams<{ slug: string }>();
  const slug = slugProp ?? routeSlug;
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();
  const requireAuthAction = useRequireAuthAction();
  const travelerSlug = traveler?.slug ?? '';
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });
  const trips = useQuery(listUserTripsRef, travelerSlug ? { travelerSlug } : 'skip');
  const likeState = useQuery(
    getLocationLikeStateRef,
    travelerSlug && typeof slug === 'string'
      ? { travelerSlug, locationKind: 'location', locationSlug: slug }
      : 'skip'
  );
  const bookExperience = useMutation(bookExperienceRef);
  const createTrip = useMutation(createTripRef);
  const toggleLocationLike = useMutation(toggleLocationLikeRef);
  const tripSheetRef = useRef<SheetRef>(null);
  const [bookingAction, setBookingAction] = useState<'primary' | null>(null);
  const [bookingTripId, setBookingTripId] = useState<string | null>(null);
  const [optimisticLiked, setOptimisticLiked] = useState<{ slug: string; liked: boolean } | null>(null);

  if (!slug || page === undefined || page === null) {
    return <HiddenGemDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} />;
  }

  const card = page.search.gems.items.find((item) => getHiddenGemSlug(item.title, item.slug) === slug);
  const detail = card ? buildHiddenGemDetail(slug, card) : null;

  if (!detail || !card) {
    return <HiddenGemDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} />;
  }
  const isLiked = optimisticLiked?.slug === slug ? optimisticLiked.liked : likeState?.liked ?? false;
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
  const userTrips = trips ?? [];
  const tripActionState = getTripActionState({
    destination: {
      coordinate: card.coordinate,
      countryCode: card.countryCode,
      countryLabel: card.countryLabel,
      labels: [
        card.description,
        card.geography?.region,
        card.geography?.town,
      ],
      locationLabel: detail.locationLabel,
      planningLocationId: card.planningLocationId,
      title: detail.title,
    },
    kind: 'placeSave',
    trips: userTrips,
  });

  const handleToggleLike = async () => {
    if (!requireAuthAction() || !travelerSlug) {
      return;
    }

    const nextLiked = !isLiked;
    setOptimisticLiked({ slug, liked: nextLiked });

    try {
      const result = await toggleLocationLike({
        travelerSlug,
        locationKind: 'location',
        locationSlug: slug,
      });
      setOptimisticLiked({ slug, liked: result.liked });
    } catch {
      setOptimisticLiked(null);
    }
  };

  const saveHiddenGemToTrip = async (tripId?: Id<'trips'>) => {
    await bookExperience({
      experienceSlug: slug,
      travelerSlug,
      tripId,
    });
  };

  const addHiddenGemToTrip = async (tripId?: Id<'trips'>) => {
    if (bookingAction || !requireAuthAction() || !travelerSlug) {
      return;
    }

    setBookingTripId(tripId ?? null);
    setBookingAction('primary');
    try {
      await saveHiddenGemToTrip(tripId);
      tripSheetRef.current?.close();
    } finally {
      setBookingTripId(null);
      setBookingAction(null);
    }
  };

  const startTripWithHiddenGem = async () => {
    if (bookingAction || !requireAuthAction() || !travelerSlug) {
      return;
    }

    setBookingAction('primary');
    try {
      tripSheetRef.current?.close();
      const tripId = await createTrip({
        name: tripActionState.newTripName,
        travelerSlug,
      });
      await saveHiddenGemToTrip(tripId);
      router.push('/trip');
    } finally {
      setBookingAction(null);
    }
  };

  const handleAddToTripPress = () => {
    if (!requireAuthAction()) {
      return;
    }

    if (tripActionState.primaryAction === 'createTrip') {
      void startTripWithHiddenGem();
      return;
    }

    if (tripActionState.primaryAction === 'usePreferredTrip' && tripActionState.preferredTrip) {
      void addHiddenGemToTrip(tripActionState.preferredTrip._id as Id<'trips'>);
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
              accessibilityLabel: isLiked ? 'Remove saved location' : 'Save location',
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

          {detail.tripFit.length > 0 ? <TripFitSummary items={detail.tripFit} /> : null}

          {detail.sections.length > 0 ? (
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
          ) : null}

          {detail.visitTips.length > 0 ? (
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
          ) : null}

          <TripMapActionCard
            centerCoordinate={mapCenterCoordinate}
            loadingAction={bookingAction}
            markers={mapMarkers}
            primaryLabel={tripActionState.primaryLabel}
            secondaryLabel={tripActionState.secondaryLabel}
            onSecondaryPress={tripActionState.secondaryLabel ? () => tripSheetRef.current?.snapToIndex(0) : undefined}
            onPrimaryPress={handleAddToTripPress}
            subtitle={tripActionState.cardSubtitle}
            title={tripActionState.cardTitle}
          />
        </View>
      </ScrollView>

      <Sheet
        ref={tripSheetRef}
        index={-1}
        snapPoints={[520, 'full']}
        enablePanDownToClose>
        <SheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: Math.max(insets.bottom + 24, 36) },
          ]}>
          <View style={styles.sheetHeader}>
            <ThemedText style={styles.sheetTitle}>{tripActionState.sheetTitle}</ThemedText>
            {tripActionState.sheetSubtitle ? (
              <ThemedText style={[styles.sheetSubtitle, isDark ? styles.sheetSubtitleDark : null]}>
                {tripActionState.sheetSubtitle}
              </ThemedText>
            ) : null}
          </View>
          <TripSwitcher
            trips={userTrips}
            selectedTripId={bookingTripId ?? tripActionState.preferredTrip?._id}
            onDeleteTrip={() => {}}
            onNewTrip={() => {
              void startTripWithHiddenGem();
            }}
            onSelectTrip={(tripId) => {
              void addHiddenGemToTrip(tripId as Id<'trips'>);
            }}
            newTripHint="Create a trip from this place"
            newTripLabel="Start new trip"
            showDeleteActions={false}
            variant="compact"
          />
        </SheetScrollView>
      </Sheet>
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
          trailingActions: [{ kind: 'favorite', accessibilityLabel: 'Save location' }],
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + designSystem.spacing.xxxl },
        ]}>
        <View style={styles.carouselContainer}>
          <SkeletonBlock style={styles.heroSkeleton} />
        </View>
        <View style={styles.paddedContent}>
          <View style={styles.titleBlock}>
            <SkeletonBlock style={styles.detailBadgeSkeleton} />
            <SkeletonBlock style={styles.detailTitleSkeleton} />
            <SkeletonBlock style={styles.detailSubtitleSkeleton} />
          </View>
          <SkeletonBlock style={styles.summarySkeleton} />
          <SkeletonBlock style={styles.sectionSkeleton} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function buildHiddenGemDetail(slug: string, card: ExploreHiddenGem): HiddenGemDetailContent {
  return {
    slug,
    title: card.title,
    badge: card.badge ?? 'Location',
    locationLabel: card.locationLabel ?? card.geography?.town ?? card.geography?.region ?? card.countryLabel ?? 'Local detour',
    summary: card.summary ?? card.description,
    tripFit: card.tripFit ?? [],
    sectionsTitle: card.sectionsTitle ?? 'More to know',
    sections: card.sections ?? [],
    visitTips: card.visitTips ?? [],
    primaryLabel: card.primaryLabel ?? 'Add to trip',
    secondaryLabel: card.secondaryLabel ?? 'Back to gems',
  };
}
