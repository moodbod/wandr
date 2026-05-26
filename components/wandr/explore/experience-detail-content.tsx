import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { AverageSpendSection } from '@/components/wandr/explore/average-spend-section';
import { ExperienceGalleryCarousel, type GalleryImageItem } from '@/components/wandr/explore/experience-gallery-carousel';
import {
  ExperienceRequestFields,
  getExperienceRequestScheduledFor,
  parseExperiencePriceSnapshot,
} from '@/components/wandr/explore/experience-request-fields';
import { JourneyMapCta } from '@/components/wandr/explore/journey-map-cta';
import { TravelerMomentum } from '@/components/wandr/explore/traveler-momentum';
import { TripFitSummary, type TripFitSummaryItem } from '@/components/wandr/explore/trip-fit-summary';
import { WandrHeader } from '@/components/wandr/header';
import { largeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useRequireAuthAction } from '@/hooks/use-require-auth-action';
import { useResponsive } from '@/hooks/use-responsive';
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
  const { isLargeScreen, isTablet } = useResponsive();
  const largeDetailTopInset = isLargeScreen && !hideHeader ? 16 : 0;
  const useWebActivityCardFrame = Platform.OS === 'web' && isLargeScreen;
  const webActivityCardImageWidth =
    (isTablet ? largeScreenWorkspace.mainColumnTabletWidth : largeScreenWorkspace.mainColumnWidth) - 32;
  const traveler = useCurrentTraveler();
  const requireAuthAction = useRequireAuthAction();
  const travelerSlug = traveler?.slug ?? '';
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });
  const trips = useQuery(listUserTripsRef, travelerSlug ? { travelerSlug } : 'skip');
  const joinableTrips = useQuery(
    getExploreJoinableTripsRef,
    typeof slug === 'string' ? { experienceSlug: slug, ...(travelerSlug ? { travelerSlug } : {}) } : 'skip'
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
  const itinerary = useQuery(getUserItineraryRef, travelerSlug ? { travelerSlug } : 'skip');
  const communityPhotos = useQuery(
    listLocationPhotosRef,
    typeof slug === 'string' ? { locationKind: 'experience', locationSlug: slug } : 'skip'
  );
  const likeState = useQuery(
    getLocationLikeStateRef,
    travelerSlug ? { travelerSlug, locationKind: 'experience', locationSlug: slug } : 'skip'
  );
  const [bookingAction, setBookingAction] = useState<'primary' | 'secondary' | null>(null);
  const [requestingCircleId, setRequestingCircleId] = useState<string | null>(null);
  const [requestedCircleIds, setRequestedCircleIds] = useState<string[]>([]);
  const [optimisticBookedSlug, setOptimisticBookedSlug] = useState<string | null>(null);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [requestDayOffset, setRequestDayOffset] = useState(1);
  const [requestPartySize, setRequestPartySize] = useState(2);
  const [requestNote, setRequestNote] = useState('');

  const tripSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    setOptimisticBookedSlug(null);
    setOptimisticLiked(null);
  }, [slug]);

  if (page === undefined || (travelerSlug && (trips === undefined || itinerary === undefined || trip === undefined))) {
    return (
      <ExperienceDetailLoadingContent
        hideHeader={hideHeader}
        insetsBottom={insets.bottom}
        insetsTop={insets.top}
        isDark={isDark}
        largeDetailTopInset={largeDetailTopInset}
        onClose={onClose}
      />
    );
  }

  if (page === null || !slug) {
    return (
      <ExperienceDetailLoadingContent
        hideHeader={hideHeader}
        insetsBottom={insets.bottom}
        insetsTop={insets.top}
        isDark={isDark}
        largeDetailTopInset={largeDetailTopInset}
        onClose={onClose}
      />
    );
  }

  const experience = page.experiences.find((item) => item.slug === slug);

  if (!experience) {
    return (
      <ExperienceDetailLoadingContent
        hideHeader={hideHeader}
        insetsBottom={insets.bottom}
        insetsTop={insets.top}
        isDark={isDark}
        largeDetailTopInset={largeDetailTopInset}
        onClose={onClose}
      />
    );
  }

  const bookedTrips = (itinerary || []).filter((item) => item.experienceSlug === slug);
  const isAlreadyBooked = bookedTrips.length > 0 || optimisticBookedSlug === slug;
  const hasExistingTrips = (trips?.length ?? 0) > 0;

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

  const bookSelectedExperience = async (tripId?: Id<'trips'>) => {
    await bookExperience({
      experienceSlug: experience.slug,
      travelerSlug,
      tripId,
      scheduledFor: getExperienceRequestScheduledFor(requestDayOffset),
      partySize: requestPartySize,
      travelerNote: requestNote,
      currencyCode: 'USD',
      priceSnapshot: parseExperiencePriceSnapshot(experience.price),
    });
    setOptimisticBookedSlug(experience.slug);
  };

  const saveExperienceToTrip = async (action: 'primary' | 'secondary', tripId?: Id<'trips'>) => {
    if (!requireAuthAction() || !travelerSlug) {
      return false;
    }

    if (bookingAction) {
      return false;
    }

    setBookingAction(action);
    try {
      await bookSelectedExperience(tripId);
      return true;
    } finally {
      setBookingAction(null);
    }
  };

  const handleAddToTripPress = () => {
    if (!requireAuthAction()) {
      return;
    }

    tripSheetRef.current?.snapToIndex(0);
  };

  const handleSelectTripForBooking = async (tripId: Id<'trips'>) => {
    tripSheetRef.current?.close();
    await saveExperienceToTrip('primary', tripId);
  };

  const handleRequestJoinTrip = async (joinableTrip: ExploreJoinableTrip) => {
    if (!requireAuthAction() || !travelerSlug || requestingCircleId || requestedCircleIds.includes(joinableTrip.circleId)) {
      return;
    }

    setRequestingCircleId(joinableTrip.circleId);
    try {
      const requested = await requestJoinTrip({
        travelerSlug,
        circleId: joinableTrip.circleId as Id<'circles'>,
        experienceSlug: experience.slug,
      });

      if (requested) {
        setRequestedCircleIds((current) => [...current, joinableTrip.circleId]);
      }
    } finally {
      setRequestingCircleId(null);
    }
  };

  const handleStartJourney = async (action: 'primary' | 'secondary' = 'secondary') => {
    if (!requireAuthAction() || !travelerSlug) {
      return;
    }

    if (bookingAction) {
      return;
    }

    const tripTitle = experience.locationLabel
      ? `${experience.locationLabel.split(',')[0]?.trim() ?? experience.title} Trip`
      : `${experience.title} Trip`;

    setBookingAction(action);
    try {
      tripSheetRef.current?.close();
      const tripId = await createTrip({
        name: tripTitle,
        travelerSlug,
      });

      await bookSelectedExperience(tripId);
      router.push('/trip');
    } finally {
      setBookingAction(null);
    }
  };

  const handleToggleLike = async () => {
    if (!requireAuthAction() || !travelerSlug) {
      return;
    }

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
    if (!requireAuthAction() || !travelerSlug || isUploadingPhoto) {
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
      Alert.alert('Photo submitted', 'A manager will approve it before it appears in the gallery.');
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
          extraTopInset={largeDetailTopInset}
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
          { paddingTop: hideHeader ? 20 : insets.top + 72 + largeDetailTopInset, paddingBottom: insets.bottom + designSystem.spacing.xxxl },
        ]}>
        
        <View
          style={[
            styles.carouselContainer,
            useWebActivityCardFrame ? { height: webActivityCardImageWidth / 1.5 } : null,
          ]}
        >
          <ExperienceGalleryCarousel
            cardHorizontalInset={useWebActivityCardFrame ? 16 : undefined}
            frameBorderRadius={useWebActivityCardFrame ? 9 : undefined}
            height={useWebActivityCardFrame ? webActivityCardImageWidth / 1.5 : 420}
            images={galleryImages}
            maxCardWidth={useWebActivityCardFrame ? webActivityCardImageWidth : undefined}
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
            onSecondaryPress={
              hasExistingTrips
                ? () => {
                    void handleStartJourney('secondary');
                  }
                : undefined
            }
            primaryLabel={hasExistingTrips ? (isAlreadyBooked ? 'Request another' : 'Request') : 'Start journey'}
            secondaryLabel={hasExistingTrips ? 'Start new journey' : undefined}
            variant={useWebActivityCardFrame ? 'webDetail' : 'default'}
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
                      <TravelerAvatarStack
                        avatars={joinable.avatarUris}
                        fallbackName={joinable.groupName}
                        fallbackPaletteKey={joinable.circleId}
                        totalCount={joinable.memberCount}
                      />
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

      <GlassBottomSheet
        ref={tripSheetRef}
        index={-1}
        snapPoints={['60%', '90%']}>
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <ThemedText style={styles.sheetTitle}>Request experience</ThemedText>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <ExperienceRequestFields
              dayOffset={requestDayOffset}
              isDark={isDark}
              note={requestNote}
              onChangeDayOffset={setRequestDayOffset}
              onChangeNote={setRequestNote}
              onChangePartySize={setRequestPartySize}
              partySize={requestPartySize}
            />
            {(trips?.length ?? 0) === 0 ? (
              <Pressable
                onPress={() => {
                  void handleStartJourney('primary');
                }}
                style={[styles.tripRow, isDark && styles.tripRowDark]}
              >
                <ThemedText style={styles.tripName}>Start new journey</ThemedText>
                <ThemedText style={styles.tripMeta}>Create trip</ThemedText>
              </Pressable>
            ) : null}
            {trips?.map((t) => (
              <Pressable
                key={t._id}
                onPress={() => void handleSelectTripForBooking(t._id as Id<'trips'>)}
                style={[styles.tripRow, isDark && styles.tripRowDark]}
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

function ExperienceDetailLoadingContent({
  hideHeader,
  insetsBottom,
  insetsTop,
  isDark,
  largeDetailTopInset,
  onClose,
}: {
  hideHeader: boolean;
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
  largeDetailTopInset: number;
  onClose?: () => void;
}) {
  return (
    <ThemedView style={[styles.root, isDark && styles.rootDark]}>
      {!hideHeader ? (
        <WandrHeader
          extraTopInset={largeDetailTopInset}
          config={{
            overlay: true,
            leadingAction: onClose
              ? { kind: 'back', accessibilityLabel: 'Close', onPress: onClose }
              : { kind: 'back', accessibilityLabel: 'Go back' },
            trailingActions: [
              { kind: 'plus', accessibilityLabel: 'Share photo' },
              { kind: 'favorite', accessibilityLabel: 'Save experience' },
            ],
          }}
        />
      ) : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: hideHeader ? 20 : insetsTop + 72 + largeDetailTopInset, paddingBottom: insetsBottom + designSystem.spacing.xxxl },
        ]}
      >
        <View style={styles.loadingCarouselContainer}>
          <SkeletonBlock style={styles.loadingHeroFrame} />
        </View>

        <View style={styles.paddedContent}>
          <View style={styles.titleBlock}>
            <SkeletonBlock style={styles.loadingBadge} />
            <View style={styles.titleStack}>
              <SkeletonBlock style={styles.loadingTitle} />
              <SkeletonBlock style={styles.loadingLocation} />
            </View>
          </View>

          <View style={styles.loadingParagraph}>
            <SkeletonBlock style={styles.loadingParagraphLine} />
            <SkeletonBlock style={styles.loadingParagraphLine} />
            <SkeletonBlock style={styles.loadingParagraphShortLine} />
          </View>

          <View style={styles.loadingFitStack}>
            {Array.from({ length: 3 }).map((_, index) => (
              <View
                key={`experience-detail-fit-skeleton-${index}`}
                style={[styles.loadingFitRow, index < 2 ? styles.loadingFitRowBorder : null]}
              >
                <View style={styles.loadingFitCopy}>
                  <SkeletonBlock style={styles.loadingFitLabel} />
                  <SkeletonBlock style={styles.loadingFitValue} />
                </View>
                <SkeletonBlock style={styles.loadingFitIcon} />
              </View>
            ))}
          </View>

          <View style={styles.loadingSpendSection}>
            <SkeletonBlock style={styles.loadingSpendLead} />
            <SkeletonBlock style={styles.loadingSpendAmount} />
            <View style={styles.loadingSpendNote}>
              <SkeletonBlock style={styles.loadingParagraphLine} />
              <SkeletonBlock style={styles.loadingParagraphShortLine} />
            </View>
          </View>
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
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripRowDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tripMeta: {
    fontSize: 14,
    color: designSystem.colors.gray,
  },
  loadingCarouselContainer: {
    height: 420,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  loadingHeroFrame: {
    alignSelf: 'center',
    borderRadius: 34,
    height: 420,
    maxWidth: 344,
    width: '88%',
  },
  loadingBadge: {
    borderRadius: 20,
    height: 28,
    width: 118,
  },
  loadingTitle: {
    borderRadius: 12,
    height: 38,
    width: '88%',
  },
  loadingLocation: {
    borderRadius: 9,
    height: 18,
    width: '44%',
  },
  loadingParagraph: {
    gap: 9,
  },
  loadingParagraphLine: {
    borderRadius: 8,
    height: 17,
    width: '100%',
  },
  loadingParagraphShortLine: {
    borderRadius: 8,
    height: 17,
    width: '78%',
  },
  loadingFitStack: {
    borderBottomWidth: 1,
    borderColor: designSystem.colors.border,
    borderTopWidth: 1,
  },
  loadingFitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.md,
    paddingVertical: 16,
  },
  loadingFitRowBorder: {
    borderBottomWidth: 1,
    borderColor: designSystem.colors.border,
  },
  loadingFitCopy: {
    flex: 1,
    gap: 6,
  },
  loadingFitLabel: {
    borderRadius: 7,
    height: 14,
    width: 82,
  },
  loadingFitValue: {
    borderRadius: 9,
    height: 20,
    width: 128,
  },
  loadingFitIcon: {
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  loadingSpendSection: {
    gap: 10,
    paddingVertical: designSystem.spacing.xl,
  },
  loadingSpendLead: {
    borderRadius: 10,
    height: 22,
    width: 178,
  },
  loadingSpendAmount: {
    borderRadius: 14,
    height: 34,
    width: 128,
  },
  loadingSpendNote: {
    gap: 8,
    maxWidth: '88%',
  },
});
