import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExperienceFeatureCard, type ExperienceFeatureCardItem } from '@/components/wandr/explore/experience-feature-card';
import { JourneyCtaCard } from '@/components/wandr/explore/journey-cta-card';
import { WandrTravelerGroup } from '@/components/wandr/traveler-group';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import {
  bookExperienceRef,
  ensureExploreCommunitySeedRef,
  getExplorePageContentRef,
  getLocationLikeStateRef,
  getTripDashboardRef,
  getUserItineraryRef,
  hasConvexUrl,
  toggleLocationLikeRef,
} from '@/lib/convex';
import { currentDemoTravelerSlug } from '@/lib/demo-session';

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceInKm(from: readonly [number, number], to: readonly [number, number]) {
  const earthRadiusKm = 6371;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceLabel(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  if (distanceKm < 100) {
    return `${distanceKm.toFixed(1)} km`;
  }

  return `${Math.round(distanceKm)} km`;
}

export default function ExploreExperienceScreen() {
  if (!hasConvexUrl) {
    return null;
  }

  return <ConnectedExploreExperienceScreen />;
}

function ConnectedExploreExperienceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const page = useQuery(getExplorePageContentRef, { slug: 'default' });
  const trip = useQuery(getTripDashboardRef, { travelerSlug: currentDemoTravelerSlug });
  const ensureCommunitySeed = useMutation(ensureExploreCommunitySeedRef);
  const bookExperience = useMutation(bookExperienceRef);
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

  if (!experience) {
    return null;
  }

  const isAlreadyBooked =
    itinerary.some((item) => item.experienceSlug === slug) || optimisticBookedSlug === slug;
  const isLiked = optimisticLiked ?? likeState?.liked ?? false;
  const activeTripCoordinate = trip.activeItem?.experience.coordinate ?? trip.centerCoordinate;
  const bookedDistanceKm =
    isAlreadyBooked && activeTripCoordinate && experience.coordinate
      ? getDistanceInKm(activeTripCoordinate, experience.coordinate)
      : null;
  const bookedDistanceLabel = bookedDistanceKm !== null ? formatDistanceLabel(bookedDistanceKm) : null;
  const bookedCardTitle = bookedDistanceLabel ?? 'On your route';
  const bookedCardDescription =
    bookedDistanceLabel !== null
      ? `${bookedDistanceLabel} from your current stop to ${experience.title}.`
      : 'This experience is already saved in your trip itinerary and ready on your route.';

  const locationLabel = experience.locationLabel ?? page.home.hero.locationLabel;
  const galleryImages = experience.galleryImages?.length ? experience.galleryImages : [experience.imageUri];
  const travelerCount = experience.travelerMomentum?.visitorCount ?? 0;
  const shouldShowTravelerMomentum = travelerCount > 0;
  const travelerHeadingLabel =
    travelerCount === 1
      ? `1 person from ${experience.travelerMomentum?.countryLabel} is visiting`
      : `People from ${experience.travelerMomentum?.countryLabel} are visiting`;
  const travelerSummary = experience.travelerMomentum
    ? `${travelerCount} ${travelerCount === 1 ? 'traveler' : 'travelers'} from ${
        experience.travelerMomentum.countryLabel
      } booked this experience in the app.`
    : null;
  const tripFitItems: readonly ExperienceFeatureCardItem[] =
    experience.tripFit?.length
      ? (experience.tripFit as unknown as ExperienceFeatureCardItem[])
      : [
          experience.category
            ? {
                label: 'Category',
                value: experience.category.toUpperCase(),
                detail: 'A strong fit if this is the energy you want the day to hold.',
                icon: 'compass' as const,
                tone: 'dark' as const,
              }
            : null,
          experience.durationLabel
            ? {
                label: 'Duration',
                value: experience.durationLabel.toUpperCase(),
                detail: 'Useful when you are balancing this booking with the rest of the trip.',
                icon: 'clock' as const,
                tone: 'accent' as const,
              }
            : null,
          experience.groupSizeLabel
            ? {
                label: 'Group Size',
                value: experience.groupSizeLabel.toUpperCase(),
                detail: 'Helps you judge whether this works better solo, as a pair, or with friends.',
                icon: 'users' as const,
                tone: 'light' as const,
              }
            : null,
        ].filter((item): item is NonNullable<typeof item> => Boolean(item)) as ExperienceFeatureCardItem[];

  const saveExperienceToTrip = async (action: 'primary' | 'secondary') => {
    if (bookingAction) {
      return false;
    }

    setBookingAction(action);
    try {
      await bookExperience({
        experienceSlug: experience.slug,
        travelerSlug: currentDemoTravelerSlug,
      });
      setOptimisticBookedSlug(experience.slug);
      return true;
    } finally {
      setBookingAction(null);
    }
  };

  const handleAddToTrip = async () => {
    await saveExperienceToTrip('primary');
  };

  const handleStartJourney = async () => {
    const didBook = await saveExperienceToTrip('secondary');

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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + designSystem.spacing.xxxl },
        ]}>
        <View style={styles.titleBlock}>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{experience.badge}</ThemedText>
          </View>
          <View style={styles.titleStack}>
            <ThemedText
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              numberOfLines={1}
              style={styles.title}>
              {experience.title.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>{locationLabel}</ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.galleryRail}>
          {galleryImages.map((imageUri, index) => (
            <View key={`${imageUri}-${index}`} style={styles.galleryCard}>
              <Image source={imageUri} contentFit="cover" style={styles.galleryImage} />
            </View>
          ))}
        </ScrollView>

        <ThemedText style={styles.summary}>{experience.description}</ThemedText>

        {shouldShowTravelerMomentum && experience.travelerMomentum ? (
          <View style={styles.socialProof}>
            <View style={styles.socialProofCopy}>
              <WandrTravelerGroup count={experience.travelerMomentum.visitorCount} borderColor={designSystem.colors.surface} />
              <ThemedText style={styles.socialProofTitle}>{travelerHeadingLabel}</ThemedText>
            </View>
            <ThemedText style={styles.socialProofText}>{travelerSummary}</ThemedText>
          </View>
        ) : null}

        {tripFitItems.length > 0 ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Trip Fit</ThemedText>
            <View style={styles.tripFitColumn}>
              {tripFitItems.map((item, index) => (
                <ExperienceFeatureCard
                  key={`${item.label}-${item.value}`}
                  {...item}
                  tone={item.tone ?? (index % 3 === 0 ? 'dark' : index % 3 === 1 ? 'light' : 'accent')}
                />
              ))}
            </View>
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
            <JourneyCtaCard
              loadingAction={bookingAction}
              primaryLabel={experience.booking?.addToTripLabel ?? 'Add to trip'}
              secondaryLabel="Start journey"
              onPrimaryPress={() => {
                void handleAddToTrip();
              }}
              onSecondaryPress={() => {
                void handleStartJourney();
              }}
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <JourneyCtaCard
              loadingAction={null}
              title={bookedCardTitle}
              description={bookedCardDescription}
              primaryLabel="View itinerary"
              secondaryLabel="Open map"
              onPrimaryPress={() => router.push('/trip')}
              onSecondaryPress={() => router.push('/trip/map')}
            />
          </View>
        )}
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
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  title: {
    fontSize: 58,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: -1.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
  galleryRail: {
    gap: 12,
    paddingRight: designSystem.spacing.lg,
  },
  galleryCard: {
    width: 340,
    height: 430,
    borderRadius: designSystem.radii.feature,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
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
    fontWeight: '900',
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
    fontWeight: '900',
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  tripFitColumn: {
    gap: 16,
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
});
