import { useMutation, useQuery } from 'convex/react';
import { GlassView } from 'expo-glass-effect';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { CaretDown, CaretUp, ClockCountdown, MapPin, Star } from 'phosphor-react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { ExperienceGalleryCarousel, type GalleryImageItem } from '@/components/wandr/explore/experience-gallery-carousel';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { WandrHeader } from '@/components/wandr/header';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { getStayBookingProfile } from '@/constants/stays-content';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import {
  createStayBookingRef,
  generateLocationPhotoUploadUrlRef,
  getStayAvailabilityRef,
  getStayBySlugRef,
  getTravelerStayBookingRef,
  listLocationPhotosRef,
  listStayRatingsRef,
  listUserTripsRef,
  submitLocationPhotoRef,
  submitStayRatingRef,
} from '@/lib/convex';
import type {
  StayArrivalOption,
  StayBedOption,
  StayBookingDetails,
  StayBookingProfile,
  StayGuestCounts,
  StayRoomOption,
} from '@/types/stays';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';

const dayOffsets = [0, 1, 3, 7] as const;
const nightOptions = [1, 2, 3, 5] as const;

const darkSheetPalette = {
  background: designSystem.colors.darkPage,
  surface: designSystem.colors.darkCard,
  border: designSystem.colors.darkBorderWarm,
  text: designSystem.colors.darkTextWarm,
  mutedText: designSystem.colors.mutedWarm,
  accent: designSystem.colors.lime,
  accentText: designSystem.colors.darkGreen,
};

function formatDateLabel(value: number) {
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDayOffsetLabel(dayOffset: number) {
  if (dayOffset === 0) {
    return 'Today';
  }
  if (dayOffset === 1) {
    return 'Tomorrow';
  }
  return `In ${dayOffset} days`;
}

function getNightsBetween(checkIn: number, checkOut: number) {
  return Math.max(1, Math.round((checkOut - checkIn) / 86_400_000));
}

function getDayOffsetFromToday(value: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(value);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatReviewDate(value: number) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatReviewCount(count: number) {
  return `${count} review${count === 1 ? '' : 's'}`;
}

function buildGuestSummary(guestCounts: StayGuestCounts) {
  const parts = [`${guestCounts.adults} adult${guestCounts.adults === 1 ? '' : 's'}`];
  if (guestCounts.children > 0) {
    parts.push(`${guestCounts.children} child${guestCounts.children === 1 ? '' : 'ren'}`);
  }
  return parts.join(' + ');
}

function buildRoomSummary(
  roomCount: number,
  roomOption: StayRoomOption,
  bedOption: StayBedOption
) {
  return `${roomCount} ${roomOption.label.toLowerCase()}${roomCount === 1 ? '' : 's'} · ${bedOption.label.toLowerCase()}`;
}

export function StayDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();
  const travelerSlug = traveler?.slug ?? '';

  const currentLocation = useCurrentLocation();
  const createBooking = useMutation(createStayBookingRef);
  const generatePhotoUploadUrl = useMutation(generateLocationPhotoUploadUrlRef);
  const submitLocationPhoto = useMutation(submitLocationPhotoRef);
  const submitStayRating = useMutation(submitStayRatingRef);
  const trips = useQuery(listUserTripsRef, { travelerSlug });
  const selectedTripId = trips?.[0]?._id;

  const stay = useQuery(getStayBySlugRef, { slug: slug ?? '' });
  const availability = useQuery(getStayAvailabilityRef, { staySlug: slug ?? '' });
  const existingStayBooking = useQuery(
    getTravelerStayBookingRef,
    slug && travelerSlug ? { staySlug: slug, travelerSlug } : 'skip'
  );
  const communityPhotos = useQuery(
    listLocationPhotosRef,
    slug ? { locationKind: 'stay', locationSlug: slug } : 'skip'
  );
  const stayRatings = useQuery(listStayRatingsRef, { staySlug: slug ?? '' });

  const [isBooking, setIsBooking] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [dayOffset, setDayOffset] = useState<number>(dayOffsets[0]);
  const [nightCount, setNightCount] = useState<number>(nightOptions[2]);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomCount, setRoomCount] = useState(1);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [selectedBedOptionId, setSelectedBedOptionId] = useState('');
  const [selectedArrivalWindowId, setSelectedArrivalWindowId] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [bookingDateOverride, setBookingDateOverride] = useState<{ checkIn: number; checkOut: number } | null>(null);
  const [bookingTotalOverride, setBookingTotalOverride] = useState<number | null>(null);
  const bookingSheetRef = useRef<BottomSheet>(null);
  const bookingSheetSnapPoints = useMemo(() => ['50%', '100%'], []);
  const bookingSheetAnimatedIndex = useSharedValue(-1);
  const reviewSheetRef = useRef<BottomSheet>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const staySlugForProfile = stay?.slug;
  const explicitBookingProfile = stay?.bookingProfile;
  const bookingProfile: StayBookingProfile | null = useMemo(
    () => (staySlugForProfile ? explicitBookingProfile ?? getStayBookingProfile(staySlugForProfile) : null),
    [explicitBookingProfile, staySlugForProfile]
  );
  const roomOptions = bookingProfile?.roomOptions ?? [];
  const selectedRoomOption =
    roomOptions.find((option) => option.id === selectedRoomTypeId) ?? roomOptions[0];
  const bedOptions = selectedRoomOption?.bedOptions ?? [];
  const selectedBedOption =
    bedOptions.find((option) => option.id === selectedBedOptionId) ?? bedOptions[0];
  const arrivalOptions = bookingProfile?.arrivalOptions ?? [];
  const selectedArrivalOption =
    arrivalOptions.find((option) => option.id === selectedArrivalWindowId) ?? arrivalOptions[0];
  const maxAdults = selectedRoomOption?.maxAdults ?? 2;
  const maxChildren = selectedRoomOption?.maxChildren ?? 0;
  const maxRooms = selectedRoomOption?.maxRooms ?? 1;
  const bookingSheetHeaderAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingTop: interpolate(bookingSheetAnimatedIndex.value, [0, 1], [0, insets.top], 'clamp'),
    };
  });

  useEffect(() => {
    if (!bookingProfile || existingStayBooking) {
      return;
    }

    const initialRoomOption = bookingProfile.roomOptions.find(
      (option) => option.id === bookingProfile.defaultRoomOptionId
    ) ?? bookingProfile.roomOptions[0];
    const initialBedOption = initialRoomOption?.bedOptions[0];
    const initialArrivalOption = bookingProfile.arrivalOptions.find(
      (option) => option.id === bookingProfile.defaultArrivalOptionId
    ) ?? bookingProfile.arrivalOptions[0];

    setSelectedRoomTypeId(initialRoomOption?.id ?? '');
    setSelectedBedOptionId(initialBedOption?.id ?? '');
    setSelectedArrivalWindowId(initialArrivalOption?.id ?? '');
    setRoomCount(1);
    setAdults(Math.min(2, initialRoomOption?.maxAdults ?? 2));
    setChildren(0);
  }, [bookingProfile, existingStayBooking]);

  useEffect(() => {
    if (!selectedRoomOption) {
      return;
    }

    if (!selectedRoomOption.bedOptions.some((option) => option.id === selectedBedOptionId)) {
      setSelectedBedOptionId(selectedRoomOption.bedOptions[0]?.id ?? '');
    }

    if (roomCount > selectedRoomOption.maxRooms) {
      setRoomCount(selectedRoomOption.maxRooms);
    }
    if (adults > selectedRoomOption.maxAdults) {
      setAdults(selectedRoomOption.maxAdults);
    }
    if (children > selectedRoomOption.maxChildren) {
      setChildren(selectedRoomOption.maxChildren);
    }
  }, [selectedRoomOption, selectedBedOptionId, roomCount, adults, children]);

  if (stay === undefined) {
    return <StayDetailLoadingScreen insetsTop={insets.top} insetsBottom={insets.bottom} isDark={isDark} />;
  }

  if (!stay) {
    return null;
  }

  const hostGalleryImages: readonly string[] = stay.galleryImages?.length ? stay.galleryImages : [stay.imageUri];
  const galleryImages: GalleryImageItem[] = [
    ...hostGalleryImages.map((uri) => ({ uri, source: 'host' as const })),
    ...(communityPhotos ?? [])
      .filter((photo) => !hostGalleryImages.includes(photo.imageUri))
      .map((photo) => ({ uri: photo.imageUri, source: 'visitor' as const })),
  ];
  const computedCheckIn = Date.now() + dayOffset * 86_400_000;
  const computedCheckOut = computedCheckIn + nightCount * 86_400_000;
  const checkIn = bookingDateOverride?.checkIn ?? computedCheckIn;
  const checkOut = bookingDateOverride?.checkOut ?? computedCheckOut;
  const nights = getNightsBetween(checkIn, checkOut);
  const selectedDayOffset = getDayOffsetFromToday(checkIn);
  const guestSummary = buildGuestSummary({ adults, children });
  const roomSummary =
    selectedRoomOption && selectedBedOption
      ? buildRoomSummary(roomCount, selectedRoomOption, selectedBedOption)
      : `${roomCount} room`;
  const totalPrice = bookingTotalOverride ?? stay.pricePerNight * nights * roomCount;
  const hasExistingStayBooking = !!existingStayBooking;
  const bookingBarTotalPrice = existingStayBooking?.totalPrice ?? totalPrice;
  const bookingBarNights = existingStayBooking
    ? getNightsBetween(existingStayBooking.checkIn, existingStayBooking.checkOut)
    : nights;
  const confirmedAvailabilityCount = availability?.length ?? 0;
  const reviewItems = stayRatings ?? [];
  const reviewsAreLoading = stayRatings === undefined;
  const realReviewCount = reviewItems.length;
  const realRating =
    realReviewCount > 0
      ? reviewItems.reduce((total, review) => total + review.rating, 0) / realReviewCount
      : null;
  const reviewCountLabel =
    reviewsAreLoading
      ? 'Loading reviews'
      : realReviewCount > 0
        ? formatReviewCount(realReviewCount)
        : 'No reviews yet';
  const availabilityLabel =
    confirmedAvailabilityCount === 0
      ? 'Open this week'
      : `${confirmedAvailabilityCount} upcoming confirmed stay${confirmedAvailabilityCount === 1 ? '' : 's'}`;
  const bookingDetails: StayBookingDetails = {
    guestCounts: { adults, children },
    roomCount,
    roomTypeId: selectedRoomOption?.id ?? '',
    roomTypeLabel: selectedRoomOption?.label ?? '',
    bedOptionId: selectedBedOption?.id ?? '',
    bedOptionLabel: selectedBedOption?.label ?? '',
    arrivalWindowId: selectedArrivalOption?.id ?? '',
    arrivalWindowLabel: selectedArrivalOption?.label ?? '',
    specialRequest: specialRequest.trim() || undefined,
    guestSummary,
    roomSummary,
  };

  const clearBookingSnapshot = () => {
    setBookingDateOverride(null);
    setBookingTotalOverride(null);
  };

  const handleBookPress = () => {
    clearBookingSnapshot();
    bookingSheetRef.current?.snapToIndex(0);
  };

  const handleOpenReviewSheet = () => {
    reviewSheetRef.current?.snapToIndex(0);
  };

  const handleExistingBookingPress = () => {
    if (!existingStayBooking) {
      return;
    }

    const details = existingStayBooking.stayBookingDetails;
    setBookingDateOverride({
      checkIn: existingStayBooking.checkIn,
      checkOut: existingStayBooking.checkOut,
    });
    setBookingTotalOverride(existingStayBooking.totalPrice);
    setNightCount(getNightsBetween(existingStayBooking.checkIn, existingStayBooking.checkOut));

    if (details) {
      setAdults(details.guestCounts.adults);
      setChildren(details.guestCounts.children);
      setRoomCount(details.roomCount);
      setSelectedRoomTypeId(details.roomTypeId);
      setSelectedBedOptionId(details.bedOptionId);
      setSelectedArrivalWindowId(details.arrivalWindowId);
      setSpecialRequest(details.specialRequest ?? '');
    }

    bookingSheetRef.current?.snapToIndex(0);
  };

  const handleSubmitReview = async () => {
    if (reviewRating < 1 || !travelerSlug) {
      return;
    }

    setIsSubmittingReview(true);
    try {
      await submitStayRating({
        staySlug: stay.slug,
        travelerSlug,
        rating: reviewRating,
        review: reviewNote.trim() || undefined,
      });
      reviewSheetRef.current?.close();
      setReviewRating(0);
      setReviewNote('');
    } catch (error: any) {
      Alert.alert('Review Failed', error.message || 'Could not save your review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSharePhoto = async () => {
    if (!travelerSlug || isUploadingPhoto) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos permission needed', 'Allow photo access to share a picture for this stay.');
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
        locationKind: 'stay',
        locationSlug: stay.slug,
        travelerSlug,
        storageId,
      });
    } catch {
      Alert.alert('Photo upload failed', 'Could not share that picture. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const confirmBooking = async () => {
    setIsBooking(true);
    try {
      await createBooking({
        staySlug: stay.slug,
        travelerSlug,
        checkIn,
        checkOut,
        totalPrice,
        stayBookingDetails: bookingDetails,
        tripId: selectedTripId,
      });
      bookingSheetRef.current?.close();
      Alert.alert(
        'Booking Requested',
        `${guestSummary} requested ${roomSummary.toLowerCase()} from ${formatDateLabel(checkIn)} to ${formatDateLabel(checkOut)}. The stay was also added to your trip.`
      );
      router.push('/trip');
    } catch (error: any) {
      Alert.alert('Booking Failed', error.message || 'Could not complete booking.');
    } finally {
      setIsBooking(false);
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
          ],
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 132 },
        ]}>
        <View style={styles.carouselContainer}>
          <ExperienceGalleryCarousel images={galleryImages} />
        </View>

        <View style={styles.paddedContent}>
          <View style={styles.heroPanel}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>Stay Studio</ThemedText>
              </View>
              <View style={[styles.availabilityBadge, isDark && styles.availabilityBadgeDark]}>
                <ClockCountdown
                  size={14}
                  color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.warmDark}
                  weight="bold"
                />
                <ThemedText style={[styles.availabilityText, isDark && styles.availabilityTextDark]}>
                  {availabilityLabel}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.title, isDark && styles.titleDark]}>{stay.name}</ThemedText>
            <View style={styles.locationRow}>
              <MapPin size={16} color={designSystem.colors.gray} weight="fill" />
              <ThemedText style={[styles.subtitle, isDark && styles.subtitleDark]}>{stay.locationLabel}</ThemedText>
              <ThemedText style={[styles.dotText, isDark && styles.dotTextDark]}>•</ThemedText>
              <ThemedText style={[styles.subtitle, isDark && styles.subtitleDark]}>{reviewCountLabel}</ThemedText>
            </View>
            <ThemedText style={[styles.summary, isDark && styles.summaryDark]}>{stay.summary}</ThemedText>
          </View>

          <View style={styles.section}>
            <SectionHeading
              isDark={isDark}
              title="Stay details"
              subtitle="A quick read before you book."
            />
            <StayDetailsDropdown
              isDark={isDark}
              items={[
                { label: 'Works well for', value: stay.idealFor.join(' · ') },
                { label: 'Nearby', value: stay.nearbyHighlights.join(' · ') },
                { label: 'Sleep signal', value: stay.sleepSignal },
              ]}
            />
            <View style={styles.chipGrid}>
              {stay.amenities.map((item: string) => (
                <View key={item} style={[styles.amenityChip, isDark && styles.amenityChipDark]}>
                  <ThemedText style={[styles.amenityText, isDark && styles.amenityTextDark]}>{item}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeading
              isDark={isDark}
              title="Reviews"
            />
            <View style={styles.reviewsHeader}>
              <View style={styles.reviewsSummary}>
                <View style={styles.reviewsRatingRow}>
                  <Star size={16} color={designSystem.colors.lime} weight="fill" />
                  <ThemedText style={[styles.reviewsRatingValue, isDark && styles.reviewsRatingValueDark]}>
                    {realRating === null ? 'New' : realRating.toFixed(1)}
                  </ThemedText>
                  <ThemedText style={[styles.reviewsCount, isDark && styles.reviewsCountDark]}>
                    {reviewCountLabel}
                  </ThemedText>
                </View>
              </View>
              <Pressable style={[styles.reviewAction, isDark && styles.reviewActionDark]} onPress={handleOpenReviewSheet}>
                <ThemedText style={styles.reviewActionText}>Write a review</ThemedText>
              </Pressable>
            </View>
            <View style={styles.reviewList}>
              {reviewsAreLoading
                ? (
                    <View style={styles.reviewsLoadingRow}>
                      <ActivityIndicator size="small" color={designSystem.colors.lime} />
                    </View>
                  )
                : reviewItems.length > 0
                ? reviewItems.map((review) => (
                    <ReviewCard
                      isDark={isDark}
                      key={review._id}
                      avatarUri={review.travelerAvatarUri}
                      name={review.travelerName}
                      visitedAt={formatReviewDate(review.createdAt)}
                      quote={review.review}
                      rating={review.rating}
                      regionLabel={review.travelerRegionName ?? undefined}
                    />
                  ))
                : (
                    <View style={[styles.emptyReviewsCard, isDark && styles.emptyReviewsCardDark]}>
                      <ThemedText style={[styles.emptyReviewsTitle, isDark && styles.emptyReviewsTitleDark]}>
                        No real reviews yet
                      </ThemedText>
                      <ThemedText style={[styles.emptyReviewsText, isDark && styles.emptyReviewsTextDark]}>
                        Reviews will appear here after travelers submit them.
                      </ThemedText>
                    </View>
                  )}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeading
              isDark={isDark}
              title="Location"
            />
            <View style={styles.neighborhoodMap}>
              <MapPreview
                centerCoordinate={stay.coordinate}
                userCoordinate={currentLocation.coordinate}
                markers={[
                  {
                    id: stay.id,
                    coordinate: stay.coordinate,
                    experienceSlug: stay.slug,
                    imageUri: stay.imageUri,
                    itemKind: 'stay',
                    label: stay.name,
                    tone: 'accent',
                    status: 'active',
                  },
                ]}
                showRoutes={true}
                zoomLevel={14}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <BookingGlassBar
        buttonLabel={hasExistingStayBooking ? 'View trip' : 'Start booking'}
        containerStyle={[
          styles.bottomBar,
          Platform.OS === 'android' ? styles.bottomBarAndroidShadowless : null,
          { bottom: Math.max(insets.bottom, 12) },
        ]}
        isDark={isDark}
        isLoading={!hasExistingStayBooking && isBooking}
        nights={bookingBarNights}
        onPress={hasExistingStayBooking ? handleExistingBookingPress : handleBookPress}
        totalPrice={bookingBarTotalPrice}
      />

      <GlassBottomSheet
        index={-1}
        ref={bookingSheetRef}
        snapPoints={bookingSheetSnapPoints}
        animatedIndex={bookingSheetAnimatedIndex}
        containerStyle={styles.sheetLayer}
        enablePanDownToClose>
        <BottomSheetScrollView
          style={styles.sheetRoot}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.sheetPaddedBlock, bookingSheetHeaderAnimatedStyle]}>
            <ThemedText style={styles.sheetTitle}>
              {hasExistingStayBooking ? 'Your stay request' : 'Build the stay request'}
            </ThemedText>
            <ThemedText style={[styles.sheetSubtitle, isDark && styles.sheetSubtitleDark]}>
              {hasExistingStayBooking
                ? 'Review the dates, guests, room setup, and host note you booked.'
                : 'Pick dates, guests, room setup, and any note for the host.'}
            </ThemedText>
          </Animated.View>

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Trip timing</ThemedText>
            <View style={styles.optionRow}>
              {dayOffsets.map((option) => (
                <SelectionPill
                  key={option}
                  isDark={isDark}
                  active={selectedDayOffset === option}
                  label={formatDayOffsetLabel(option)}
                  onPress={() => {
                    clearBookingSnapshot();
                    setDayOffset(option);
                  }}
                />
              ))}
            </View>
            <View style={styles.optionRow}>
              {nightOptions.map((option) => (
                <SelectionPill
                  key={option}
                  isDark={isDark}
                  active={nights === option}
                  label={`${option} night${option === 1 ? '' : 's'}`}
                  onPress={() => {
                    clearBookingSnapshot();
                    setNightCount(option);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Who is staying</ThemedText>
              <CounterField
                isDark={isDark}
                label="Adults"
                value={adults}
                min={1}
                max={maxAdults}
                onChange={(value) => {
                  clearBookingSnapshot();
                  setAdults(value);
                }}
              />
              <CounterField
                isDark={isDark}
                label="Children"
                value={children}
                min={0}
                max={maxChildren}
                onChange={(value) => {
                  clearBookingSnapshot();
                  setChildren(value);
                }}
              />
          </View>

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Room setup</ThemedText>
            <View style={styles.verticalOptionList}>
              {roomOptions.map((option) => (
                <SelectionRow
                  key={option.id}
                  isDark={isDark}
                  active={selectedRoomOption?.id === option.id}
                  label={option.label}
                  detail={option.detail}
                  onPress={() => {
                    clearBookingSnapshot();
                    setSelectedRoomTypeId(option.id);
                  }}
                />
              ))}
            </View>
            <CounterField
              isDark={isDark}
              label="Rooms"
              value={roomCount}
              min={1}
              max={maxRooms}
              onChange={(value) => {
                clearBookingSnapshot();
                setRoomCount(value);
              }}
            />
            <View style={styles.optionRow}>
              {bedOptions.map((option) => (
                <SelectionPill
                  key={option.id}
                  isDark={isDark}
                  active={selectedBedOption?.id === option.id}
                  label={option.label}
                  onPress={() => {
                    clearBookingSnapshot();
                    setSelectedBedOptionId(option.id);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Arrival and notes</ThemedText>
            <View style={styles.optionRow}>
              {arrivalOptions.map((option: StayArrivalOption) => (
                <SelectionPill
                  key={option.id}
                  isDark={isDark}
                  active={selectedArrivalOption?.id === option.id}
                  label={option.label}
                  onPress={() => {
                    clearBookingSnapshot();
                    setSelectedArrivalWindowId(option.id);
                  }}
                />
              ))}
            </View>
            <TextInput
              multiline
              placeholder="Special request, late check-in note, twin-bed request, quiet room..."
              placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
              style={[styles.notesInput, isDark && styles.notesInputDark]}
              value={specialRequest}
              onChangeText={(value) => {
                clearBookingSnapshot();
                setSpecialRequest(value);
              }}
            />
          </View>

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Price summary</ThemedText>
            <View style={[styles.pricePreviewCard, isDark && styles.pricePreviewCardDark]}>
              <View style={styles.priceRow}>
                <View style={styles.priceCopy}>
                  <ThemedText style={[styles.priceLabel, isDark && styles.priceLabelDark]}>
                    {nights} night{nights === 1 ? '' : 's'} · {roomCount} room{roomCount === 1 ? '' : 's'}
                  </ThemedText>
                  <ThemedText style={[styles.priceRate, isDark && styles.priceRateDark]}>
                    {stay.priceLabel}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.priceValue, isDark && styles.priceValueDark]}>${totalPrice}</ThemedText>
              </View>
              <ThemedText style={[styles.priceMeta, isDark && styles.priceMetaDark]}>
                {formatDateLabel(checkIn)} - {formatDateLabel(checkOut)}
              </ThemedText>
              <ThemedText style={[styles.priceMeta, isDark && styles.priceMetaDark]}>
                {guestSummary} · {roomSummary}
              </ThemedText>
            </View>
          </View>

          <Pressable
            style={[
              styles.confirmButton,
              Platform.OS === 'android' ? styles.confirmButtonAndroid : null,
              isDark && styles.confirmButtonDark,
              isBooking ? (Platform.OS === 'android' ? styles.confirmButtonDisabledAndroid : styles.confirmButtonDisabled) : null,
            ]}
            onPress={confirmBooking}
            disabled={isBooking}>
            {isBooking ? (
              <ActivityIndicator color={designSystem.colors.white} />
            ) : (
              <ThemedText style={[styles.confirmButtonText, isDark && styles.confirmButtonTextDark]}>
                {hasExistingStayBooking ? 'Update stay request' : 'Request this stay'}
              </ThemedText>
            )}
          </Pressable>
        </BottomSheetScrollView>
      </GlassBottomSheet>

      <GlassBottomSheet
        containerStyle={styles.sheetLayer}
        ref={reviewSheetRef}
        index={-1}
        snapPoints={['48%']}
        enablePanDownToClose>
        <BottomSheetView style={[styles.reviewSheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ThemedText style={styles.sheetTitle}>Write a review</ThemedText>
          <ThemedText style={[styles.sheetSubtitle, isDark && styles.sheetSubtitleDark]}>
            Leave a quick rating and an optional note.
          </ThemedText>

          <View style={styles.reviewStarsRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= reviewRating;
              return (
                <Pressable
                  key={value}
                  onPress={() => setReviewRating(value)}
                  style={styles.reviewStarButton}>
                  <Star
                    size={28}
                    weight={active ? 'fill' : 'regular'}
                    color={
                      active
                        ? designSystem.colors.lime
                        : isDark
                          ? designSystem.colors.darkMutedText
                          : designSystem.colors.subtleText
                    }
                  />
                </Pressable>
              );
            })}
          </View>

          <TextInput
            multiline
            numberOfLines={4}
            placeholder="Add a note"
            placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
            style={[styles.notesInput, isDark && styles.notesInputDark, styles.reviewNoteInput]}
            value={reviewNote}
            onChangeText={setReviewNote}
            textAlignVertical="top"
          />

          <Pressable
            style={[
              styles.confirmButton,
              isDark && styles.confirmButtonDark,
              (isSubmittingReview || reviewRating < 1) && styles.confirmButtonDisabled,
            ]}
            onPress={handleSubmitReview}
            disabled={isSubmittingReview || reviewRating < 1}>
            {isSubmittingReview ? (
              <ActivityIndicator color={designSystem.colors.white} />
            ) : (
              <ThemedText style={[styles.confirmButtonText, isDark && styles.confirmButtonTextDark]}>
                Save review
              </ThemedText>
            )}
          </Pressable>
        </BottomSheetView>
      </GlassBottomSheet>
    </ThemedView>
  );
}

function BookingGlassBar({
  buttonLabel,
  containerStyle,
  isDark,
  isLoading = false,
  nights,
  onPress,
  totalPrice,
}: {
  buttonLabel: string;
  containerStyle?: StyleProp<ViewStyle>;
  isDark: boolean;
  isLoading?: boolean;
  nights: number;
  onPress: () => void;
  totalPrice: number;
}) {
  const isAndroid = Platform.OS === 'android';

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.bottomBarGlassClip,
          isDark && styles.bottomBarGlassClipDark,
          isAndroid ? (isDark ? styles.bottomBarAndroidDark : styles.bottomBarAndroid) : null,
        ]}>
        {isAndroid ? null : (
          <>
            <GlassView
              colorScheme={isDark ? 'dark' : 'light'}
              glassEffectStyle="regular"
              isInteractive
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.bottomBarGlassView]}
            />
            <View pointerEvents="none" style={[styles.bottomBarHighlight, isDark && styles.bottomBarHighlightDark]} />
          </>
        )}
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomBarPriceBlock}>
            <ThemedText style={[styles.bottomBarPrice, isDark && styles.bottomBarPriceDark]}>
              ${totalPrice}
              <ThemedText style={[styles.bottomBarSuffix, isDark && styles.bottomBarSuffixDark]}>
                {' '}for {nights} night{nights === 1 ? '' : 's'}
              </ThemedText>
            </ThemedText>
          </View>
          <Pressable
            style={[
              styles.bookNearbyButton,
              isLoading ? (isAndroid ? styles.bookNearbyButtonDisabledAndroid : styles.bookNearbyButtonDisabled) : null,
            ]}
            onPress={onPress}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={designSystem.colors.darkGreen} />
            ) : (
              <ThemedText style={styles.bookNearbyText}>{buttonLabel}</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StayDetailLoadingScreen({
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
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + 156 },
        ]}>
        <SkeletonBlock style={styles.stayHeroSkeleton} />
        <View style={styles.paddedContent}>
          <SkeletonBlock style={styles.stayBadgeSkeleton} />
          <SkeletonBlock style={styles.stayTitleSkeleton} />
          <SkeletonBlock style={styles.staySubtitleSkeleton} />
          <SkeletonBlock style={styles.stayPanelSkeleton} />
          <SkeletonBlock style={styles.stayPanelSkeleton} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function SectionHeading({ title, subtitle, isDark }: { title: string; subtitle?: string; isDark: boolean }) {
  return (
    <View style={styles.sectionHeading}>
      <ThemedText style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{title}</ThemedText>
      {subtitle ? (
        <ThemedText style={[styles.sectionSubtitle, isDark && styles.sectionSubtitleDark]}>{subtitle}</ThemedText>
      ) : null}
    </View>
  );
}

function StayDetailsDropdown({
  isDark,
  items,
}: {
  isDark: boolean;
  items: readonly { label: string; value: string }[];
}) {
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const mutedColor = isDark ? darkSheetPalette.mutedText : designSystem.colors.warmDark;

  return (
    <View style={[styles.detailDropdown, isDark && styles.detailDropdownDark]}>
      {items.map((item, index) => {
        const itemKey = `${item.label}-${item.value}`;
        const open = openItemKey === itemKey;
        const Icon = open ? CaretUp : CaretDown;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            key={itemKey}
            onPress={() => setOpenItemKey(open ? null : itemKey)}
            style={[
              styles.detailDropdownRow,
              index < items.length - 1 ? styles.detailDropdownRowBorder : null,
              isDark && index < items.length - 1 ? styles.detailDropdownRowBorderDark : null,
            ]}
          >
            <View style={styles.detailDropdownSummary}>
              <ThemedText style={[styles.detailLabel, isDark && styles.detailLabelDark]}>
                {item.label}
              </ThemedText>
              <Icon color={mutedColor} size={18} weight="bold" />
            </View>
            {open ? (
              <ThemedText style={[styles.detailValue, isDark && styles.detailValueDark]}>
                {item.value}
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function SelectionPill({
  isDark,
  active,
  label,
  onPress,
}: {
  isDark: boolean;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.selectionPill,
        isDark && styles.selectionPillDark,
        active && styles.selectionPillActive,
        isDark && active && styles.selectionPillActiveDark,
      ]}
      onPress={onPress}>
      <ThemedText
        style={[
          styles.selectionPillText,
          isDark && styles.selectionPillTextDark,
          active && styles.selectionPillTextActive,
          isDark && active && styles.selectionPillTextActiveDark,
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SelectionRow({
  isDark,
  active,
  label,
  detail,
  onPress,
}: {
  isDark: boolean;
  active: boolean;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.selectionRow, isDark && styles.selectionRowDark, active && styles.selectionRowActive]}
      onPress={onPress}>
      <View style={styles.selectionRowCopy}>
        <ThemedText
          style={[
            styles.selectionRowLabel,
            isDark && styles.selectionRowLabelDark,
            active && styles.selectionRowLabelActive,
            isDark && active && styles.selectionRowLabelActiveDark,
          ]}>
          {label}
        </ThemedText>
        <ThemedText
          style={[
            styles.selectionRowDetail,
            isDark && styles.selectionRowDetailDark,
            active && styles.selectionRowDetailActive,
            isDark && active && styles.selectionRowDetailActiveDark,
          ]}>
          {detail}
        </ThemedText>
      </View>
      <View style={[styles.selectionRowDot, isDark && styles.selectionRowDotDark, active && styles.selectionRowDotActive]} />
    </Pressable>
  );
}

function CounterField({
  isDark,
  label,
  value,
  min,
  max,
  onChange,
}: {
  isDark: boolean;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.counterRow}>
      <ThemedText style={[styles.counterLabel, isDark && styles.counterLabelDark]}>{label}</ThemedText>
      <View style={styles.counterControls}>
        <Pressable
          style={[styles.counterButton, isDark && styles.counterButtonDark]}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}>
          <ThemedText style={[styles.counterButtonText, isDark && styles.counterButtonTextDark]}>-</ThemedText>
        </Pressable>
        <ThemedText style={[styles.counterValue, isDark && styles.counterValueDark]}>{value}</ThemedText>
        <Pressable
          style={[styles.counterButton, isDark && styles.counterButtonDark]}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}>
          <ThemedText style={[styles.counterButtonText, isDark && styles.counterButtonTextDark]}>+</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function ReviewCard({
  avatarUri,
  name,
  visitedAt,
  quote,
  isDark,
  rating,
  regionLabel,
}: {
  avatarUri?: string | null;
  name: string;
  visitedAt: string;
  quote: string;
  isDark: boolean;
  rating?: number;
  regionLabel?: string;
}) {
  return (
    <View style={[styles.reviewCard, isDark && styles.reviewCardDark]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <FaceHashAvatar name={name} size={42} uri={avatarUri} />
        </View>
        <View>
          <ThemedText style={[styles.reviewName, isDark && styles.reviewNameDark]}>{name}</ThemedText>
          <View style={styles.reviewMetaRow}>
            <ThemedText style={styles.reviewVisited}>{visitedAt}</ThemedText>
            {regionLabel ? <ThemedText style={styles.reviewVisited}>• {regionLabel}</ThemedText> : null}
          </View>
        </View>
      </View>
      {rating ? (
        <View style={styles.reviewRatingRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              size={14}
              weight={value <= rating ? 'fill' : 'regular'}
              color={value <= rating ? designSystem.colors.lime : isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
            />
          ))}
        </View>
      ) : null}
      {quote ? <ThemedText style={[styles.reviewQuote, isDark && styles.reviewQuoteDark]}>{quote}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: designSystem.colors.background,
  },
  rootDark: {
    backgroundColor: darkSheetPalette.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
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
  heroPanel: {
    gap: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
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
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.lightSurfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  availabilityText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  availabilityBadgeDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  availabilityTextDark: {
    color: darkSheetPalette.mutedText,
  },
  title: {
    ...designSystem.type.title,
    fontSize: 30,
    lineHeight: 34,
    color: designSystem.colors.ink,
  },
  titleDark: {
    color: darkSheetPalette.text,
  },
  locationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  subtitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.warmDark,
  },
  subtitleDark: {
    color: darkSheetPalette.mutedText,
  },
  dotText: {
    fontSize: 14,
    lineHeight: 16,
    color: designSystem.colors.gray,
  },
  dotTextDark: {
    color: darkSheetPalette.mutedText,
  },
  summary: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  summaryDark: {
    color: darkSheetPalette.mutedText,
  },
  section: {
    gap: 18,
  },
  sectionHeading: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sectionTitleDark: {
    color: darkSheetPalette.text,
  },
  sectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  sectionSubtitleDark: {
    color: darkSheetPalette.mutedText,
  },
  supportingNote: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  supportingNoteDark: {
    color: darkSheetPalette.mutedText,
  },
  detailDropdown: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  detailDropdownDark: {
    borderColor: darkSheetPalette.border,
  },
  detailDropdownRow: {
    paddingVertical: 16,
    gap: 10,
  },
  detailDropdownRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderSoft,
  },
  detailDropdownRowBorderDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  detailDropdownSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
  },
  detailLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  detailLabelDark: {
    color: darkSheetPalette.mutedText,
  },
  detailValue: {
    maxWidth: '92%',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  detailValueDark: {
    color: darkSheetPalette.text,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityChip: {
    borderRadius: 999,
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amenityChipDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  amenityText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.lightText,
  },
  amenityTextDark: {
    color: darkSheetPalette.text,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reviewsSummary: {
    flex: 1,
  },
  reviewsRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsRatingValue: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  reviewsRatingValueDark: {
    color: darkSheetPalette.text,
  },
  reviewsCount: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  reviewsCountDark: {
    color: darkSheetPalette.mutedText,
  },
  reviewAction: {
    minHeight: 38,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  reviewActionDark: {
    backgroundColor: darkSheetPalette.surface,
    borderColor: darkSheetPalette.border,
  },
  reviewActionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  neighborhoodMap: {
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
  },
  reviewList: {
    gap: 0,
  },
  reviewsLoadingRow: {
    paddingVertical: 24,
    alignItems: 'flex-start',
  },
  emptyReviewsCard: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderHairline,
    gap: 6,
  },
  emptyReviewsCardDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  emptyReviewsTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  emptyReviewsTitleDark: {
    color: darkSheetPalette.text,
  },
  emptyReviewsText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: designSystem.colors.gray,
  },
  emptyReviewsTextDark: {
    color: darkSheetPalette.mutedText,
  },
  reviewCard: {
    paddingVertical: 20,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderHairline,
  },
  reviewCardDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  smallAvatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surface,
  },
  avatarFallbackDark: {
    backgroundColor: darkSheetPalette.surface,
  },
  avatarFallbackText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  avatarFallbackTextDark: {
    color: darkSheetPalette.text,
  },
  reviewName: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.lightTextStrong,
  },
  reviewNameDark: {
    color: darkSheetPalette.text,
  },
  reviewVisited: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.lightMutedWarm,
  },
  reviewMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewQuote: {
    fontSize: 15,
    lineHeight: 28,
    fontWeight: '600',
    color: designSystem.colors.lightText,
  },
  reviewQuoteDark: {
    color: darkSheetPalette.mutedText,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 40,
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 18,
  },
  bottomBarAndroidShadowless: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  bottomBarGlassClip: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: designSystem.colors.whiteOverlayBorder,
    borderRadius: 40,
    backgroundColor: designSystem.colors.transparentWhite,
  },
  bottomBarGlassClipDark: {
    borderColor: designSystem.colors.whiteOverlayBarely,
    backgroundColor: designSystem.colors.transparentWhite,
  },
  bottomBarAndroid: {
    borderColor: designSystem.colors.lightSurfaceAlt,
    backgroundColor: designSystem.colors.surfaceRaised,
  },
  bottomBarAndroidDark: {
    borderColor: designSystem.colors.darkBorder,
    backgroundColor: designSystem.colors.darkSurface,
  },
  bottomBarGlassView: {
    borderRadius: 40,
  },
  bottomBarHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.whiteBorder,
    backgroundColor: designSystem.colors.whiteWashSubtle,
  },
  bottomBarHighlightDark: {
    borderColor: designSystem.colors.whiteOverlayBarely,
    backgroundColor: designSystem.colors.nativeDarkWash,
  },
  bottomBarContent: {
    minHeight: 78,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    padding: 8,
    paddingLeft: 22,
    gap: 10,
  },
  bottomBarPriceBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  bottomBarLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.lightMutedWarm,
  },
  bottomBarLabelDark: {
    color: darkSheetPalette.mutedText,
  },
  bottomBarPrice: {
    marginTop: 6,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.lightTextDeep,
  },
  bottomBarPriceDark: {
    color: darkSheetPalette.text,
  },
  bottomBarSuffix: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.lightMutedWarm,
  },
  bottomBarSuffixDark: {
    color: darkSheetPalette.mutedText,
  },
  bookNearbyButton: {
    minWidth: 160,
    borderRadius: 32,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignSelf: 'stretch',
  },
  bookNearbyButtonDisabled: {
    opacity: 0.72,
  },
  bookNearbyButtonDisabledAndroid: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  bookNearbyText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  sheetRoot: {
    flex: 1,
  },
  sheetLayer: {
    zIndex: 80,
    elevation: 80,
  },
  reviewSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 18,
  },
  sheetContent: {
    paddingTop: 24,
    paddingBottom: 40,
    gap: 18,
  },
  sheetPaddedBlock: {
    paddingHorizontal: 24,
  },
  sheetTitle: {
    ...designSystem.type.subtitle,
    fontSize: 21,
  },
  sheetSubtitle: {
    ...designSystem.type.body,
    color: designSystem.colors.warmDark,
    marginBottom: 8,
  },
  sheetSubtitleDark: {
    color: darkSheetPalette.mutedText,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewStarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSection: {
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderSoft,
  },
  sheetSectionDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  sheetSectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sheetSectionTitleDark: {
    color: darkSheetPalette.text,
  },
  sheetSectionBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  sheetSectionBodyDark: {
    color: darkSheetPalette.mutedText,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  verticalOptionList: {
    gap: 10,
  },
  selectionPill: {
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectionPillDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  selectionPillActive: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  selectionPillActiveDark: {
    backgroundColor: darkSheetPalette.accent,
    borderColor: darkSheetPalette.accent,
  },
  selectionPillText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  selectionPillTextDark: {
    color: darkSheetPalette.text,
  },
  selectionPillTextActive: {
    color: designSystem.colors.darkGreen,
  },
  selectionPillTextActiveDark: {
    color: darkSheetPalette.accentText,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderSoft,
  },
  selectionRowDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  selectionRowActive: {
    borderBottomColor: darkSheetPalette.border,
  },
  selectionRowCopy: {
    flex: 1,
    gap: 6,
  },
  selectionRowLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  selectionRowLabelDark: {
    color: darkSheetPalette.text,
  },
  selectionRowLabelActive: {
    color: designSystem.colors.darkGreen,
  },
  selectionRowLabelActiveDark: {
    color: darkSheetPalette.text,
  },
  selectionRowDetail: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  selectionRowDetailDark: {
    color: darkSheetPalette.mutedText,
  },
  selectionRowDetailActive: {
    color: designSystem.colors.darkGreen,
  },
  selectionRowDetailActiveDark: {
    color: darkSheetPalette.mutedText,
  },
  selectionRowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: designSystem.colors.border,
  },
  selectionRowDotDark: {
    borderColor: darkSheetPalette.border,
  },
  selectionRowDotActive: {
    backgroundColor: darkSheetPalette.accent,
    borderColor: darkSheetPalette.accent,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  counterLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  counterLabelDark: {
    color: darkSheetPalette.text,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  counterButtonDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  counterButtonText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  counterButtonTextDark: {
    color: darkSheetPalette.text,
  },
  counterValue: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  counterValueDark: {
    color: darkSheetPalette.text,
  },
  inlineSummary: {
    gap: 6,
    paddingTop: 2,
  },
  inlineSummaryLabel: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.gray,
  },
  inlineSummaryValue: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  inlineSummaryValueDark: {
    color: darkSheetPalette.text,
  },
  notesInput: {
    minHeight: 110,
    borderRadius: 22,
    backgroundColor: designSystem.colors.whiteWashSubtle,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: designSystem.colors.ink,
    textAlignVertical: 'top',
  },
  notesInputDark: {
    backgroundColor: darkSheetPalette.surface,
    color: darkSheetPalette.text,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  reviewNoteInput: {
    minHeight: 100,
  },
  pricePreviewCard: {
    gap: 12,
    borderRadius: 24,
    backgroundColor: designSystem.colors.whiteWashSubtle,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pricePreviewCardDark: {
    backgroundColor: darkSheetPalette.surface,
    borderColor: darkSheetPalette.border,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  priceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  priceLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  priceLabelDark: {
    color: darkSheetPalette.text,
  },
  priceRate: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.lightMutedWarm,
  },
  priceRateDark: {
    color: darkSheetPalette.mutedText,
  },
  priceValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  priceValueDark: {
    color: darkSheetPalette.text,
  },
  priceMeta: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  priceMetaDark: {
    color: darkSheetPalette.mutedText,
  },
  confirmButton: {
    minHeight: 56,
    borderRadius: 999,
    marginHorizontal: 24,
    marginTop: 4,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonAndroid: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: designSystem.colors.darkGreen,
  },
  confirmButtonDark: {
    backgroundColor: darkSheetPalette.accent,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonDisabledAndroid: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  confirmButtonText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  confirmButtonTextDark: {
    color: darkSheetPalette.accentText,
  },
  stayHeroSkeleton: {
    height: 340,
    borderRadius: 34,
    marginHorizontal: designSystem.spacing.lg,
  },
  stayBadgeSkeleton: {
    width: 118,
    height: 30,
    borderRadius: 15,
  },
  stayTitleSkeleton: {
    width: '88%',
    height: 74,
    borderRadius: 24,
  },
  staySubtitleSkeleton: {
    width: '64%',
    height: 22,
    borderRadius: 11,
  },
  stayPanelSkeleton: {
    width: '100%',
    height: 148,
    borderRadius: 28,
  },
});
