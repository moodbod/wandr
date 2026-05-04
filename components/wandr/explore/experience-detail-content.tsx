import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { WandrHeader } from '@/components/wandr/header';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
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

export type ExperienceDetailContentProps = {
  slug: string;
  onClose?: () => void;
  hideHeader?: boolean;
};

export function ExperienceDetailContent({ slug, onClose, hideHeader = false }: ExperienceDetailContentProps) {
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
  const trip = useQuery(
    getTripDashboardRef,
    travelerSlug
      ? primaryTripId
        ? { travelerSlug, tripId: primaryTripId }
        : { travelerSlug }
      : 'skip'
  );
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
    return <ExperienceDetailLoadingContent insetsTop={insets.top} isDark={isDark} />;
  }

  if (page === null || !slug) {
    return <ExperienceDetailLoadingContent insetsTop={insets.top} isDark={isDark} />;
  }

  const experience = page.experiences.find((item) => item.slug === slug);

  if (!experience) {
    return <ExperienceDetailLoadingContent insetsTop={insets.top} isDark={isDark} />;
  }

  const bookedTrips = (itinerary || []).filter((item) => item.experienceSlug === slug);
  const isAlreadyBooked = bookedTrips.length > 0 || optimisticBookedSlug === slug;

  const isLiked = optimisticLiked ?? likeState?.liked ?? false;
  const hostGalleryImages = experience.galleryImages?.length ? experience.galleryImages : [experience.imageUri];
  const galleryImages: GalleryImageItem[] = [
    ...hostGalleryImages.map((uri) => ({ uri, source: 'host' as const })),
    ...(communityPhotos ?? [])
      .filter((photo) => !hostGalleryImages.includes(photo.imageUri))
      .map((photo) => ({ uri: photo.imageUri, source: 'visitor' as const })),
  ];

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

  const bookingMapCenter = page.home.hero.centerCoordinate;
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

  return (
    <ThemedView style={[styles.root, isDark && styles.rootDark]}>
      {!hideHeader && (
        <WandrHeader
            config={{
            overlay: true,
            leadingAction: onClose ? { kind: 'back', accessibilityLabel: 'Close', onPress: onClose } : { kind: 'back', accessibilityLabel: 'Go back' },
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
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: hideHeader ? 20 : insets.top + 72, paddingBottom: insets.bottom + designSystem.spacing.xxxl },
        ]}>
        
        <View style={styles.carouselContainer}>
          <ExperienceGalleryCarousel
            height={420}
            images={galleryImages}
          />
        </View>

        <View style={styles.paddedContent}>
          <View style={styles.titleBlock}>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{experience.badge}</ThemedText>
          </View>
          <View style={styles.titleStack}>
            <ThemedText adjustsFontSizeToFit style={styles.title}>{experience.title}</ThemedText>
            <ThemedText style={styles.locationLabel}>{experience.locationLabel}</ThemedText>
          </View>
          </View>

          <ThemedText style={styles.description}>{experience.description}</ThemedText>

          <TripFitSummary items={tripFitItems} />

          <AverageSpendSection
            amount={experience.price}
            priceSuffix={experience.priceSuffix}
          />

          {experience.travelerMomentum ? (
            <View style={styles.momentumSection}>
              <TravelerMomentum
                avatarUris={[...(experience.travelerMomentum.avatarUris ?? [])]}
                regionName={experience.travelerMomentum.countryLabel}
                visitorCount={experience.travelerMomentum.visitorCount}
              />
            </View>
          ) : null}

          <JourneyMapCta
            centerCoordinate={experience.coordinate ?? bookingMapCenter}
            loadingAction={bookingAction}
            markers={bookingMapMarkers}
            onPrimaryPress={handleAddToTripPress}
            onSecondaryPress={handleStartJourney}
            primaryLabel={isAlreadyBooked ? 'Add another' : 'Add to trip'}
            secondaryLabel="Start journey"
          />

          {joinableTrips && joinableTrips.length > 0 ? (
            <View style={styles.joinableSection}>
              <ThemedText style={styles.sectionTitle}>Join a planning circle</ThemedText>
              <View style={styles.joinableList}>
                {joinableTrips.map((joinable) => {
                  const isRequested = requestedCircleIds.includes(joinable.circleId);
                  const isRequesting = requestingCircleId === joinable.circleId;

                  return (
                    <Pressable
                      key={joinable.circleId}
                      onPress={() => void handleRequestJoinTrip(joinable)}
                      style={[
                        styles.joinableCard,
                        { backgroundColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.surface },
                      ]}
                    >
                      <View style={styles.joinableInfo}>
                        <ThemedText style={styles.joinableName}>{joinable.groupName}</ThemedText>
                        <ThemedText style={styles.joinableMeta}>
                          {joinable.memberCount} members
                        </ThemedText>
                      </View>
                      <TravelerAvatarStack avatars={joinable.avatarUris} totalCount={joinable.memberCount} />
                      <View style={[styles.joinButton, (isRequested || isRequesting) && styles.joinButtonDisabled]}>
                        <ThemedText style={styles.joinButtonText}>
                          {isRequested ? 'Requested' : isRequesting ? '...' : 'Join'}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <GlassBottomSheet ref={tripSheetRef} index={-1} snapPoints={['60%', '90%']}>
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <ThemedText style={styles.sheetTitle}>Add to trip</ThemedText>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            {trips?.map((t) => (
              <Pressable
                key={t._id}
                onPress={() => void handleSelectTripForBooking(t._id as Id<'trips'>)}
                style={styles.tripRow}
              >
                <ThemedText style={styles.tripName}>{t.name}</ThemedText>
                <ThemedText style={styles.tripMeta}>{t.dayCount} days</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </BottomSheetView>
      </GlassBottomSheet>
    </ThemedView>
  );
}

function ExperienceDetailLoadingContent({ insetsTop, isDark }: { insetsTop: number; isDark: boolean }) {
  return (
    <ThemedView style={styles.root}>
      <View style={[styles.loadingHeader, { paddingTop: insetsTop + 20 }]}>
        <ActivityIndicator color={isDark ? designSystem.colors.white : designSystem.colors.ink} />
      </View>
      <View style={styles.loadingBody}>
        <SkeletonBlock style={{ height: 300, width: '100%', borderRadius: 0 }} />
        <View style={styles.paddedContent}>
          <SkeletonBlock style={{ height: 40, width: '80%', borderRadius: 8 }} />
          <SkeletonBlock style={{ height: 20, width: '40%', borderRadius: 4 }} />
          <View style={{ gap: 12, marginTop: 24 }}>
            <SkeletonBlock style={{ height: 16, width: '100%', borderRadius: 4 }} />
            <SkeletonBlock style={{ height: 16, width: '100%', borderRadius: 4 }} />
            <SkeletonBlock style={{ height: 16, width: '90%', borderRadius: 4 }} />
          </View>
        </View>
      </View>
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
  momentumSection: {
    paddingVertical: 8,
  },
  joinableSection: {
    gap: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  joinableList: {
    gap: 12,
  },
  joinableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    gap: 12,
  },
  joinableInfo: {
    flex: 1,
    gap: 4,
  },
  joinableName: {
    fontSize: 16,
    fontWeight: '600',
  },
  joinableMeta: {
    fontSize: 13,
    color: designSystem.colors.gray,
  },
  joinButton: {
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tripMeta: {
    fontSize: 14,
    color: designSystem.colors.gray,
  },
  loadingHeader: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  loadingBody: {
    flex: 1,
    gap: 24,
  },
});
