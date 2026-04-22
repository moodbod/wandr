import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { AverageSpendSection } from '@/components/wandr/explore/average-spend-section';
import { ExperienceGalleryCarousel } from '@/components/wandr/explore/experience-gallery-carousel';
import { JourneyMapCta } from '@/components/wandr/explore/journey-map-cta';
import { TripFitSummary, type TripFitSummaryItem } from '@/components/wandr/explore/trip-fit-summary';
import { TravelerMomentum } from '@/components/wandr/explore/traveler-momentum';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import {
  bookExperienceRef,
  createTripRef,
  ensureExploreCommunitySeedRef,
  getExplorePageContentRef,
  getLocationLikeStateRef,
  getTripDashboardRef,
  getUserItineraryRef,
  listUserTripsRef,
  toggleLocationLikeRef,
} from '@/lib/convex';
import { currentDemoTravelerSlug } from '@/lib/demo-session';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

export default function ExploreExperienceScreen() {
  return <ConnectedExploreExperienceScreen />;
}

function ConnectedExploreExperienceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: currentDemoTravelerSlug });
  const trips = useQuery(listUserTripsRef, { travelerSlug: currentDemoTravelerSlug });
  const primaryTripId = trips?.[0]?._id;
  const trip = useQuery(getTripDashboardRef, { travelerSlug: currentDemoTravelerSlug, tripId: primaryTripId });
  const ensureCommunitySeed = useMutation(ensureExploreCommunitySeedRef);
  const bookExperience = useMutation(bookExperienceRef);
  const createTrip = useMutation(createTripRef);
  const toggleLocationLike = useMutation(toggleLocationLikeRef);
  const itinerary = useQuery(getUserItineraryRef, { travelerSlug: currentDemoTravelerSlug });
  const likeState = useQuery(getLocationLikeStateRef, {
    travelerSlug: currentDemoTravelerSlug,
    locationKind: 'experience',
    locationSlug: typeof slug === 'string' ? slug : '',
  });
  const [bookingAction, setBookingAction] = useState<'primary' | 'secondary' | null>(null);
  const [optimisticBookedSlug, setOptimisticBookedSlug] = useState<string | null>(null);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  const tripSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    void ensureCommunitySeed({});
  }, [ensureCommunitySeed]);

  useEffect(() => {
    setOptimisticBookedSlug(null);
    setOptimisticLiked(null);
  }, [slug]);

  if (page === undefined || itinerary === undefined || trip === undefined) {
    return null;
  }

  if (page === null || !slug) {
    return null;
  }

  const experience = page.experiences.find((item) => item.slug === slug);
  const activityCard = page.home.activities.find((item) => item.experienceSlug === slug);

  if (!experience) {
    return null;
  }

  const bookedTrips = (itinerary || []).filter((item) => item.experienceSlug === slug);
  const isAlreadyBooked = bookedTrips.length > 0 || optimisticBookedSlug === slug;

  const isLiked = optimisticLiked ?? likeState?.liked ?? false;
  const locationLabel = experience.locationLabel ?? page.home.hero.locationLabel;
  const galleryImages = experience.galleryImages?.length ? experience.galleryImages : [experience.imageUri];
  const bookingMapCenter = experience.coordinate ?? trip.centerCoordinate;
  const bookingMapMarkers = experience.coordinate
    ? [
        {
          id: experience.slug,
          coordinate: experience.coordinate,
          experienceSlug: experience.slug,
          imageUri: experience.imageUri,
          tone: 'accent' as const,
          status: 'active' as const,
        },
      ]
    : [];
  const tripFitItems: readonly TripFitSummaryItem[] =
    experience.tripFit?.length
      ? (experience.tripFit as unknown as TripFitSummaryItem[])
      : [
          experience.category
            ? {
                label: 'Category',
                value: experience.category.toUpperCase(),
                detail: 'A strong fit if this is the energy you want the day to hold.',
              }
            : null,
          experience.durationLabel
            ? {
                label: 'Duration',
                value: experience.durationLabel.toUpperCase(),
                detail: 'Useful when you are balancing this booking with the rest of the trip.',
              }
            : null,
          experience.groupSizeLabel
            ? {
                label: 'Group Size',
                value: experience.groupSizeLabel.toUpperCase(),
                detail: 'Helps you judge whether this works better solo, as a pair, or with friends.',
              }
            : null,
        ].filter((item): item is NonNullable<typeof item> => Boolean(item)) as TripFitSummaryItem[];

  const saveExperienceToTrip = async (action: 'primary' | 'secondary', tripId?: Id<'trips'>) => {
    if (bookingAction) {
      return false;
    }

    setBookingAction(action);
    try {
      await bookExperience({
        experienceSlug: experience.slug,
        travelerSlug: currentDemoTravelerSlug,
        tripId,
      });
      setOptimisticBookedSlug(experience.slug);
      return true;
    } finally {
      setBookingAction(null);
    }
  };

  const handleAddToTripPress = () => {
    tripSheetRef.current?.snapToIndex(0);
  };

  const handleSelectTripForBooking = async (tripId: Id<'trips'>) => {
    tripSheetRef.current?.close();
    await saveExperienceToTrip('primary', tripId);
  };

  const handleStartJourney = async () => {
    if (bookingAction) {
      return;
    }

    const tripTitle = experience.locationLabel
      ? `${experience.locationLabel.split(',')[0]?.trim() ?? experience.title} Trip`
      : `${experience.title} Trip`;

    const tripId = await createTrip({
      name: tripTitle,
      travelerSlug: currentDemoTravelerSlug,
    });

    const didBook = await saveExperienceToTrip('secondary', tripId);

    if (didBook) {
      router.push('/trip');
    }
  };

  const handleToggleLike = async () => {
    const nextLiked = !isLiked;
    setOptimisticLiked(nextLiked);

    try {
      const result = await toggleLocationLike({
        travelerSlug: currentDemoTravelerSlug,
        locationKind: 'experience',
        locationSlug: experience.slug,
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
              accessibilityLabel: isLiked ? 'Remove saved experience' : 'Save experience',
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
        
        <ExperienceGalleryCarousel images={galleryImages} />

        <View style={styles.titleBlock}>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{experience.badge}</ThemedText>
          </View>
          <View style={styles.titleStack}>
            <ThemedText
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              numberOfLines={2}
              style={styles.title}>
              {experience.title.toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.subtitleRow}>
            <ThemedText style={styles.subtitle}>{locationLabel}</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.summary}>{experience.description}</ThemedText>

        {experience.price ? (
          <AverageSpendSection amount={experience.price} priceSuffix={experience.priceSuffix} />
        ) : null}

        {experience.travelerMomentum && (
          <TravelerMomentum
            compact
            regionName={activityCard?.countryLabel ?? experience.travelerMomentum.countryLabel}
            visitorCount={activityCard?.visitorCount ?? experience.travelerMomentum.visitorCount}
            compactProfiles={(activityCard?.visitorNames ?? []).map((name) => ({ id: name, name }))}
            viewerName={activityCard?.viewerName}
            avatars={[]}
            emptyLabel={
              (activityCard?.countryLabel ?? experience.travelerMomentum.countryLabel)
                ? `Be the first traveler from ${activityCard?.countryLabel ?? experience.travelerMomentum.countryLabel} to visit`
                : 'Be the first traveler to visit'
            }
          />
        )}

        {tripFitItems.length > 0 ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Trip Fit</ThemedText>
            <TripFitSummary items={tripFitItems} />
          </View>
        ) : null}

        {experience.includes.length > 0 ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Included</ThemedText>
            <View style={styles.includedList}>
              {experience.includes.map((item) => (
                <View key={item} style={styles.includedRow}>
                  <View style={styles.bullet} />
                  <ThemedText type="defaultSemiBold" style={styles.infoText}>
                    {item}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {!isAlreadyBooked ? (
          <View style={styles.actions}>
            <JourneyMapCta
              centerCoordinate={bookingMapCenter}
              loadingAction={bookingAction}
              markers={bookingMapMarkers}
              primaryLabel="Add to trip"
              secondaryLabel="Start journey"
              onPrimaryPress={handleAddToTripPress}
              onSecondaryPress={handleStartJourney}
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <JourneyMapCta
              centerCoordinate={bookingMapCenter}
              loadingAction={null}
              markers={bookingMapMarkers}
              primaryLabel="Itinerary"
              secondaryLabel="Open map"
              onPrimaryPress={() => router.push('/trip')}
              onSecondaryPress={() => router.push('/trip/map')}
            />
          </View>
        )}
      </ScrollView>

      <GlassBottomSheet ref={tripSheetRef} index={-1} snapPoints={['50%']} enablePanDownToClose>
        <BottomSheetView style={styles.sheetContent}>
          <ThemedText style={styles.sheetTitle}>Add to Trip</ThemedText>
          <ThemedText style={styles.sheetSubtitle}>
            Choose which trip to add this experience to.
          </ThemedText>

          <ScrollView contentContainerStyle={styles.tripList}>
            {(trips?.length ?? 0) === 0 ? (
              <Pressable
                style={[styles.tripOption, styles.tripOptionDefault]}
                onPress={handleStartJourney}>
                <View style={styles.tripOptionIcon}>
                  <Plus size={20} color={designSystem.colors.darkGreen} weight="bold" />
                </View>
                <ThemedText style={styles.tripOptionName}>Create My First Trip</ThemedText>
              </Pressable>
            ) : null}

            {trips?.map((t) => (
              <Pressable
                key={t._id}
                style={styles.tripOption}
                onPress={() => handleSelectTripForBooking(t._id as Id<'trips'>)}>
                {t.previewImage ? (
                  <Image source={t.previewImage} style={styles.tripOptionImage} contentFit="cover" />
                ) : (
                  <View style={styles.tripOptionImagePlaceholder} />
                )}
                <ThemedText style={styles.tripOptionName}>{t.name}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </BottomSheetView>
      </GlassBottomSheet>
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
    paddingTop: 12,
    gap: 8,
  },
  titleStack: {
    width: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.lime,
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  title: {
    ...designSystem.type.title,
    fontSize: 44,
    color: designSystem.colors.ink,
    lineHeight: 44,
  },
  subtitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.warmDark,
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  socialProof: {
    gap: 14,
  },
  socialProofCopy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  socialProofTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  socialProofText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  section: {
    gap: 18,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 30,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  includedList: {
    gap: 12,
  },
  includedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: designSystem.colors.lime,
    marginTop: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 16,
    marginTop: 12,
  },
  sheetContent: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  sheetTitle: {
    ...designSystem.type.subtitle,
    fontSize: 24,
  },
  sheetSubtitle: {
    ...designSystem.type.body,
    color: designSystem.colors.warmDark,
    marginBottom: 8,
  },
  tripList: {
    gap: 12,
  },
  tripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
  },
  tripOptionDefault: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  tripOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripOptionImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  tripOptionImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: designSystem.colors.border,
  },
  tripOptionName: {
    ...designSystem.type.bodyStrong,
    flex: 1,
  },
});
