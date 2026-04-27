import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { CalendarBlank, ClockCountdown, MapPin, Moon, Star } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ExperienceGalleryCarousel } from '@/components/wandr/explore/experience-gallery-carousel';
import { WandrHeader } from '@/components/wandr/header';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { getStayBookingProfile } from '@/constants/stays-content';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import {
  createStayBookingRef,
  getStayAvailabilityRef,
  getStayBySlugRef,
  listStayRatingsRef,
  listUserTripsRef,
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
  background: '#10120f',
  surface: '#151814',
  border: 'rgba(243, 244, 239, 0.08)',
  text: '#f3f4ef',
  mutedText: '#adb3aa',
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

function formatReviewDate(value: number) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
  const submitStayRating = useMutation(submitStayRatingRef);
  const trips = useQuery(listUserTripsRef, { travelerSlug });
  const selectedTripId = trips?.[0]?._id;

  const stay = useQuery(getStayBySlugRef, { slug: slug ?? '' });
  const availability = useQuery(getStayAvailabilityRef, { staySlug: slug ?? '' });
  const stayRatings = useQuery(listStayRatingsRef, { staySlug: slug ?? '' });

  const [isBooking, setIsBooking] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [dayOffset, setDayOffset] = useState<(typeof dayOffsets)[number]>(dayOffsets[0]);
  const [nightCount, setNightCount] = useState<(typeof nightOptions)[number]>(nightOptions[2]);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomCount, setRoomCount] = useState(1);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [selectedBedOptionId, setSelectedBedOptionId] = useState('');
  const [selectedArrivalWindowId, setSelectedArrivalWindowId] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const bookingSheetRef = useRef<BottomSheet>(null);
  const reviewSheetRef = useRef<BottomSheet>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewNote, setReviewNote] = useState('');

  const bookingProfile: StayBookingProfile | null = stay
    ? stay.bookingProfile ?? getStayBookingProfile(stay.slug)
    : null;
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

  useEffect(() => {
    if (!bookingProfile) {
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
  }, [bookingProfile, stay?.slug]);

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
    return (
      <ThemedView style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={designSystem.colors.lime} />
      </ThemedView>
    );
  }

  if (!stay) {
    return null;
  }

  const galleryImages = stay.galleryImages?.length ? stay.galleryImages : [stay.imageUri];
  const checkIn = Date.now() + dayOffset * 86_400_000;
  const checkOut = checkIn + nightCount * 86_400_000;
  const nights = getNightsBetween(checkIn, checkOut);
  const guestSummary = buildGuestSummary({ adults, children });
  const roomSummary =
    selectedRoomOption && selectedBedOption
      ? buildRoomSummary(roomCount, selectedRoomOption, selectedBedOption)
      : `${roomCount} room`;
  const totalPrice = stay.pricePerNight * nights * roomCount;
  const confirmedAvailabilityCount = availability?.length ?? 0;
  const realReviewCount = stayRatings?.length ?? 0;
  const combinedReviewCount = Math.max(stay.reviewCount, realReviewCount);
  const reviewItems = stayRatings ?? [];
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

  const handleBookPress = () => {
    bookingSheetRef.current?.snapToIndex(0);
  };

  const handleOpenReviewSheet = () => {
    reviewSheetRef.current?.snapToIndex(0);
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
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 156 },
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
              <ThemedText style={[styles.subtitle, isDark && styles.subtitleDark]}>{combinedReviewCount} reviews</ThemedText>
            </View>
            <ThemedText style={[styles.summary, isDark && styles.summaryDark]}>{stay.summary}</ThemedText>
          </View>

          <View style={styles.section}>
            <SectionHeading
              isDark={isDark}
              title="Stay details"
              subtitle="A quick read before you book."
            />
            <View style={styles.detailGrid}>
              <DetailBlock isDark={isDark} label="Works well for" value={stay.idealFor.join(' · ')} />
              <DetailBlock isDark={isDark} label="Nearby" value={stay.nearbyHighlights.join(' · ')} />
              <DetailBlock isDark={isDark} label="Sleep signal" value={stay.sleepSignal} />
            </View>
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
                    {stay.rating.toFixed(1)}
                  </ThemedText>
                  <ThemedText style={[styles.reviewsCount, isDark && styles.reviewsCountDark]}>
                    {combinedReviewCount} reviews
                  </ThemedText>
                </View>
              </View>
              <Pressable style={[styles.reviewAction, isDark && styles.reviewActionDark]} onPress={handleOpenReviewSheet}>
                <ThemedText style={styles.reviewActionText}>Write a review</ThemedText>
              </Pressable>
            </View>
            <View style={styles.reviewList}>
              {reviewItems.length > 0
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
                : (stay.guestJournals ?? []).map((journal: { name: string; avatarUri: string; visitedAtLabel: string; quote: string }) => (
                    <ReviewCard
                      isDark={isDark}
                      key={`${journal.name}-${journal.visitedAtLabel}`}
                      avatarUri={journal.avatarUri}
                      name={journal.name}
                      visitedAt={journal.visitedAtLabel}
                      quote={journal.quote}
                    />
                  ))}
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
                    label: stay.name,
                    priceLabel: stay.priceLabel,
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

      <View style={[styles.bottomBar, isDark && styles.bottomBarDark, { paddingBottom: insets.bottom + 16 }]}>
        <View>
          <ThemedText style={[styles.bottomBarLabel, isDark && styles.bottomBarLabelDark]}>Estimated total</ThemedText>
          <ThemedText style={[styles.bottomBarPrice, isDark && styles.bottomBarPriceDark]}>
            ${totalPrice}
            <ThemedText style={[styles.bottomBarSuffix, isDark && styles.bottomBarSuffixDark]}>
              {' '}for {nights} night{nights === 1 ? '' : 's'}
            </ThemedText>
          </ThemedText>
        </View>
        <Pressable style={styles.bookNearbyButton} onPress={handleBookPress} disabled={isBooking}>
          {isBooking ? (
            <ActivityIndicator color={designSystem.colors.darkGreen} />
          ) : (
            <ThemedText style={styles.bookNearbyText}>Start booking</ThemedText>
          )}
        </Pressable>
      </View>

      <GlassBottomSheet
        ref={bookingSheetRef}
        index={-1}
        snapPoints={['50%', '100%']}
        enablePanDownToClose>
        <BottomSheetScrollView
          style={styles.sheetRoot}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.sheetTitle}>Build the stay request</ThemedText>
          <ThemedText style={[styles.sheetSubtitle, isDark && styles.sheetSubtitleDark]}>
            Pick dates, guests, room setup, and any note for the host.
          </ThemedText>

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Trip timing</ThemedText>
            <View style={styles.optionRow}>
              {dayOffsets.map((option) => (
                <SelectionPill
                  key={option}
                  isDark={isDark}
                  active={dayOffset === option}
                  label={formatDayOffsetLabel(option)}
                  onPress={() => setDayOffset(option)}
                />
              ))}
            </View>
            <View style={styles.optionRow}>
              {nightOptions.map((option) => (
                <SelectionPill
                  key={option}
                  isDark={isDark}
                  active={nightCount === option}
                  label={`${option} night${option === 1 ? '' : 's'}`}
                  onPress={() => setNightCount(option)}
                />
              ))}
            </View>
            <View style={styles.summaryRow}>
              <PreviewPill isDark={isDark} icon={<CalendarBlank size={14} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />} label={formatDateLabel(checkIn)} />
              <PreviewPill isDark={isDark} icon={<Moon size={14} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />} label={formatDateLabel(checkOut)} />
            </View>
          </View>

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Who is staying</ThemedText>
              <CounterField isDark={isDark} label="Adults" value={adults} min={1} max={maxAdults} onChange={setAdults} />
              <CounterField isDark={isDark} label="Children" value={children} min={0} max={maxChildren} onChange={setChildren} />
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
                  onPress={() => setSelectedRoomTypeId(option.id)}
                />
              ))}
            </View>
            <CounterField isDark={isDark} label="Rooms" value={roomCount} min={1} max={maxRooms} onChange={setRoomCount} />
            <View style={styles.optionRow}>
              {bedOptions.map((option) => (
                <SelectionPill
                  key={option.id}
                  isDark={isDark}
                  active={selectedBedOption?.id === option.id}
                  label={option.label}
                  onPress={() => setSelectedBedOptionId(option.id)}
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
                  onPress={() => setSelectedArrivalWindowId(option.id)}
                />
              ))}
            </View>
            <TextInput
              multiline
              placeholder="Special request, late check-in note, twin-bed request, quiet room..."
              placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
              style={[styles.notesInput, isDark && styles.notesInputDark]}
              value={specialRequest}
              onChangeText={setSpecialRequest}
            />
          </View>

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Price summary</ThemedText>
            <View style={styles.priceRow}>
              <ThemedText style={[styles.priceLabel, isDark && styles.priceLabelDark]}>{stay.priceLabel} x {nights} night{nights === 1 ? '' : 's'} x {roomCount} room{roomCount === 1 ? '' : 's'}</ThemedText>
                <ThemedText style={[styles.priceValue, isDark && styles.priceValueDark]}>${totalPrice}</ThemedText>
            </View>
            <View style={styles.priceRow}>
              <ThemedText style={[styles.priceMeta, isDark && styles.priceMetaDark]}>
                {formatDateLabel(checkIn)} - {formatDateLabel(checkOut)} · {guestSummary} · {roomSummary}
              </ThemedText>
            </View>
          </View>

          <Pressable
            style={[
              styles.confirmButton,
              isDark && styles.confirmButtonDark,
              isBooking && styles.confirmButtonDisabled,
            ]}
            onPress={confirmBooking}
            disabled={isBooking}>
            {isBooking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={[styles.confirmButtonText, isDark && styles.confirmButtonTextDark]}>
                Request this stay
              </ThemedText>
            )}
          </Pressable>
        </BottomSheetScrollView>
      </GlassBottomSheet>

      <GlassBottomSheet
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
                          : 'rgba(69,71,69,0.42)'
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
              <ActivityIndicator color="#FFFFFF" />
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

function DetailBlock({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <View style={[styles.detailBlock, isDark && styles.detailBlockDark]}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={[styles.detailValue, isDark && styles.detailValueDark]}>{value}</ThemedText>
    </View>
  );
}

function PreviewPill({
  isDark,
  icon,
  label,
}: {
  isDark: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <View style={[styles.previewPill, isDark && styles.previewPillDark]}>
      {icon}
      <ThemedText style={[styles.previewPillText, isDark && styles.previewPillTextDark]}>{label}</ThemedText>
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
          {avatarUri ? (
            <Image source={avatarUri} contentFit="cover" style={styles.smallAvatarImage} />
          ) : (
            <View style={[styles.avatarFallback, isDark && styles.avatarFallbackDark]}>
              <ThemedText style={[styles.avatarFallbackText, isDark && styles.avatarFallbackTextDark]}>
                {name.slice(0, 1).toUpperCase()}
              </ThemedText>
            </View>
          )}
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
    backgroundColor: '#eff3ea',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  availabilityText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
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
    fontSize: 36,
    lineHeight: 38,
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
  previewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.08)',
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewPillDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  previewPillText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  previewPillTextDark: {
    color: darkSheetPalette.text,
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
    fontWeight: '800',
    letterSpacing: -0.3,
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
  detailGrid: {
    gap: 12,
  },
  detailBlock: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14,15,12,0.08)',
  },
  detailBlockDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  detailLabel: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.gray,
  },
  detailValue: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
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
    backgroundColor: '#f4f4f1',
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
    fontWeight: '700',
    color: '#161713',
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
    fontWeight: '800',
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
    borderColor: 'rgba(14,15,12,0.08)',
  },
  reviewActionDark: {
    backgroundColor: darkSheetPalette.surface,
    borderColor: darkSheetPalette.border,
  },
  reviewActionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
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
  reviewCard: {
    paddingVertical: 20,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
    fontWeight: '800',
    color: designSystem.colors.ink,
  },
  avatarFallbackTextDark: {
    color: darkSheetPalette.text,
  },
  reviewName: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    color: '#11120d',
  },
  reviewNameDark: {
    color: darkSheetPalette.text,
  },
  reviewVisited: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#8b8e87',
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
    color: '#161713',
  },
  reviewQuoteDark: {
    color: darkSheetPalette.mutedText,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(249,249,246,0.96)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  bottomBarDark: {
    backgroundColor: 'rgba(16,18,15,0.96)',
  },
  bottomBarLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8b8e87',
  },
  bottomBarLabelDark: {
    color: darkSheetPalette.mutedText,
  },
  bottomBarPrice: {
    marginTop: 6,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: '#10110d',
  },
  bottomBarPriceDark: {
    color: darkSheetPalette.text,
  },
  bottomBarSuffix: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#8b8e87',
  },
  bottomBarSuffixDark: {
    color: darkSheetPalette.mutedText,
  },
  bookNearbyButton: {
    minWidth: 166,
    height: 54,
    borderRadius: 999,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  bookNearbyText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    color: designSystem.colors.darkGreen,
  },
  sheetRoot: {
    flex: 1,
  },
  reviewSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 18,
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 40,
    gap: 18,
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
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14,15,12,0.08)',
  },
  sheetSectionDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  sheetSectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
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
    borderColor: 'rgba(14,15,12,0.08)',
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
    fontWeight: '700',
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
    borderBottomColor: 'rgba(14,15,12,0.08)',
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
    fontWeight: '800',
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
    borderColor: 'rgba(14,15,12,0.16)',
  },
  selectionRowDotDark: {
    borderColor: darkSheetPalette.border,
  },
  selectionRowDotActive: {
    backgroundColor: darkSheetPalette.accent,
    borderColor: darkSheetPalette.accent,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    fontWeight: '700',
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
    borderColor: 'rgba(14,15,12,0.08)',
  },
  counterButtonDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  counterButtonText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
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
    fontWeight: '800',
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
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  inlineSummaryValueDark: {
    color: darkSheetPalette.text,
  },
  notesInput: {
    minHeight: 110,
    borderRadius: 22,
    backgroundColor: designSystem.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.08)',
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  priceLabelDark: {
    color: darkSheetPalette.text,
  },
  priceValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
  priceValueDark: {
    color: darkSheetPalette.text,
  },
  priceMeta: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
    textAlign: 'right',
  },
  priceMetaDark: {
    color: darkSheetPalette.mutedText,
  },
  confirmButton: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDark: {
    backgroundColor: darkSheetPalette.accent,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    color: designSystem.colors.darkGreen,
  },
  confirmButtonTextDark: {
    color: darkSheetPalette.accentText,
  },
});
