import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { AverageSpendSection } from '@/components/wandr/explore/average-spend-section';
import { ExperienceGalleryCarousel, type GalleryImageItem } from '@/components/wandr/explore/experience-gallery-carousel';
import { JourneyMapCta } from '@/components/wandr/explore/journey-map-cta';
import { TravelerMomentum } from '@/components/wandr/explore/traveler-momentum';
import { TripFitSummary, type TripFitSummaryItem } from '@/components/wandr/explore/trip-fit-summary';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import {
  bookExperienceRef,
  createTripRef,
  generateLocationPhotoUploadUrlRef,
  getExploreJoinableTripsRef,
  getExplorePageContentRef,
  getLocationLikeStateRef,
  getTripDashboardRef,
  getUserItineraryRef,
  listLocationPhotosRef,
  listUserTripsRef,
  requestJoinExploreTripRef,
  submitLocationPhotoRef,
  toggleLocationLikeRef,
} from '@/lib/convex';
import type { ExploreJoinableTrip } from '@/types/explore';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

export default function ExploreExperienceScreen() {
  return <ConnectedExploreExperienceScreen />;
}

function ConnectedExploreExperienceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();
  const travelerSlug = traveler?.slug ?? '';
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });
  const trips = useQuery(listUserTripsRef, { travelerSlug });
  const joinableTrips = useQuery(
    getExploreJoinableTripsRef,
    travelerSlug && typeof slug === 'string' ? { experienceSlug: slug, travelerSlug } : 'skip'
  );
  const primaryTripId = trips?.[0]?._id;
  const trip = useQuery(getTripDashboardRef, { travelerSlug, tripId: primaryTripId });
  const bookExperience = useMutation(bookExperienceRef);
  const createTrip = useMutation(createTripRef);
  const requestJoinTrip = useMutation(requestJoinExploreTripRef);
  const toggleLocationLike = useMutation(toggleLocationLikeRef);
  const generatePhotoUploadUrl = useMutation(generateLocationPhotoUploadUrlRef);
  const submitLocationPhoto = useMutation(submitLocationPhotoRef);
  const itinerary = useQuery(getUserItineraryRef, { travelerSlug });
  const communityPhotos = useQuery(
    listLocationPhotosRef,
    typeof slug === 'string' ? { locationKind: 'experience', locationSlug: slug } : 'skip'
  );
  const likeState = useQuery(getLocationLikeStateRef, {
    travelerSlug,
    locationKind: 'experience',
    locationSlug: typeof slug === 'string' ? slug : '',
  });
  const [bookingAction, setBookingAction] = useState<'primary' | 'secondary' | null>(null);
  const [requestingCircleId, setRequestingCircleId] = useState<string | null>(null);
  const [requestedCircleIds, setRequestedCircleIds] = useState<string[]>([]);
  const [optimisticBookedSlug, setOptimisticBookedSlug] = useState<string | null>(null);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const tripSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    setOptimisticBookedSlug(null);
    setOptimisticLiked(null);
  }, [slug]);

  if (page === undefined || itinerary === undefined || trip === undefined) {
    return <ExperienceDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} isDark={isDark} />;
  }

  if (page === null || !slug) {
    return <ExperienceDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} isDark={isDark} />;
  }

  const experience = page.experiences.find((item) => item.slug === slug);
  const activityCard = page.home.activities.find((item) => item.experienceSlug === slug);

  if (!experience) {
    return <ExperienceDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} isDark={isDark} />;
  }

  const bookedTrips = (itinerary || []).filter((item) => item.experienceSlug === slug);
  const isAlreadyBooked = bookedTrips.length > 0 || optimisticBookedSlug === slug;

  const isLiked = optimisticLiked ?? likeState?.liked ?? false;
  const locationLabel = experience.locationLabel ?? page.home.hero.locationLabel;
  const hostGalleryImages = experience.galleryImages?.length ? experience.galleryImages : [experience.imageUri];
  const galleryImages: GalleryImageItem[] = [
    ...hostGalleryImages.map((uri) => ({ uri, source: 'host' as const })),
    ...(communityPhotos ?? [])
      .filter((photo) => !hostGalleryImages.includes(photo.imageUri))
      .map((photo) => ({ uri: photo.imageUri, source: 'visitor' as const })),
  ];
  const bookingMapCenter = experience.coordinate ?? trip.centerCoordinate ?? page.home.hero.centerCoordinate;
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
                value: experience.category,
                detail: 'A strong fit if this is the energy you want the day to hold.',
              }
            : null,
          experience.durationLabel
            ? {
                label: 'Duration',
                value: experience.durationLabel,
                detail: 'Useful when you are balancing this booking with the rest of the trip.',
              }
            : null,
          experience.groupSizeLabel
            ? {
                label: 'Group Size',
                value: experience.groupSizeLabel,
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
        travelerSlug,
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

  const handleRequestJoinTrip = async (joinableTrip: ExploreJoinableTrip) => {
    if (!travelerSlug || requestingCircleId || requestedCircleIds.includes(joinableTrip.circleId)) {
      return;
    }

    setRequestingCircleId(joinableTrip.circleId);
    try {
      const requested = await requestJoinTrip({
        travelerSlug,
        circleId: joinableTrip.circleId as Id<'friendCircles'>,
        experienceSlug: experience.slug,
      });

      if (requested) {
        setRequestedCircleIds((current) => [...current, joinableTrip.circleId]);
      }
    } finally {
      setRequestingCircleId(null);
    }
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
      travelerSlug,
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
        travelerSlug,
        locationKind: 'experience',
        locationSlug: experience.slug,
      });
      setOptimisticLiked(result.liked);
    } catch {
      setOptimisticLiked(null);
    }
  };

  const handleSharePhoto = async () => {
    if (!travelerSlug || isUploadingPhoto) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos permission needed', 'Allow photo access to share a picture for this place.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ['images'],
      quality: 0.88,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const uploadUrl = await generatePhotoUploadUrl({});
      const photoResponse = await fetch(asset.uri);
      const blob = await photoResponse.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': asset.mimeType ?? blob.type ?? 'image/jpeg' },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
      await submitLocationPhoto({
        locationKind: 'experience',
        locationSlug: experience.slug,
        travelerSlug,
        storageId,
      });
    } catch {
      Alert.alert('Photo upload failed', 'Could not share that picture. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <ThemedView style={[styles.root, isDark && styles.rootDark]}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          trailingActions: [
            {
              kind: 'plus',
              accessibilityLabel: isUploadingPhoto ? 'Uploading photo' : 'Share photo',
              isLoading: isUploadingPhoto,
              onPress: () => {
                void handleSharePhoto();
              },
            },
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
        
        <View style={styles.carouselContainer}>
          <ExperienceGalleryCarousel
            images={galleryImages}
          />
        </View>

        <View style={styles.paddedContent}>
          <View style={styles.titleBlock}>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{experience.badge}</ThemedText>
          </View>
          <View style={styles.titleStack}>
            <ThemedText
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              numberOfLines={2}
              style={[styles.title, isDark && styles.titleDark]}>
              {experience.title}
            </ThemedText>
          </View>
          <View style={styles.subtitleRow}>
            <ThemedText style={[styles.subtitle, isDark && styles.subtitleDark]}>{locationLabel}</ThemedText>
          </View>
        </View>

        <ThemedText style={[styles.summary, isDark && styles.summaryDark]}>{experience.description}</ThemedText>

        {experience.price ? (
          <AverageSpendSection amount={experience.price} priceSuffix={experience.priceSuffix} />
        ) : null}

        {experience.travelerMomentum && (
          <View style={styles.socialProof}>
            <TravelerMomentum
              regionName={activityCard?.countryLabel ?? experience.travelerMomentum.countryLabel}
              visitorCount={activityCard?.visitorCount ?? experience.travelerMomentum.visitorCount}
              avatarUris={activityCard?.avatarUris ?? experience.travelerMomentum.avatarUris ?? []}
            />
          </View>
        )}

        {tripFitItems.length > 0 ? (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Trip Fit</ThemedText>
            <TripFitSummary items={tripFitItems} />
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
      </View>
    </ScrollView>

    <GlassBottomSheet ref={tripSheetRef} index={-1} snapPoints={['50%']} enablePanDownToClose>
        <BottomSheetView style={styles.sheetContent}>
          <ThemedText style={[styles.sheetTitle, isDark && styles.sheetTitleDark]}>Add to Trip</ThemedText>
          <ThemedText style={[styles.sheetSubtitle, isDark && styles.sheetSubtitleDark]}>
            Choose which trip to add this experience to.
          </ThemedText>

          <ScrollView contentContainerStyle={styles.tripList}>
            {(joinableTrips?.length ?? 0) > 0 ? (
              <View style={styles.publicTripSection}>
                <View style={styles.publicTripHeader}>
                  <ThemedText style={[styles.publicTripTitle, isDark && styles.sheetTitleDark]}>
                    Public trips for this experience
                  </ThemedText>
                  <ThemedText style={[styles.publicTripSubtitle, isDark && styles.sheetSubtitleDark]}>
                    Join someone else’s plan if this route already fits your trip.
                  </ThemedText>
                </View>

                {joinableTrips?.map((joinableTrip) => {
                  const hasRequested = requestedCircleIds.includes(joinableTrip.circleId);
                  const isRequesting = requestingCircleId === joinableTrip.circleId;

                  return (
                    <View key={joinableTrip.circleId} style={styles.publicTripOption}>
                      <View style={styles.publicTripCopy}>
                        <ThemedText style={styles.publicTripName}>{joinableTrip.groupName}</ThemedText>
                        <ThemedText style={[styles.publicTripMeta, isDark && styles.sheetSubtitleDark]}>
                          {joinableTrip.hostName} • {joinableTrip.memberCount} travelers • {joinableTrip.destinationLabel}
                        </ThemedText>
                        <TravelerAvatarStack avatars={joinableTrip.avatarUris} totalCount={joinableTrip.memberCount} />
                      </View>
                      <Pressable
                        accessibilityLabel={hasRequested ? 'Join request sent' : `Join ${joinableTrip.groupName}`}
                        disabled={hasRequested || isRequesting}
                        onPress={() => {
                          void handleRequestJoinTrip(joinableTrip);
                        }}
                        style={[
                          styles.publicTripJoinButton,
                          hasRequested || isRequesting ? styles.publicTripJoinButtonDisabled : null,
                        ]}>
                        <ThemedText style={styles.publicTripJoinText}>
                          {hasRequested ? 'Requested' : isRequesting ? 'Joining' : 'Join'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : null}

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

function ExperienceDetailLoadingScreen({
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootDark: {
    backgroundColor: designSystem.colors.darkBackground,
  },
  content: {
    gap: designSystem.spacing.xxxl,
  },
  carouselContainer: {
    width: '100%',
  },
  paddedContent: {
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
  titleDark: {
    color: designSystem.colors.darkText,
  },
  subtitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.warmDark,
  },
  subtitleDark: {
    color: designSystem.colors.darkMutedText,
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sectionTitleDark: {
    color: designSystem.colors.darkText,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  summaryDark: {
    color: designSystem.colors.darkMutedText,
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
  sheetTitleDark: {
    color: designSystem.colors.darkText,
  },
  sheetSubtitle: {
    ...designSystem.type.body,
    color: designSystem.colors.warmDark,
    marginBottom: 8,
  },
  sheetSubtitleDark: {
    color: designSystem.colors.darkMutedText,
  },
  tripList: {
    gap: 12,
  },
  publicTripSection: {
    gap: 12,
    paddingBottom: 4,
  },
  publicTripHeader: {
    gap: 4,
  },
  publicTripTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  publicTripSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.warmDark,
  },
  publicTripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
  },
  publicTripCopy: {
    flex: 1,
    gap: 8,
  },
  publicTripName: {
    ...designSystem.type.bodyStrong,
  },
  publicTripMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.warmDark,
  },
  publicTripJoinButton: {
    minWidth: 82,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 14,
  },
  publicTripJoinButtonDisabled: {
    opacity: 0.7,
  },
  publicTripJoinText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
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
    backgroundColor: designSystem.colors.whiteOverlayStrong,
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
  detailHeroSkeleton: {
    height: 340,
    borderRadius: 34,
    marginHorizontal: designSystem.spacing.lg,
  },
  detailBadgeSkeleton: {
    width: 104,
    height: 30,
    borderRadius: 15,
  },
  detailTitleSkeleton: {
    width: '86%',
    height: 74,
    borderRadius: 24,
  },
  detailSubtitleSkeleton: {
    width: '62%',
    height: 20,
    borderRadius: 10,
  },
  detailBodySkeleton: {
    width: '100%',
    height: 92,
    borderRadius: 24,
  },
  detailPanelSkeleton: {
    width: '100%',
    height: 156,
    borderRadius: 28,
  },
});
