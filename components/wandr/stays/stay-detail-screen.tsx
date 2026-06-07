import { useAction, useMutation, useQuery } from 'convex/react';
import { GlassView } from '@/lib/glass-effect';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ClockCountdown, MapPin, Star } from 'phosphor-react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/ui/input';
import { Sheet, SheetScrollView, SheetView, SheetRef } from '@/components/ui/sheet';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { ExperienceGalleryCarousel, type GalleryImageItem } from '@/components/wandr/explore/experience-gallery-carousel';
import { WandrHeader } from '@/components/wandr/header';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import {
  CounterField,
  ReviewCard,
  SectionHeading,
  SelectionPill,
  SelectionRow,
  StayDetailsDropdown,
} from '@/components/wandr/stays/stay-detail-sections';
import { styles } from '@/components/wandr/stays/stay-detail-screen.styles';
import {
  buildGuestSummary,
  buildRoomSummary,
  dayOffsets,
  formatDateLabel,
  formatDayOffsetLabel,
  formatReviewCount,
  formatReviewDate,
  getDayOffsetFromToday,
  getNightsBetween,
  nightOptions,
} from '@/components/wandr/stays/stay-detail-model';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { useRequireAuthAction } from '@/hooks/use-require-auth-action';
import {
  createStayBookingRef,
  createBookingComOrderRef,
  generateLocationPhotoUploadUrlRef,
  getStayAvailabilityRef,
  getStayBySlugRef,
  getTravelerStayBookingRef,
  listLocationPhotosRef,
  listStayRatingsRef,
  listUserTripsRef,
  previewBookingComOrderRef,
  searchBookingComAvailabilityRef,
  submitLocationPhotoRef,
  submitStayRatingRef,
} from '@/lib/convex';
import { formatUsdConversionParts } from '@/lib/currency';
import type {
  StayArrivalOption,
  StayBookingDetails,
  StayBookingProfile,
} from '@/types/stays';

type BookingComProduct = {
  id: string;
  label: string;
  allocation?: unknown;
  currencyCode: string;
  priceTotal: number;
  policies?: unknown;
  roomId?: string;
};

type BookingComPaymentOption = {
  method: string;
  timing: string;
};

type BookingComPreview = {
  orderToken: string;
  currencyCode: string;
  totalPrice: number;
  paymentOptions: BookingComPaymentOption[];
  products: BookingComProduct[];
  policies?: unknown;
};

function formatBookingComApiDate(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDirectCurrencyParts(amount: number, currencyCode = 'USD') {
  return {
    amountLabel: new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount),
    rateLabel: currencyCode.toUpperCase(),
  };
}

function splitDisplayName(value?: string | null) {
  const parts = value?.trim().split(/\s+/).filter(Boolean) ?? [];
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') || parts[0] || '',
  };
}

function getBookingComPaymentKey(option: BookingComPaymentOption) {
  return `${option.method}:${option.timing}`;
}

function formatBookingComPaymentLabel(option: BookingComPaymentOption) {
  const method = option.method.replace(/_/g, ' ');
  const timing = option.timing.replace(/_/g, ' ');
  return `${method} · ${timing}`;
}

function formatPolicySummary(value: unknown): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map(formatPolicySummary)
      .filter(Boolean)
      .slice(0, 2)
      .join(' · ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      formatPolicySummary(record.description) ||
      formatPolicySummary(record.type) ||
      formatPolicySummary(record.name)
    );
  }
  return '';
}

function normalizeCardExpiryDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(0?[1-9]|1[0-2])\s*\/?\s*(\d{2}|\d{4})$/);
  if (!match) {
    return trimmed;
  }

  const month = match[1].padStart(2, '0');
  const year = match[2].length === 2 ? `20${match[2]}` : match[2];
  return `${year}-${month}`;
}

function bookingComPaymentNeedsCard(option: BookingComPaymentOption | null) {
  if (!option) {
    return true;
  }
  const method = option.method.toLowerCase();
  const timing = option.timing.toLowerCase();
  return method.includes('card') || timing.includes('online') || timing.includes('now');
}

function deferStateSync(update: () => void) {
  let isCancelled = false;
  const schedule = typeof queueMicrotask === 'function' ? queueMicrotask : (callback: () => void) => setTimeout(callback, 0);
  schedule(() => {
    if (!isCancelled) {
      update();
    }
  });
  return () => {
    isCancelled = true;
  };
}

export function StayDetailScreen({
  onClose,
  slug: slugProp,
}: {
  onClose?: () => void;
  slug?: string;
} = {}) {
  const { slug: routeSlug } = useLocalSearchParams<{ slug?: string }>();
  const slug = slugProp ?? routeSlug;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();
  const requireAuthAction = useRequireAuthAction();
  const settings = useCurrentUserSettings();
  const travelerSlug = traveler?.slug ?? '';
  const preferredCurrency = settings?.preferredCurrency ?? 'USD';

  const currentLocation = useCurrentLocation();
  const createBooking = useMutation(createStayBookingRef);
  const searchBookingComAvailability = useAction(searchBookingComAvailabilityRef);
  const previewBookingComOrder = useAction(previewBookingComOrderRef);
  const createBookingComOrder = useAction(createBookingComOrderRef);
  const generatePhotoUploadUrl = useMutation(generateLocationPhotoUploadUrlRef);
  const submitLocationPhoto = useMutation(submitLocationPhotoRef);
  const submitStayRating = useMutation(submitStayRatingRef);
  const trips = useQuery(listUserTripsRef, travelerSlug ? { travelerSlug } : 'skip');
  const selectedTripId = trips?.[0]?._id;

  const stay = useQuery(getStayBySlugRef, slug ? { slug } : 'skip');
  const availability = useQuery(getStayAvailabilityRef, slug ? { staySlug: slug } : 'skip');
  const existingStayBooking = useQuery(
    getTravelerStayBookingRef,
    slug && travelerSlug ? { staySlug: slug, travelerSlug } : 'skip'
  );
  const communityPhotos = useQuery(
    listLocationPhotosRef,
    slug ? { locationKind: 'stay', locationSlug: slug } : 'skip'
  );
  const reviews = useQuery(listStayRatingsRef, slug ? { staySlug: slug } : 'skip');

  const [isBooking, setIsBooking] = useState(false);
  const [isCheckingBookingComAvailability, setIsCheckingBookingComAvailability] = useState(false);
  const [bookingComProducts, setBookingComProducts] = useState<BookingComProduct[]>([]);
  const [selectedBookingComProductId, setSelectedBookingComProductId] = useState('');
  const [bookingComPreview, setBookingComPreview] = useState<BookingComPreview | null>(null);
  const [selectedPaymentKey, setSelectedPaymentKey] = useState('');
  const [bookerFirstName, setBookerFirstName] = useState('');
  const [bookerLastName, setBookerLastName] = useState('');
  const [bookerEmail, setBookerEmail] = useState('');
  const [bookerPhone, setBookerPhone] = useState('');
  const [bookerAddressLine, setBookerAddressLine] = useState('');
  const [bookerCity, setBookerCity] = useState('');
  const [bookerPostCode, setBookerPostCode] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiryDate, setCardExpiryDate] = useState('');
  const [cardCvc, setCardCvc] = useState('');
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
  const [bookingBaseTime] = useState(() => Date.now());
  const bookingSheetRef = useRef<SheetRef>(null);
  const bookingSheetSnapPoints = useMemo(() => ['50%', '100%'], []);
  const bookingSheetAnimatedIndex = useSharedValue(-1);
  const reviewSheetRef = useRef<SheetRef>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const explicitBookingProfile = stay?.bookingProfile;
  const isBookingComStay = stay?.source === 'bookingCom';
  const bookingProfile: StayBookingProfile | null = useMemo(
    () => explicitBookingProfile ?? null,
    [explicitBookingProfile]
  );
  const roomOptions = bookingProfile?.roomOptions ?? [];
  const selectedRoomOption =
    roomOptions.find((option) => option.id === selectedRoomTypeId);
  const bedOptions = selectedRoomOption?.bedOptions ?? [];
  const selectedBedOption =
    bedOptions.find((option) => option.id === selectedBedOptionId);
  const arrivalOptions = bookingProfile?.arrivalOptions ?? [];
  const selectedArrivalOption =
    arrivalOptions.find((option) => option.id === selectedArrivalWindowId);
  const maxAdults = isBookingComStay ? 8 : selectedRoomOption?.maxAdults ?? 0;
  const maxChildren = isBookingComStay ? 6 : selectedRoomOption?.maxChildren ?? 0;
  const maxRooms = isBookingComStay ? 8 : selectedRoomOption?.maxRooms ?? 0;
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
    );
    const initialBedOption = initialRoomOption?.bedOptions[0];
    const initialArrivalOption = bookingProfile.arrivalOptions.find(
      (option) => option.id === bookingProfile.defaultArrivalOptionId
    );

    if (!initialRoomOption || !initialBedOption || !initialArrivalOption) {
      return;
    }

    return deferStateSync(() => {
      setSelectedRoomTypeId(initialRoomOption.id);
      setSelectedBedOptionId(initialBedOption.id);
      setSelectedArrivalWindowId(initialArrivalOption.id);
      setRoomCount(1);
      setAdults(Math.min(adults, initialRoomOption.maxAdults));
      setChildren(0);
    });
  }, [adults, bookingProfile, existingStayBooking]);

  useEffect(() => {
    if (!selectedRoomOption) {
      return;
    }

    return deferStateSync(() => {
      if (!selectedRoomOption.bedOptions.some((option) => option.id === selectedBedOptionId)) {
        setSelectedBedOptionId('');
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
    });
  }, [selectedRoomOption, selectedBedOptionId, roomCount, adults, children]);

  useEffect(() => {
    const splitName = splitDisplayName(traveler?.name);
    return deferStateSync(() => {
      if (!bookerFirstName && splitName.firstName) setBookerFirstName(splitName.firstName);
      if (!bookerLastName && splitName.lastName) setBookerLastName(splitName.lastName);
      if (!cardholderName && traveler?.name) setCardholderName(traveler.name);
      if (!bookerEmail && traveler?.email) setBookerEmail(traveler.email);
      if (!bookerCity && traveler?.homeCity) setBookerCity(traveler.homeCity);
    });
  }, [bookerCity, bookerEmail, bookerFirstName, bookerLastName, cardholderName, traveler?.email, traveler?.homeCity, traveler?.name]);

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
  const computedCheckIn = bookingBaseTime + dayOffset * 86_400_000;
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
  const selectedBookingComProduct =
    bookingComProducts.find((product) => product.id === selectedBookingComProductId) ??
    bookingComProducts[0] ??
    null;
  const bookingComPaymentOptions = bookingComPreview?.paymentOptions ?? [];
  const selectedBookingComPaymentOption =
    bookingComPaymentOptions.find((option) => getBookingComPaymentKey(option) === selectedPaymentKey) ??
    bookingComPaymentOptions[0] ??
    (bookingComPreview ? { method: 'card', timing: 'pay_online_now' } : null);
  const bookingComCurrencyCode =
    bookingComPreview?.currencyCode ??
    selectedBookingComProduct?.currencyCode ??
    stay.currencyCode ??
    preferredCurrency;
  const bookingComBookerCountry = (stay.countryCode ?? 'US').toLowerCase();
  const bookingComTotalPrice =
    bookingComPreview?.totalPrice ??
    selectedBookingComProduct?.priceTotal ??
    0;
  const bookingComTotalPriceDisplay =
    bookingComTotalPrice > 0
      ? formatDirectCurrencyParts(bookingComTotalPrice, bookingComCurrencyCode)
      : { amountLabel: 'Check availability', rateLabel: 'Live rates at checkout' };
  const totalPrice = bookingTotalOverride ?? stay.pricePerNight * nights * roomCount;
  const hasExistingStayBooking = !!existingStayBooking;
  const bookingBarTotalAmount = existingStayBooking?.totalPrice ?? totalPrice;
  const nightlyPrice = isBookingComStay
    ? { amountLabel: bookingComProducts.length > 0 ? 'Live rate' : 'Check availability', rateLabel: 'Booking.com' }
    : formatUsdConversionParts(stay.pricePerNight, preferredCurrency);
  const totalPriceDisplay = isBookingComStay
    ? bookingComTotalPriceDisplay
    : formatUsdConversionParts(totalPrice, preferredCurrency);
  const bookingBarTotalPrice = hasExistingStayBooking
    ? formatUsdConversionParts(bookingBarTotalAmount, preferredCurrency)
    : isBookingComStay
      ? bookingComTotalPriceDisplay
      : formatUsdConversionParts(bookingBarTotalAmount, preferredCurrency);
  const bookingBarNights = existingStayBooking
    ? getNightsBetween(existingStayBooking.checkIn, existingStayBooking.checkOut)
    : nights;
  const confirmedAvailabilityCount = availability?.length ?? 0;
  const reviewItems = reviews ?? [];
  const reviewsAreLoading = reviews === undefined;
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
  const bookingComConfirmLabel =
    bookingComProducts.length === 0
      ? 'Check availability'
      : !bookingComPreview
        ? 'Preview booking'
        : 'Create Booking.com order';
  const confirmButtonLabel = isBookingComStay
    ? bookingComConfirmLabel
    : hasExistingStayBooking
      ? 'Update stay request'
      : 'Request this stay';
  const confirmButtonIsBusy = isBooking || isCheckingBookingComAvailability;

  const clearBookingSnapshot = () => {
    setBookingDateOverride(null);
    setBookingTotalOverride(null);
    setBookingComProducts([]);
    setSelectedBookingComProductId('');
    setBookingComPreview(null);
    setSelectedPaymentKey('');
  };

  const handleBookPress = () => {
    if (!requireAuthAction()) {
      return;
    }

    if (isBookingComStay) {
      clearBookingSnapshot();
      bookingSheetRef.current?.snapToIndex(0);
      return;
    }

    if (!bookingProfile || !selectedRoomOption || !selectedBedOption || !selectedArrivalOption) {
      Alert.alert('Booking unavailable', 'This stay does not have complete booking details yet.');
      return;
    }

    clearBookingSnapshot();
    bookingSheetRef.current?.snapToIndex(0);
  };

  const handleOpenReviewSheet = () => {
    if (!requireAuthAction()) {
      return;
    }

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
    if (reviewRating < 1 || !requireAuthAction() || !travelerSlug) {
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
    if (!requireAuthAction() || !travelerSlug || isUploadingPhoto) {
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
      Alert.alert('Photo submitted', 'A manager will approve it before it appears in the gallery.');
    } catch {
      Alert.alert('Photo upload failed', 'Could not share that picture. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const loadBookingComAvailability = async () => {
    if (!stay.bookingComAccommodationId) {
      Alert.alert('Availability unavailable', 'This Booking.com stay is missing its accommodation ID.');
      return [];
    }

    setIsCheckingBookingComAvailability(true);
    setBookingComPreview(null);
    setSelectedPaymentKey('');
    try {
      const products = await searchBookingComAvailability({
        accommodationId: stay.bookingComAccommodationId,
        checkIn: formatBookingComApiDate(checkIn),
        checkOut: formatBookingComApiDate(checkOut),
        guests: {
          number_of_adults: adults,
          children: children > 0 ? Array.from({ length: children }, () => 12) : undefined,
          number_of_rooms: roomCount,
        },
        currency: preferredCurrency,
        bookerCountry: bookingComBookerCountry,
      }) as BookingComProduct[];

      setBookingComProducts(products);
      setSelectedBookingComProductId(products[0]?.id ?? '');
      if (products.length === 0) {
        Alert.alert('No rooms found', 'Booking.com did not return live rooms for those dates.');
      }
      return products;
    } catch (error: any) {
      Alert.alert('Availability failed', error.message || 'Could not check Booking.com availability.');
      return [];
    } finally {
      setIsCheckingBookingComAvailability(false);
    }
  };

  const previewBookingComSelection = async () => {
    const product = selectedBookingComProduct ?? bookingComProducts[0];
    if (!stay.bookingComAccommodationId || !product) {
      Alert.alert('Choose a room', 'Check availability and choose a live Booking.com room first.');
      return null;
    }

    setIsCheckingBookingComAvailability(true);
    try {
      const preview = await previewBookingComOrder({
        accommodationId: stay.bookingComAccommodationId,
        checkIn: formatBookingComApiDate(checkIn),
        checkOut: formatBookingComApiDate(checkOut),
        products: [
          {
            id: product.id,
            allocation: product.allocation,
          },
        ],
        booker: {
          country: bookingComBookerCountry,
          platform: 'mobile',
          travel_purpose: 'leisure',
        },
        currency: preferredCurrency,
      }) as BookingComPreview;

      setBookingComPreview(preview);
      setSelectedPaymentKey(preview.paymentOptions[0] ? getBookingComPaymentKey(preview.paymentOptions[0]) : '');
      return preview;
    } catch (error: any) {
      Alert.alert('Preview failed', error.message || 'Could not preview this Booking.com order.');
      return null;
    } finally {
      setIsCheckingBookingComAvailability(false);
    }
  };

  const validateBookingComCheckout = () => {
    const missingFields: string[] = [];
    if (!bookerFirstName.trim()) missingFields.push('first name');
    if (!bookerLastName.trim()) missingFields.push('last name');
    if (!bookerEmail.trim()) missingFields.push('email');
    if (!bookerPhone.trim()) missingFields.push('phone');
    if (!bookerAddressLine.trim()) missingFields.push('address');
    if (!bookerCity.trim()) missingFields.push('city');
    if (!bookerPostCode.trim()) missingFields.push('post code');

    const needsCard = bookingComPaymentNeedsCard(selectedBookingComPaymentOption);
    const cardDigits = cardNumber.replace(/\D/g, '');
    const normalizedExpiry = normalizeCardExpiryDate(cardExpiryDate);
    if (needsCard) {
      if (!cardholderName.trim()) missingFields.push('cardholder name');
      if (cardDigits.length < 12) missingFields.push('card number');
      if (!/^\d{4}-\d{2}$/.test(normalizedExpiry)) missingFields.push('card expiry');
      if (cardCvc.trim().length < 3) missingFields.push('CVC');
    }

    if (missingFields.length > 0) {
      Alert.alert('Missing details', `Add ${missingFields.join(', ')} before creating the order.`);
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(bookerEmail.trim())) {
      Alert.alert('Check email', 'Enter a valid email address for the Booking.com confirmation.');
      return false;
    }

    return true;
  };

  const confirmBookingComBooking = async () => {
    const product = selectedBookingComProduct ?? bookingComProducts[0];
    const paymentOption = selectedBookingComPaymentOption;
    if (!stay.bookingComAccommodationId || !bookingComPreview || !product || !paymentOption) {
      Alert.alert('Preview required', 'Preview the Booking.com order before creating it.');
      return;
    }
    if (!validateBookingComCheckout()) {
      return;
    }

    const cardDigits = cardNumber.replace(/\D/g, '');
    const paymentNeedsCard = bookingComPaymentNeedsCard(paymentOption);
    setIsBooking(true);
    try {
      await createBookingComOrder({
        travelerSlug,
        tripId: selectedTripId,
        orderToken: bookingComPreview.orderToken,
        accommodation: {
          accommodationId: stay.bookingComAccommodationId,
          accommodationSlug: stay.slug,
          checkIn: formatBookingComApiDate(checkIn),
          checkOut: formatBookingComApiDate(checkOut),
          products: [
            {
              id: product.id,
              label: product.label,
              allocation: product.allocation,
              priceTotal: bookingComPreview.totalPrice || product.priceTotal,
              currencyCode: bookingComPreview.currencyCode || product.currencyCode,
            },
          ],
          remarks: specialRequest.trim()
            ? {
                special_requests: specialRequest.trim(),
              }
            : undefined,
        },
        booker: {
          address: {
            address_line: bookerAddressLine.trim(),
            city: bookerCity.trim(),
            country: bookingComBookerCountry,
            post_code: bookerPostCode.trim(),
          },
          email: bookerEmail.trim(),
          language: 'en-gb',
          name: {
            first_name: bookerFirstName.trim(),
            last_name: bookerLastName.trim(),
          },
          telephone: bookerPhone.trim(),
        },
        payment: {
          method: paymentOption.method,
          timing: paymentOption.timing,
          include_receipt: true,
          card: paymentNeedsCard
            ? {
                cardholder: cardholderName.trim(),
                cvc: cardCvc.trim(),
                expiry_date: normalizeCardExpiryDate(cardExpiryDate),
                number: cardDigits,
              }
            : undefined,
        },
      });
      bookingSheetRef.current?.close();
      Alert.alert(
        'Booking.com order created',
        `${guestSummary} booked ${product.label.toLowerCase()} from ${formatDateLabel(checkIn)} to ${formatDateLabel(checkOut)}.`
      );
      router.push('/trip');
    } catch (error: any) {
      Alert.alert('Booking Failed', error.message || 'Could not create the Booking.com order.');
    } finally {
      setIsBooking(false);
    }
  };

  const confirmBooking = async () => {
    if (!requireAuthAction() || !travelerSlug) {
      return;
    }

    if (isBookingComStay) {
      if (bookingComProducts.length === 0) {
        await loadBookingComAvailability();
        return;
      }
      if (!bookingComPreview) {
        await previewBookingComSelection();
        return;
      }
      await confirmBookingComBooking();
      return;
    }

    if (!selectedRoomOption || !selectedBedOption || !selectedArrivalOption) {
      return;
    }

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
        hasExistingStayBooking ? 'Stay request updated' : 'Stay requested',
        `${guestSummary} requested ${roomSummary.toLowerCase()} from ${formatDateLabel(checkIn)} to ${formatDateLabel(checkOut)}. The stay is in your trip.`
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
          leadingAction: onClose
            ? { kind: 'back', accessibilityLabel: 'Close stay details', onPress: onClose }
            : { kind: 'back', accessibilityLabel: 'Go back' },
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
                userAccuracy={currentLocation.accuracy}
                userAvatarPaletteKey={traveler?.slug}
                userAvatarUri={traveler?.avatarUri}
                userHeading={currentLocation.heading}
                userIsStale={currentLocation.isStale}
                userName={traveler?.name}
                userPuckVariant="navigation"
                userSpeed={currentLocation.speed}
                userUpdatedAt={currentLocation.updatedAt}
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
        totalPriceLabel={bookingBarTotalPrice.amountLabel}
        totalPriceRateLabel={bookingBarTotalPrice.rateLabel}
      />

      <Sheet
        index={-1}
        ref={bookingSheetRef}
        snapPoints={bookingSheetSnapPoints}
        animatedIndex={bookingSheetAnimatedIndex}
        containerStyle={styles.sheetLayer}
        enablePanDownToClose>
        <SheetScrollView
          style={styles.sheetRoot}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.sheetPaddedBlock, bookingSheetHeaderAnimatedStyle]}>
            <ThemedText style={styles.sheetTitle}>
              {hasExistingStayBooking
                ? 'Your stay request'
                : isBookingComStay
                  ? 'Book with Booking.com'
                  : 'Build the stay request'}
            </ThemedText>
            <ThemedText style={[styles.sheetSubtitle, isDark && styles.sheetSubtitleDark]}>
              {hasExistingStayBooking
                ? 'Review the dates, guests, room setup, and host note you booked.'
                : isBookingComStay
                  ? 'Live rooms, policies, and payment options are confirmed before the order is created.'
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
            {isBookingComStay ? (
              <>
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
                <Pressable
                  style={[
                    styles.sheetInlineAction,
                    isDark && styles.sheetInlineActionDark,
                    isCheckingBookingComAvailability && styles.sheetInlineActionDisabled,
                  ]}
                  onPress={() => {
                    void loadBookingComAvailability();
                  }}
                  disabled={isCheckingBookingComAvailability}>
                  {isCheckingBookingComAvailability && bookingComProducts.length === 0 ? (
                    <ActivityIndicator size="small" color={designSystem.colors.darkGreen} />
                  ) : (
                    <ThemedText style={[styles.sheetInlineActionText, isDark && styles.sheetInlineActionTextDark]}>
                      Check live availability
                    </ThemedText>
                  )}
                </Pressable>
                {bookingComProducts.length > 0 ? (
                  <View style={styles.verticalOptionList}>
                    {bookingComProducts.map((option) => {
                      const price = formatDirectCurrencyParts(option.priceTotal, option.currencyCode);
                      const policySummary = formatPolicySummary(option.policies);
                      return (
                        <SelectionRow
                          key={option.id}
                          isDark={isDark}
                          active={selectedBookingComProduct?.id === option.id}
                          label={option.label}
                          detail={`${price.amountLabel} total${policySummary ? ` · ${policySummary}` : ''}`}
                          onPress={() => {
                            setSelectedBookingComProductId(option.id);
                            setBookingComPreview(null);
                            setSelectedPaymentKey('');
                          }}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <ThemedText style={[styles.sheetSectionBody, isDark && styles.sheetSectionBodyDark]}>
                    No live rooms loaded for these dates.
                  </ThemedText>
                )}
                {bookingComPreview ? (
                  <View style={styles.verticalOptionList}>
                    <ThemedText style={[styles.sheetSectionTitleSmall, isDark && styles.sheetSectionTitleSmallDark]}>
                      Payment option
                    </ThemedText>
                    <View style={styles.optionRow}>
                      {(bookingComPaymentOptions.length > 0
                        ? bookingComPaymentOptions
                        : [{ method: 'card', timing: 'pay_online_now' }]
                      ).map((option) => (
                        <SelectionPill
                          key={getBookingComPaymentKey(option)}
                          isDark={isDark}
                          active={getBookingComPaymentKey(selectedBookingComPaymentOption ?? option) === getBookingComPaymentKey(option)}
                          label={formatBookingComPaymentLabel(option)}
                          onPress={() => setSelectedPaymentKey(getBookingComPaymentKey(option))}
                        />
                      ))}
                    </View>
                    {bookingComPreview.policies ? (
                      <ThemedText style={[styles.sheetSectionBody, isDark && styles.sheetSectionBodyDark]}>
                        {formatPolicySummary(bookingComPreview.policies)}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : (
              <>
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
              </>
            )}
          </View>

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>
              {isBookingComStay ? 'Notes' : 'Arrival and notes'}
            </ThemedText>
            {isBookingComStay ? null : (
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
            )}
            <Input
              multiline
              containerStyle={[styles.notesInput, isDark && styles.notesInputDark]}
              placeholder="Special request, late check-in note, twin-bed request, quiet room..."
              placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
              style={[styles.notesInputText, isDark && styles.notesInputTextDark]}
              value={specialRequest}
              onChangeText={(value) => {
                clearBookingSnapshot();
                setSpecialRequest(value);
              }}
            />
          </View>

          {isBookingComStay ? (
            <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
              <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Booker details</ThemedText>
              <View style={styles.sheetFieldGrid}>
                <Input
                  autoCapitalize="words"
                  containerStyle={[styles.sheetInput, isDark && styles.sheetInputDark]}
                  placeholder="First name"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                  value={bookerFirstName}
                  onChangeText={setBookerFirstName}
                />
                <Input
                  autoCapitalize="words"
                  containerStyle={[styles.sheetInput, isDark && styles.sheetInputDark]}
                  placeholder="Last name"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                  value={bookerLastName}
                  onChangeText={setBookerLastName}
                />
                <Input
                  autoCapitalize="none"
                  autoComplete="email"
                  containerStyle={[styles.sheetInput, isDark && styles.sheetInputDark]}
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                  textContentType="emailAddress"
                  value={bookerEmail}
                  onChangeText={setBookerEmail}
                />
                <Input
                  autoComplete="tel"
                  containerStyle={[styles.sheetInput, isDark && styles.sheetInputDark]}
                  keyboardType="phone-pad"
                  placeholder="Phone"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                  textContentType="telephoneNumber"
                  value={bookerPhone}
                  onChangeText={setBookerPhone}
                />
                <Input
                  autoCapitalize="words"
                  containerStyle={[styles.sheetInput, isDark && styles.sheetInputDark]}
                  placeholder="Address"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                  value={bookerAddressLine}
                  onChangeText={setBookerAddressLine}
                />
                <Input
                  autoCapitalize="words"
                  containerStyle={[styles.sheetInput, isDark && styles.sheetInputDark]}
                  placeholder="City"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                  value={bookerCity}
                  onChangeText={setBookerCity}
                />
                <Input
                  autoCapitalize="characters"
                  containerStyle={[styles.sheetInput, isDark && styles.sheetInputDark]}
                  placeholder="Post code"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                  value={bookerPostCode}
                  onChangeText={setBookerPostCode}
                />
              </View>
            </View>
          ) : null}

          {isBookingComStay ? (
            <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
              <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Payment</ThemedText>
              <View style={styles.sheetFieldGrid}>
                <Input
                  autoCapitalize="words"
                  containerStyle={[styles.sheetInput, isDark && styles.sheetInputDark]}
                  placeholder="Cardholder name"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                  textContentType="name"
                  value={cardholderName}
                  onChangeText={setCardholderName}
                />
                <Input
                  autoComplete="cc-number"
                  containerStyle={[styles.sheetInput, isDark && styles.sheetInputDark]}
                  keyboardType="number-pad"
                  placeholder="Card number"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                  textContentType="creditCardNumber"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                />
                <View style={styles.sheetFieldRow}>
                  <Input
                    autoComplete="cc-exp"
                    containerStyle={[styles.sheetInput, styles.sheetFieldColumn, isDark && styles.sheetInputDark]}
                    keyboardType="numbers-and-punctuation"
                    placeholder="MM/YY"
                    placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                    style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                    value={cardExpiryDate}
                    onChangeText={setCardExpiryDate}
                  />
                  <Input
                    autoComplete="cc-csc"
                    containerStyle={[styles.sheetInput, styles.sheetFieldColumn, isDark && styles.sheetInputDark]}
                    keyboardType="number-pad"
                    placeholder="CVC"
                    placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                    secureTextEntry
                    style={[styles.sheetInputText, isDark && styles.sheetInputTextDark]}
                    value={cardCvc}
                    onChangeText={setCardCvc}
                  />
                </View>
              </View>
            </View>
          ) : null}

          <View style={[styles.sheetSection, isDark && styles.sheetSectionDark]}>
            <ThemedText style={[styles.sheetSectionTitle, isDark && styles.sheetSectionTitleDark]}>Price summary</ThemedText>
            <View style={[styles.pricePreviewCard, isDark && styles.pricePreviewCardDark]}>
              <View style={styles.priceRow}>
                <View style={styles.priceCopy}>
                  <ThemedText style={[styles.priceLabel, isDark && styles.priceLabelDark]}>
                    {nights} night{nights === 1 ? '' : 's'} · {roomCount} room{roomCount === 1 ? '' : 's'}
                  </ThemedText>
                  <ThemedText style={[styles.priceRate, isDark && styles.priceRateDark]}>
                    {nightlyPrice.amountLabel} nightly
                  </ThemedText>
                </View>
                <View style={styles.priceValueStack}>
                  <ThemedText style={[styles.priceValue, isDark && styles.priceValueDark]}>{totalPriceDisplay.amountLabel}</ThemedText>
                  <ThemedText style={[styles.priceValueRate, isDark && styles.priceValueRateDark]}>{totalPriceDisplay.rateLabel}</ThemedText>
                </View>
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
              confirmButtonIsBusy ? (Platform.OS === 'android' ? styles.confirmButtonDisabledAndroid : styles.confirmButtonDisabled) : null,
            ]}
            onPress={confirmBooking}
            disabled={confirmButtonIsBusy}>
            {confirmButtonIsBusy ? (
              <ActivityIndicator color={designSystem.colors.white} />
            ) : (
              <ThemedText style={[styles.confirmButtonText, isDark && styles.confirmButtonTextDark]}>
                {confirmButtonLabel}
              </ThemedText>
            )}
          </Pressable>
        </SheetScrollView>
      </Sheet>

      <Sheet
        containerStyle={styles.sheetLayer}
        ref={reviewSheetRef}
        index={-1}
        snapPoints={['48%']}
        enablePanDownToClose>
        <SheetView style={[styles.reviewSheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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

          <Input
            multiline
            numberOfLines={4}
            containerStyle={[styles.notesInput, isDark && styles.notesInputDark, styles.reviewNoteInput]}
            placeholder="Add a note"
            placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
            style={[styles.notesInputText, isDark && styles.notesInputTextDark]}
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
        </SheetView>
      </Sheet>
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
  totalPriceLabel,
  totalPriceRateLabel,
}: {
  buttonLabel: string;
  containerStyle?: StyleProp<ViewStyle>;
  isDark: boolean;
  isLoading?: boolean;
  nights: number;
  onPress: () => void;
  totalPriceLabel: string;
  totalPriceRateLabel?: string;
}) {
  const isAndroid = Platform.OS === 'android';
  const shouldUseFallbackGlassFill = Platform.OS !== 'ios';
  const glassEffectProps = shouldUseFallbackGlassFill
    ? {}
    : {
        colorScheme: isDark ? 'dark' as const : 'light' as const,
        glassEffectStyle: 'regular' as const,
        isInteractive: true,
      };

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.bottomBarGlassClip,
          isDark && styles.bottomBarGlassClipDark,
          shouldUseFallbackGlassFill ? (isDark ? styles.bottomBarFallbackGlassClipDark : styles.bottomBarFallbackGlassClip) : null,
        ]}>
        <GlassView
          {...glassEffectProps}
          pointerEvents="none"
          style={[
            ({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
            styles.bottomBarGlassView,
            shouldUseFallbackGlassFill
              ? (isDark ? styles.bottomBarFallbackGlassFillDark : styles.bottomBarFallbackGlassFill)
              : null,
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.bottomBarHighlight,
            isDark && styles.bottomBarHighlightDark,
            shouldUseFallbackGlassFill
              ? (isDark ? styles.bottomBarFallbackHighlightDark : styles.bottomBarFallbackHighlight)
              : null,
          ]}
        />
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomBarPriceBlock}>
            <View style={styles.bottomBarPriceRow}>
              <ThemedText
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[styles.bottomBarPrice, isDark && styles.bottomBarPriceDark]}>
                {totalPriceLabel}
              </ThemedText>
              <ThemedText
                numberOfLines={1}
                style={[styles.bottomBarSuffix, isDark && styles.bottomBarSuffixDark]}>
                for {nights}
              </ThemedText>
            </View>
            <ThemedText
              numberOfLines={1}
              style={[styles.bottomBarSuffix, styles.bottomBarNightSuffix, isDark && styles.bottomBarSuffixDark]}>
              night{nights === 1 ? '' : 's'}
            </ThemedText>
            {totalPriceRateLabel ? (
              <ThemedText style={[styles.bottomBarRate, isDark && styles.bottomBarRateDark]}>
                {totalPriceRateLabel}
              </ThemedText>
            ) : null}
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
