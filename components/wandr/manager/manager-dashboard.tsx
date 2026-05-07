import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Bed, Check, MapTrifold, Plus, Star, UsersThree, X } from 'phosphor-react-native';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';
import { ThemedText } from '@/components/themed-text';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { LargeScreenPanel } from '@/components/wandr/large-screen-workspace';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { useManagerResourceMode } from '@/hooks/use-manager-resource-mode';
import {
  createManagedExperienceRef,
  createManagedStayRef,
  getExploreJoinableTripCardsRef,
  listManagedExperiencesRef,
  listManagedStaysRef,
  listManagedBookingsRef,
  listManagedLocationPhotosRef,
  updateLocationPhotoStatusRef,
  updateManagedBookingStatusRef,
} from '@/lib/convex';
import { formatUsdConversion, formatUsdConversionParts } from '@/lib/currency';
import { fetchMapboxLocationSuggestions } from '@/lib/mapbox-geocoding';
import type { ExploreExperience } from '@/constants/explore-content';
import type { ExploreJoinableTripCard } from '@/types/explore';
import type { StayProperty, StayRoomOption } from '@/types/stays';

type ResourceMode = 'experiences' | 'rooms';
type DetailTab = 'overview' | 'bookings' | 'visits' | 'ratings' | 'images';
type BookingFilter = 'pending' | 'confirmed' | 'cancelled' | 'all';

const detailTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'visits', label: 'Visits' },
  { key: 'ratings', label: 'Ratings' },
  { key: 'images', label: 'Images' },
] as const;

const bookingFilters = [
  { key: 'pending', label: 'Requests' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
] as const;

const EXPERIENCE_CATEGORY_OPTIONS = [
  '',
  'Adventure',
  'Culture',
  'Food & Drink',
  'Gastronomy',
  'Nature',
  'Wildlife',
  'Wellness',
] as const;

const EXPERIENCE_DURATION_OPTIONS = [
  '',
  '45 minutes',
  '2 hours',
  '2-3 hours',
  '3 hours',
  '3-4 hours',
  '4 hours',
  'Half day',
  'Full day',
  'Overnight',
] as const;

const EXPERIENCE_KIND_OPTIONS = ['', 'Experience', 'Hidden gem'] as const;

const PUBLIC_AVAILABILITY_OPTIONS = [
  '',
  'Available today',
  'Open daily',
  'Morning departures',
  'Morning and afternoon departures',
  'Next opening this week',
  'Fully booked',
] as const;

const DEFAULT_MANAGER_MAP_CENTER = [17.0832, -22.57] as const;

const MANAGER_IMPORT_PROMPTS: Record<ResourceMode, string> = {
  experiences: `Generate one valid Wandr manager import JSON file for an experience.

Return ONLY raw JSON. Do not wrap it in markdown. Do not add comments.

The JSON must match this shape exactly. Replace every example value with real content:

{
  "kind": "experience",
  "fields": {
    "itemKind": "Experience",
    "title": "Windhoek Craft Walk",
    "subtitle": "Old brewery, design studios, and coffee stops",
    "description": "A guided city-first route with contemporary Namibian design, easy food stops, and enough structure to feel curated.",
    "category": "Adventure | Culture | Food & Drink | Gastronomy | Nature | Wildlife | Wellness",
    "durationLabel": "45 minutes | 2 hours | 2-3 hours | 3 hours | 3-4 hours | 4 hours | Half day | Full day | Overnight",
    "groupCapacity": 10,
    "priceUsd": 120,
    "mapLocation": {
      "longitude": 17.0832,
      "latitude": -22.5609
    },
    "imageUri": "https://example.com/images/windhoek-craft-walk-cover.jpg",
    "galleryImages": [
      "https://example.com/images/windhoek-craft-walk-1.jpg",
      "https://example.com/images/windhoek-craft-walk-2.jpg"
    ],
    "booking": {
      "availabilityLabel": "Available today | Open daily | Morning departures | Morning and afternoon departures | Next opening this week | Fully booked",
      "confirmMode": "Instant confirmation | Host confirmation within 1 hour | Host confirmation within 2 hours | Host confirmation within 4 hours | Manual confirmation"
    },
    "includes": ["Local guide", "Coffee stop", "Studio visits"]
  }
}

Rules:
- Every field shown above is required.
- All strings must be useful real content, not placeholders like "string", "...", or "https://...".
- imageUri and galleryImages must be valid public image URLs.
- Do not use markdown links. Put bare image URLs only in imageUri and galleryImages.
- Bad image URL: "[https://example.com/photo.jpg"
- Bad text: "Ask](https://example.com/photo.jpg) for a room"
- Notes/descriptions must be plain human text and must not contain JSON fragments, encoded JSON, or image URLs.
- Never put text like "%22galleryImages%22", "\\"imageUri\\"", "\\"bookingNote\\"", or any copied JSON fragment inside a description or note.
- mapLocation must use longitude first and latitude second.
- priceUsd and groupCapacity must be numbers.
- Return one JSON object only.`,
  rooms: `Generate one valid Wandr manager import JSON file for a room.

Return ONLY raw JSON. Do not wrap it in markdown. Do not add comments.

The JSON must match this shape exactly. Replace every example value with real content:

{
  "kind": "room",
  "fields": {
    "stay": {
      "name": "Avani Windhoek Hotel & Casino",
      "bookingPhone": "+264 61 280 0000",
      "summary": "Modern city hotel in central Windhoek, close to shops, craft markets, monuments, and rooftop views across the capital.",
      "imageUri": "https://example.com/images/avani-windhoek-cover.jpg",
      "galleryImages": [
        "https://example.com/images/avani-windhoek-1.jpg",
        "https://example.com/images/avani-windhoek-2.jpg"
      ],
      "priceUsd": 140,
      "bookingNote": "Ask for a city-view room and confirm parking or airport transfer at least 24 hours ahead if needed.",
      "stayStyle": "design | lodge | roadside | wellness",
      "routeVibe": "city reset | coast base | wildlife stop | desert night",
      "idealFor": ["Windhoek overnight reset", "Business travelers", "Self-drive Namibia starters"],
      "amenities": ["Free WiFi", "Rooftop restaurant and bar", "Rooftop pool", "On-site parking"],
      "nearbyHighlights": ["Christuskirche", "Namibia Craft Centre", "Zoo Park"]
    },
    "mapLocation": {
      "longitude": 17.0832,
      "latitude": -22.5609
    }
  }
}

Rules:
- Every field shown above is required.
- All strings must be useful real content, not placeholders like "string", "...", or "https://...".
- imageUri and galleryImages must be valid public image URLs.
- Do not use markdown links. Put bare image URLs only in imageUri and galleryImages.
- Bad image URL: "[https://example.com/photo.jpg"
- Bad bookingNote: "Ask](https://example.com/photo.jpg) for a room"
- bookingNote must be plain human text and must not contain JSON fragments, encoded JSON, or image URLs.
- Never put text like "%22galleryImages%22", "\\"imageUri\\"", "\\"bookingNote\\"", or any copied JSON fragment inside bookingNote.
- mapLocation must use longitude first and latitude second.
- priceUsd must be a number.
- Return one JSON object only.`,
};

type ManagerDashboardProps = {
  travelerSlug?: string | null;
};

type DashboardColors = (typeof designSystem.semantic)[keyof typeof designSystem.semantic];

type ManagedLocationPhoto = {
  id: Id<'locationPhotos'>;
  imageUri: string;
  locationKind: 'experience' | 'stay';
  locationSlug: string;
  travelerSlug: string;
  caption: string | null;
  source: 'user' | 'host';
  status: 'approved' | 'pending' | 'rejected';
  createdAt: number;
  reviewedAt: number | null;
  reviewedBy: string | null;
};

type ManagedBooking = {
  _id: Id<'experienceBookings'> | Id<'stayBookings'>;
  source: 'experienceBooking' | 'stayBooking';
  slug: string;
  title: string;
  subtitle: string;
  imageUri: string | null;
  bookedAt: number;
  kind: 'experience' | 'stay';
  status: 'pending' | 'confirmed' | 'cancelled';
  statusLabel: string;
  travelerSlug: string;
  tripId?: Id<'trips'>;
  tripName?: string | null;
  checkIn?: number;
  checkOut?: number;
  totalPrice?: number;
  detailLabel?: string;
  stayBookingDetails?: {
    guestSummary: string;
    roomSummary: string;
    arrivalWindowLabel: string;
    specialRequest?: string;
  };
};

type ManagedRoom = {
  id: string;
  stay: StayProperty;
  room: StayRoomOption;
  imageUri: string;
};

type ManagedResource =
  | { kind: 'experience'; id: string; experience: ExploreExperience }
  | { kind: 'room'; id: string; room: ManagedRoom };

type SchemaRow = {
  editor?: 'text' | 'number' | 'select' | 'list' | 'json' | 'image' | 'images' | 'coordinate';
  label: string;
  multiline?: boolean;
  options?: readonly string[];
  value: string;
};

type DraftResource =
  | { kind: 'experience'; rows: SchemaRow[] }
  | { kind: 'room'; rows: SchemaRow[] };

type JsonImportReport = {
  fileName: string;
  messages: string[];
  status: 'error' | 'success';
};

type JsonEditorDiagnostic = {
  line?: number;
  message: string;
  severity: 'error' | 'info' | 'warning';
};

export function ManagerDashboard({ travelerSlug }: ManagerDashboardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;
  const { mode } = useManagerResourceMode();
  const settings = useCurrentUserSettings();
  const preferredCurrency = settings?.preferredCurrency ?? 'USD';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('pending');
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [draftResource, setDraftResource] = useState<DraftResource | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const createManagedExperience = useMutation(createManagedExperienceRef);
  const createManagedStay = useMutation(createManagedStayRef);
  const updateLocationPhotoStatus = useMutation(updateLocationPhotoStatusRef);
  const updateManagedBookingStatus = useMutation(updateManagedBookingStatusRef);

  const experiencesQuery = useQuery(listManagedExperiencesRef, travelerSlug ? { managerSlug: travelerSlug } : 'skip');
  const groups = useQuery(getExploreJoinableTripCardsRef, travelerSlug ? { travelerSlug } : 'skip');
  const stays = useQuery(listManagedStaysRef, travelerSlug ? { managerSlug: travelerSlug } : 'skip');
  const bookings = useQuery(listManagedBookingsRef, travelerSlug ? { managerSlug: travelerSlug } : 'skip');
  const locationPhotos = useQuery(listManagedLocationPhotosRef, travelerSlug ? { managerSlug: travelerSlug } : 'skip');

  const experiences = (experiencesQuery as ExploreExperience[] | undefined) ?? [];
  const stayItems = (stays as StayProperty[] | undefined) ?? [];
  const managedBookings = (bookings as ManagedBooking[] | undefined) ?? [];
  const photos = (locationPhotos as ManagedLocationPhoto[] | undefined) ?? [];
  const groupItems = (groups as ExploreJoinableTripCard[] | undefined) ?? [];
  const rooms = useMemo(() => buildManagedRooms(stayItems), [stayItems]);
  const resources = useMemo<ManagedResource[]>(
    () =>
      mode === 'experiences'
        ? experiences.map((experience) => ({ kind: 'experience', id: experience.slug, experience }))
        : rooms.map((room) => ({ kind: 'room', id: room.id, room })),
    [experiences, mode, rooms]
  );

  useEffect(() => {
    if (draftResource) {
      return;
    }

    const currentStillExists = selectedId ? resources.some((resource) => resource.id === selectedId) : false;
    if (!currentStillExists) {
      setSelectedId(resources[0]?.id ?? null);
      setDetailTab('overview');
    }
  }, [draftResource, resources, selectedId]);

  const selectedResource = draftResource
    ? null
    : resources.find((resource) => resource.id === selectedId) ?? resources[0] ?? null;
  const activeBookings = filterBookingsForResource(managedBookings, selectedResource);
  const activePhotos = filterPhotosForResource(photos, selectedResource);
  const visibleBookings =
    bookingFilter === 'all' ? activeBookings : activeBookings.filter((booking) => booking.status === bookingFilter);
  function handleAddResource() {
    setDetailTab('overview');
    setSelectedId(null);
    setDraftResource(mode === 'experiences' ? createDraftExperience() : createDraftRoom());
  }

  function handleSelectResource(resource: ManagedResource) {
    setDraftResource(null);
    setSelectedId(resource.id);
    setDetailTab('overview');
  }

  async function handleCreateDraft() {
    if (!draftResource || !travelerSlug) {
      Alert.alert('Manager account needed', 'Turn on manager mode from your profile settings, then create the draft again.');
      return;
    }

    setIsCreatingDraft(true);
    try {
      if (draftResource.kind === 'experience') {
        const result = await createManagedExperience(buildExperienceCreateArgs(draftResource, travelerSlug));
        setSelectedId(result.slug);
      } else {
        const result = await createManagedStay(buildStayCreateArgs(draftResource, travelerSlug));
        setSelectedId(`${result.slug}:${result.roomId}`);
      }
      setDetailTab('overview');
      setDraftResource(null);
    } catch (error) {
      Alert.alert('Could not create draft', error instanceof Error ? error.message : 'Check the required fields and try again.');
    } finally {
      setIsCreatingDraft(false);
    }
  }

  const currentCount = mode === 'experiences' ? experiences.length : rooms.length;

  return (
    <>
      <LargeScreenPanel kind="main">
        <View style={styles.managerListPanel}>
          <View style={styles.managerListHeader}>
            <View style={styles.managerListTitleBlock}>
              <ThemedText style={styles.managerListTitle}>{mode === 'experiences' ? 'Experiences' : 'Rooms'}</ThemedText>
              <ThemedText style={styles.managerListMeta}>
                {mode === 'experiences' ? `${currentCount} hosted` : `${currentCount} room options`}
              </ThemedText>
            </View>
            <Pressable accessibilityRole="button" onPress={handleAddResource} style={styles.compactCreateButton}>
              <Plus color={designSystem.colors.darkGreen} size={16} weight="bold" />
              <ThemedText style={styles.compactCreateButtonText}>New</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.inventoryHeaderRow, { borderColor: colors.borderSoft }]}>
            <ThemedText style={[styles.inventoryHeaderText, styles.inventoryListingColumn]}>Listing</ThemedText>
            <ThemedText style={[styles.inventoryHeaderText, styles.inventoryMetricColumn]}>Booked</ThemedText>
            <ThemedText style={[styles.inventoryHeaderText, styles.inventoryMetricColumn]}>Images</ThemedText>
          </View>
          <ScrollView contentContainerStyle={styles.resourceList} showsVerticalScrollIndicator={false}>
            {resources.map((resource) => (
              <ResourceListItem
                bookings={managedBookings}
                colors={colors}
                isSelected={!draftResource && selectedResource?.id === resource.id}
                key={resource.id}
                onPress={() => handleSelectResource(resource)}
                photos={photos}
                resource={resource}
              />
            ))}
          </ScrollView>
        </View>
      </LargeScreenPanel>

      {(draftResource || selectedResource) ? (
        <LargeScreenPanel kind="detail" style={styles.managerDetailPanel}>
          {draftResource ? (
            <DraftResourceEditor
              colors={colors}
              draft={draftResource}
              onCancel={() => {
                setDraftResource(null);
                setSelectedId(resources[0]?.id ?? null);
              }}
              onChange={setDraftResource}
              onCreate={handleCreateDraft}
              isCreating={isCreatingDraft}
            />
          ) : selectedResource ? (
            <ResourceDetail
              bookingFilter={bookingFilter}
              bookings={visibleBookings}
              busyBookingId={busyBookingId}
              colors={colors}
              detailTab={detailTab}
              groups={groupItems}
              onApprovePhoto={(photoId) =>
                updateLocationPhotoStatus({ photoId, status: 'approved', reviewerSlug: travelerSlug ?? undefined })
              }
              onChangeBookingFilter={setBookingFilter}
              onChangeTab={setDetailTab}
              onRejectPhoto={(photoId) =>
                updateLocationPhotoStatus({ photoId, status: 'rejected', reviewerSlug: travelerSlug ?? undefined })
              }
              onUpdateStatus={async (booking, status) => {
                setBusyBookingId(booking._id);
                try {
                  await updateManagedBookingStatus({
                    bookingId: booking._id,
                    source: booking.source,
                    status,
                  });
                } finally {
                  setBusyBookingId(null);
                }
              }}
              photos={activePhotos}
              preferredCurrency={preferredCurrency}
              resource={selectedResource}
              totalBookings={activeBookings}
            />
          ) : null}
        </LargeScreenPanel>
      ) : null}
    </>
  );
}

function buildManagedRooms(stays: StayProperty[]): ManagedRoom[] {
  return stays.flatMap((stay) =>
    (stay.bookingProfile?.roomOptions ?? []).map((room) => ({
      id: `${stay.slug}:${room.id}`,
      stay,
      room,
      imageUri: stay.galleryImages[0] ?? stay.imageUri,
    }))
  );
}

function createDraftExperience(): DraftResource {
  return {
    kind: 'experience',
    rows: [
      { editor: 'select', label: 'itemKind', options: EXPERIENCE_KIND_OPTIONS, value: '' },
      { label: 'title', value: '' },
      { label: 'subtitle', value: '' },
      { label: 'description', multiline: true, value: '' },
      { editor: 'select', label: 'category', options: EXPERIENCE_CATEGORY_OPTIONS, value: '' },
      { editor: 'select', label: 'durationLabel', options: EXPERIENCE_DURATION_OPTIONS, value: '' },
      { editor: 'number', label: 'groupCapacity', value: '' },
      { editor: 'number', label: 'priceUsd', value: '' },
      { editor: 'coordinate', label: 'mapLocation', value: '' },
      { editor: 'image', label: 'imageUri', value: '' },
      { editor: 'images', label: 'galleryImages', value: '' },
      { editor: 'select', label: 'booking.availabilityLabel', options: PUBLIC_AVAILABILITY_OPTIONS, value: '' },
      { editor: 'select', label: 'booking.confirmMode', value: '' },
      { editor: 'list', label: 'includes', multiline: true, value: '' },
    ],
  };
}

function createDraftRoom(): DraftResource {
  return {
    kind: 'room',
    rows: [
      { label: 'stay.name', value: '' },
      { label: 'stay.bookingPhone', value: '' },
      { label: 'stay.summary', multiline: true, value: '' },
      { editor: 'coordinate', label: 'mapLocation', value: '' },
      { editor: 'image', label: 'stay.imageUri', value: '' },
      { editor: 'images', label: 'stay.galleryImages', value: '' },
      { editor: 'number', label: 'stay.priceUsd', value: '' },
      { label: 'stay.bookingNote', multiline: true, value: '' },
      { label: 'stay.stayStyle', value: '' },
      { label: 'stay.routeVibe', value: '' },
      { editor: 'list', label: 'stay.idealFor', multiline: true, value: '' },
      { editor: 'list', label: 'stay.amenities', multiline: true, value: '' },
      { editor: 'list', label: 'stay.nearbyHighlights', multiline: true, value: '' },
    ],
  };
}

function getDraftValue(draft: DraftResource, label: string) {
  return draft.rows.find((row) => row.label === label)?.value.trim() ?? '';
}

function formatDraftLabel(label: string) {
  return label
    .replace(/^stay\./, '')
    .replace(/^booking\./, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\./g, ' ')
    .toLowerCase();
}

function requireDraftValue(draft: DraftResource, label: string) {
  const value = getDraftValue(draft, label);
  if (!value) {
    throw new Error(`${formatDraftLabel(label)} is required.`);
  }
  return value;
}

function parseDraftList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function requireDraftList(draft: DraftResource, label: string) {
  const values = parseDraftList(requireDraftValue(draft, label));
  if (values.length === 0) {
    throw new Error(`${formatDraftLabel(label)} needs at least one item.`);
  }
  return values;
}

function requireDraftNumber(draft: DraftResource, label: string) {
  const value = Number(requireDraftValue(draft, label));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${formatDraftLabel(label)} must be a number above 0.`);
  }
  return value;
}

function requireDraftCoordinate(draft: DraftResource, label: string) {
  const coordinate = parseCoordinateValue(requireDraftValue(draft, label));
  if (!coordinate) {
    throw new Error(`${formatDraftLabel(label)} must be longitude, latitude.`);
  }
  return [coordinate[0], coordinate[1]];
}

function buildExperienceCreateArgs(draft: DraftResource, managerSlug: string) {
  const itemKindValue = requireDraftValue(draft, 'itemKind');
  return {
    managerSlug,
    itemKind: itemKindValue === 'Hidden gem' ? 'hiddenGem' as const : 'experience' as const,
    title: requireDraftValue(draft, 'title'),
    subtitle: requireDraftValue(draft, 'subtitle'),
    description: requireDraftValue(draft, 'description'),
    category: requireDraftValue(draft, 'category'),
    durationLabel: requireDraftValue(draft, 'durationLabel'),
    groupCapacity: requireDraftNumber(draft, 'groupCapacity'),
    priceUsd: requireDraftNumber(draft, 'priceUsd'),
    coordinate: requireDraftCoordinate(draft, 'mapLocation'),
    imageUri: requireDraftValue(draft, 'imageUri'),
    galleryImages: requireDraftList(draft, 'galleryImages'),
    availabilityLabel: requireDraftValue(draft, 'booking.availabilityLabel'),
    confirmMode: requireDraftValue(draft, 'booking.confirmMode'),
    includes: requireDraftList(draft, 'includes'),
  };
}

function normalizeStayStyle(value: string): 'design' | 'lodge' | 'roadside' | 'wellness' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'design' || normalized === 'lodge' || normalized === 'roadside' || normalized === 'wellness') {
    return normalized;
  }
  throw new Error('Stay style must be design, lodge, roadside, or wellness.');
}

function normalizeRouteVibe(value: string): 'city reset' | 'coast base' | 'wildlife stop' | 'desert night' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'city reset' || normalized === 'coast base' || normalized === 'wildlife stop' || normalized === 'desert night') {
    return normalized;
  }
  throw new Error('Route vibe must be city reset, coast base, wildlife stop, or desert night.');
}

function buildStayCreateArgs(draft: DraftResource, managerSlug: string) {
  return {
    managerSlug,
    name: requireDraftValue(draft, 'stay.name'),
    summary: requireDraftValue(draft, 'stay.summary'),
    coordinate: requireDraftCoordinate(draft, 'mapLocation'),
    imageUri: requireDraftValue(draft, 'stay.imageUri'),
    galleryImages: requireDraftList(draft, 'stay.galleryImages'),
    priceUsd: requireDraftNumber(draft, 'stay.priceUsd'),
    bookingNote: requireDraftValue(draft, 'stay.bookingNote'),
    stayStyle: normalizeStayStyle(requireDraftValue(draft, 'stay.stayStyle')),
    routeVibe: normalizeRouteVibe(requireDraftValue(draft, 'stay.routeVibe')),
    idealFor: requireDraftList(draft, 'stay.idealFor'),
    amenities: requireDraftList(draft, 'stay.amenities'),
    nearbyHighlights: requireDraftList(draft, 'stay.nearbyHighlights'),
  };
}

function ResourceListItem({
  bookings,
  colors,
  isSelected,
  onPress,
  photos,
  resource,
}: {
  bookings: ManagedBooking[];
  colors: DashboardColors;
  isSelected: boolean;
  onPress: () => void;
  photos: ManagedLocationPhoto[];
  resource: ManagedResource;
}) {
  const title = getResourceTitle(resource);
  const subtitle = getResourceSubtitle(resource);
  const imageUri = getResourceImage(resource);
  const resourceBookings = filterBookingsForResource(bookings, resource);
  const resourcePhotos = filterPhotosForResource(photos, resource);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[
        styles.resourceItem,
        {
          backgroundColor: isSelected ? designSystem.colors.limeSoft : 'transparent',
          borderColor: colors.borderSoft,
        },
      ]}
    >
      {isSelected ? <View style={styles.resourceSelectedRail} /> : null}
      <View style={styles.inventoryListingColumn}>
        <ExpoImage source={{ uri: imageUri }} style={styles.resourceImage} contentFit="cover" />
        <View style={styles.resourceCopy}>
          <ThemedText numberOfLines={1} style={styles.resourceTitle}>{title}</ThemedText>
          <ThemedText numberOfLines={1} style={styles.resourceSubtitle}>{subtitle}</ThemedText>
        </View>
      </View>
      <ThemedText numberOfLines={1} style={[styles.inventoryCellText, styles.inventoryMetricColumn]}>
        {resourceBookings.length}
      </ThemedText>
      <ThemedText numberOfLines={1} style={[styles.inventoryCellText, styles.inventoryMetricColumn]}>
        {resourcePhotos.length}
      </ThemedText>
    </Pressable>
  );
}

function ResourceDetail({
  bookingFilter,
  bookings,
  busyBookingId,
  colors,
  detailTab,
  groups,
  onApprovePhoto,
  onChangeBookingFilter,
  onChangeTab,
  onRejectPhoto,
  onUpdateStatus,
  photos,
  preferredCurrency,
  resource,
  totalBookings,
}: {
  bookingFilter: BookingFilter;
  bookings: ManagedBooking[];
  busyBookingId: string | null;
  colors: DashboardColors;
  detailTab: DetailTab;
  groups: ExploreJoinableTripCard[];
  onApprovePhoto: (photoId: Id<'locationPhotos'>) => void;
  onChangeBookingFilter: (filter: BookingFilter) => void;
  onChangeTab: (tab: DetailTab) => void;
  onRejectPhoto: (photoId: Id<'locationPhotos'>) => void;
  onUpdateStatus: (booking: ManagedBooking, status: 'confirmed' | 'cancelled') => void;
  photos: ManagedLocationPhoto[];
  preferredCurrency: string;
  resource: ManagedResource;
  totalBookings: ManagedBooking[];
}) {
  const title = getResourceTitle(resource);
  const subtitle = getResourceSubtitle(resource);
  const imageUri = getResourceImage(resource);
  const rating = getResourceRating(resource);
  const visitorCount = getResourceVisitorCount(resource, totalBookings);
  const confirmedVisits = totalBookings.filter((booking) => booking.status === 'confirmed');

  return (
    <View style={styles.detailContent}>
      <View style={styles.detailHeader}>
        <ExpoImage source={{ uri: imageUri }} style={styles.detailHeroImage} contentFit="cover" />
        <View style={styles.detailHeroCopy}>
          <View style={styles.detailTitleRow}>
            <View style={styles.detailTitleCopy}>
              <ThemedText style={styles.detailEyebrow}>
                {resource.kind === 'experience' ? getExperienceKindLabel(resource.experience) : 'Room'}
              </ThemedText>
              <ThemedText numberOfLines={2} style={styles.detailTitle}>{title}</ThemedText>
              <ThemedText numberOfLines={2} style={styles.detailSubtitle}>{subtitle}</ThemedText>
            </View>
            <View style={styles.detailStatsRow}>
              <DetailMetric label="Bookings" value={totalBookings.length} />
              <DetailMetric label="Visits" value={confirmedVisits.length || visitorCount} />
              <DetailMetric label="Rating" value={rating} />
              <DetailMetric label="Images" value={photos.length} />
            </View>
          </View>
        </View>
      </View>

      <SegmentedTabs
        options={detailTabs}
        value={detailTab}
        onChange={onChangeTab}
        style={styles.detailTabs}
        contentContainerStyle={styles.detailTabsContent}
        tabStyle={styles.detailTab}
      />

      <ScrollView style={styles.detailScroller} contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
        {detailTab === 'overview' ? (
          <OverviewEditor colors={colors} preferredCurrency={preferredCurrency} resource={resource} totalBookings={totalBookings} />
        ) : detailTab === 'bookings' ? (
          <BookingsTable
            bookingFilter={bookingFilter}
            bookings={bookings}
            busyBookingId={busyBookingId}
            colors={colors}
            onChangeFilter={onChangeBookingFilter}
            onUpdateStatus={onUpdateStatus}
            preferredCurrency={preferredCurrency}
          />
        ) : detailTab === 'visits' ? (
          <VisitsTable bookings={confirmedVisits} colors={colors} groups={groups} resource={resource} />
        ) : detailTab === 'ratings' ? (
          <RatingsPanel bookings={totalBookings} colors={colors} resource={resource} />
        ) : (
          <ImagesPanel colors={colors} onApprove={onApprovePhoto} onReject={onRejectPhoto} photos={photos} resource={resource} />
        )}
      </ScrollView>
    </View>
  );
}

function OverviewEditor({
  colors,
  preferredCurrency,
  resource,
  totalBookings,
}: {
  colors: DashboardColors;
  preferredCurrency: string;
  resource: ManagedResource;
  totalBookings: ManagedBooking[];
}) {
  return resource.kind === 'experience' ? (
    <ExperienceManagerForm colors={colors} preferredCurrency={preferredCurrency} resource={resource} totalBookings={totalBookings} />
  ) : (
    <RoomManagerForm colors={colors} preferredCurrency={preferredCurrency} resource={resource} totalBookings={totalBookings} />
  );
}

function AvailabilityEditor({
  colors,
  resource,
  totalBookings,
}: {
  colors: DashboardColors;
  resource: ManagedResource;
  totalBookings: ManagedBooking[];
}) {
  const availability = getAvailabilitySummary(resource, totalBookings);

  return (
    <SectionBlock colors={colors} title="Availability" subtitle="Live booking state, capacity, and inventory controls.">
      <View style={styles.availabilityGrid}>
        <View
          style={[
            styles.availabilityCard,
            {
              backgroundColor: availability.isFull ? colors.overlay : designSystem.colors.limeSoft,
              borderColor: availability.isFull ? designSystem.colors.copper : designSystem.colors.lime,
            },
          ]}
        >
          <ThemedText style={[styles.availabilityLabel, availability.isFull ? styles.availabilityFull : styles.availabilityOpen]}>
            {availability.label}
          </ThemedText>
          <ThemedText style={styles.availabilityMeta}>{availability.detail}</ThemedText>
        </View>
        <ManagerField colors={colors} label="Confirmed" value={String(availability.confirmedCount)} />
        <ManagerField colors={colors} label="Pending" value={String(availability.pendingCount)} />
        <ManagerField colors={colors} label="Capacity / inventory" value={availability.capacityLabel} />
      </View>
      <View style={styles.formGrid}>
        {resource.kind === 'experience' ? (
          <>
            <ManagerField colors={colors} label="Public availability label" value={resource.experience.booking?.availabilityLabel ?? 'Available'} />
            <ManagerField colors={colors} label="Confirmation mode" value={resource.experience.booking?.confirmMode ?? 'Manual confirmation'} />
            <ManagerField colors={colors} label="Traveler capacity" value="Set capacity or leave open" />
            <ManagerField colors={colors} label="Blackout dates" value="Add unavailable dates" />
          </>
        ) : (
          <>
            <ManagerField colors={colors} label="Max rooms" value={String(resource.room.room.maxRooms)} />
            <ManagerField colors={colors} label="Max adults" value={String(resource.room.room.maxAdults)} />
            <ManagerField colors={colors} label="Max children" value={String(resource.room.room.maxChildren)} />
            <ManagerField colors={colors} label="Arrival windows" value={resource.room.stay.bookingProfile?.arrivalOptions.map((option) => option.label).join(', ') ?? ''} />
          </>
        )}
      </View>
    </SectionBlock>
  );
}

function AvailabilityTable({
  colors,
  resource,
  totalBookings,
}: {
  colors: DashboardColors;
  resource: ManagedResource;
  totalBookings: ManagedBooking[];
}) {
  const availability = getAvailabilitySummary(resource, totalBookings);
  const rows =
    resource.kind === 'experience'
      ? [
          { label: 'availability.status', value: availability.label },
          { label: 'availability.confirmed', value: String(availability.confirmedCount) },
          { label: 'availability.pending', value: String(availability.pendingCount) },
          { label: 'availability.capacity', value: availability.capacityLabel },
          { label: 'booking.availabilityLabel', value: resource.experience.booking?.availabilityLabel ?? '' },
          { label: 'booking.confirmMode', value: resource.experience.booking?.confirmMode ?? '' },
        ]
      : [
          { label: 'availability.status', value: availability.label },
          { label: 'availability.confirmed', value: String(availability.confirmedCount) },
          { label: 'availability.pending', value: String(availability.pendingCount) },
          { label: 'room.maxRooms', value: String(resource.room.room.maxRooms) },
          { label: 'room.maxAdults', value: String(resource.room.room.maxAdults) },
          { label: 'room.maxChildren', value: String(resource.room.room.maxChildren) },
        ];

  return <SchemaRowsTable colors={colors} rows={rows} title="Availability" />;
}

function ExperienceManagerForm({
  colors,
  preferredCurrency,
  resource,
  totalBookings,
}: {
  colors: DashboardColors;
  preferredCurrency: string;
  resource: Extract<ManagedResource, { kind: 'experience' }>;
  totalBookings: ManagedBooking[];
}) {
  const experience = resource.experience;
  const priceUsd = parsePriceAmount(experience.price);
  const travelerPrice = formatUsdConversionParts(priceUsd, preferredCurrency);

  return (
    <View style={styles.editorStack}>
      <FriendlySection title="Availability">
        <FriendlyCapacityField colors={colors} initialLabel={experience.groupSizeLabel ?? ''} label="Capacity" />
        <FriendlySelect colors={colors} label="Public label" options={PUBLIC_AVAILABILITY_OPTIONS} value={experience.booking?.availabilityLabel ?? ''} />
        <FriendlySelect colors={colors} label="Confirmation" options={getSchemaOptions('booking.confirmMode')} value={experience.booking?.confirmMode ?? ''} />
      </FriendlySection>

      <FriendlySection title="Listing">
        <FriendlySelect colors={colors} label="Type" options={EXPERIENCE_KIND_OPTIONS} value={getExperienceKindSelectValue(experience)} />
        <FriendlyField colors={colors} label="Title" value={experience.title} />
        <FriendlyField colors={colors} label="Subtitle" value={experience.subtitle} />
        <FriendlyField colors={colors} label="Description" multiline value={experience.description} />
        <FriendlySelect colors={colors} label="Category" options={EXPERIENCE_CATEGORY_OPTIONS} value={experience.category ?? ''} />
        <FriendlySelect colors={colors} label="Duration" options={EXPERIENCE_DURATION_OPTIONS} value={experience.durationLabel ?? ''} />
        <FriendlyCapacityField colors={colors} initialLabel={experience.groupSizeLabel ?? ''} label="Group size" />
      </FriendlySection>

      <FriendlySection title="Location">
        <FriendlyDerivedLocation
          colors={colors}
          coordinate={joinList(experience.coordinate)}
          label={experience.locationLabel ?? experience.countryLabel ?? 'No location selected'}
          meta={[experience.geography?.town, experience.geography?.region, experience.countryLabel].filter(Boolean).join(', ')}
        />
      </FriendlySection>

      <FriendlySection title="Pricing">
        <FriendlyUsdPriceField colors={colors} label="USD price" preferredCurrency={preferredCurrency} value={priceUsd} />
        <FriendlyDerivedValue colors={colors} label="Traveler price" rateLabel={travelerPrice.rateLabel} value={travelerPrice.amountLabel} />
      </FriendlySection>

      <FriendlySection title="Includes">
        <FriendlyListEditor colors={colors} items={experience.includes} />
      </FriendlySection>

      <FriendlySection title="Trip fit">
        <TripFitEditor colors={colors} items={experience.tripFit ?? []} />
      </FriendlySection>
    </View>
  );
}

function RoomManagerForm({
  colors,
  preferredCurrency,
  resource,
  totalBookings,
}: {
  colors: DashboardColors;
  preferredCurrency: string;
  resource: Extract<ManagedResource, { kind: 'room' }>;
  totalBookings: ManagedBooking[];
}) {
  const { stay } = resource.room;
  const travelerPrice = formatUsdConversionParts(stay.pricePerNight, preferredCurrency);

  return (
    <View style={styles.editorStack}>
      <FriendlySection title="Property">
        <FriendlyField colors={colors} label="Name" value={stay.name} />
        <FriendlyField colors={colors} inputMode="phone" label="Booking phone" value={stay.bookingPhone ?? ''} />
        <FriendlyField colors={colors} label="Summary" multiline value={stay.summary} />
      </FriendlySection>

      <FriendlySection title="Location">
        <FriendlyDerivedLocation
          colors={colors}
          coordinate={joinList(stay.coordinate)}
          label={stay.locationLabel}
          meta={[stay.town, stay.region, stay.countryLabel].filter(Boolean).join(', ')}
        />
      </FriendlySection>

      <FriendlySection title="Pricing and policy">
        <FriendlyUsdPriceField colors={colors} label="USD nightly price" preferredCurrency={preferredCurrency} value={stay.pricePerNight} />
        <FriendlyDerivedValue colors={colors} label="Traveler price" rateLabel={travelerPrice.rateLabel} value={travelerPrice.amountLabel} />
        <FriendlyField colors={colors} label="Booking note" multiline value={stay.bookingNote} />
      </FriendlySection>

      <FriendlySection title="Positioning">
        <FriendlySelect colors={colors} label="Stay style" options={getSchemaOptions('stay.stayStyle')} value={stay.stayStyle} />
        <FriendlySelect colors={colors} label="Route vibe" options={getSchemaOptions('stay.routeVibe')} value={stay.routeVibe} />
      </FriendlySection>

      <FriendlySection title="Amenities and highlights">
        <FriendlyListEditor colors={colors} items={stay.idealFor} title="Ideal for" />
        <FriendlyListEditor colors={colors} items={stay.amenities} title="Amenities" />
        <FriendlyListEditor colors={colors} items={stay.nearbyHighlights} title="Nearby highlights" />
      </FriendlySection>

    </View>
  );
}

function PricingEditor({ colors, preferredCurrency, resource }: { colors: DashboardColors; preferredCurrency: string; resource: ManagedResource }) {
  if (resource.kind === 'experience') {
    const priceUsd = parsePriceAmount(resource.experience.price);

    return (
      <SectionBlock colors={colors} title="Pricing">
        <View style={styles.formGrid}>
          <ManagerField colors={colors} label="USD price" value={String(priceUsd)} />
          <ManagerField colors={colors} label="Traveler price" value={formatUsdConversion(priceUsd, preferredCurrency)} />
        </View>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock colors={colors} title="Pricing">
      <View style={styles.formGrid}>
        <ManagerField colors={colors} label="USD nightly price" value={String(resource.room.stay.pricePerNight)} />
        <ManagerField colors={colors} label="Traveler price" value={formatUsdConversion(resource.room.stay.pricePerNight, preferredCurrency)} />
        <ManagerTextArea colors={colors} label="Booking note" value={resource.room.stay.bookingNote} />
        <ManagerField colors={colors} label="Default room option" value={resource.room.stay.bookingProfile?.defaultRoomOptionId ?? resource.room.room.id} />
        <ManagerField colors={colors} label="Default arrival option" value={resource.room.stay.bookingProfile?.defaultArrivalOptionId ?? ''} />
        <ManagerField colors={colors} label="Deposit / cancellation" value="Add policy" />
      </View>
    </SectionBlock>
  );
}

function RoomOptionsEditor({ colors, options }: { colors: DashboardColors; options: readonly StayRoomOption[] }) {
  const [draftOptions, setDraftOptions] = useState(() => [...options]);

  useEffect(() => {
    setDraftOptions([...options]);
  }, [options]);

  return (
    <View style={[styles.optionTable, { borderColor: colors.borderSoft }]}>
      <View style={[styles.optionHeader, { borderColor: colors.borderSoft }]}>
        <ThemedText style={[styles.optionHeaderText, styles.optionNameColumn]}>Room</ThemedText>
        <ThemedText style={[styles.optionHeaderText, styles.optionSmallColumn]}>Adults</ThemedText>
        <ThemedText style={[styles.optionHeaderText, styles.optionSmallColumn]}>Children</ThemedText>
        <ThemedText style={[styles.optionHeaderText, styles.optionSmallColumn]}>Rooms</ThemedText>
        <View style={styles.optionActionColumn} />
      </View>
      {draftOptions.map((option) => (
        <View key={option.id} style={[styles.optionRow, { borderColor: colors.borderSoft }]}>
          <View style={styles.optionNameColumn}>
            <TextInput defaultValue={option.label} placeholder="Room name" placeholderTextColor={colors.placeholder} style={[styles.optionInput, { color: colors.text }]} />
            <TextInput
              defaultValue={option.detail}
              multiline
              placeholder="Room detail"
              placeholderTextColor={colors.placeholder}
              style={[styles.optionInput, styles.optionDetailInput, { color: colors.text }]}
            />
            <TextInput
              defaultValue={option.bedOptions.map((bed) => bed.label).join(', ')}
              placeholder="Bed options"
              placeholderTextColor={colors.placeholder}
              style={[styles.optionMetaInput, { color: colors.text }]}
            />
          </View>
          <CompactNumberInput colors={colors} value={option.maxAdults} />
          <CompactNumberInput colors={colors} value={option.maxChildren} />
          <CompactNumberInput colors={colors} value={option.maxRooms} />
          <Pressable
            accessibilityLabel="Remove room option"
            accessibilityRole="button"
            onPress={() => setDraftOptions((currentOptions) => currentOptions.filter((currentOption) => currentOption.id !== option.id))}
            style={styles.rowRemoveButton}
          >
            <X color={designSystem.colors.mutedText} size={15} weight="bold" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function CompactNumberInput({ colors, value }: { colors: DashboardColors; value: number }) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <View style={[styles.optionSmallColumn, styles.compactStepperCell]}>
      <Pressable accessibilityRole="button" onPress={() => setDraftValue((currentValue) => Math.max(0, currentValue - 1))} style={styles.compactStepperButton}>
        <ThemedText style={styles.compactStepperText}>-</ThemedText>
      </Pressable>
      <TextInput
        keyboardType="number-pad"
        onChangeText={(nextValue) => setDraftValue(Math.max(0, Number.parseInt(nextValue, 10) || 0))}
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        style={[styles.compactStepperInput, { color: colors.text }]}
        value={String(draftValue)}
      />
      <Pressable accessibilityRole="button" onPress={() => setDraftValue((currentValue) => currentValue + 1)} style={styles.compactStepperButton}>
        <ThemedText style={styles.compactStepperText}>+</ThemedText>
      </Pressable>
    </View>
  );
}

function ArrivalOptionsEditor({ colors, options }: { colors: DashboardColors; options: readonly { id: string; label: string }[] }) {
  const [draftOptions, setDraftOptions] = useState(() => [...options]);

  useEffect(() => {
    setDraftOptions([...options]);
  }, [options]);

  return (
    <View style={[styles.optionTable, { borderColor: colors.borderSoft }]}>
      <View style={[styles.optionHeader, { borderColor: colors.borderSoft }]}>
        <ThemedText style={[styles.optionHeaderText, styles.optionSmallColumn]}>ID</ThemedText>
        <ThemedText style={[styles.optionHeaderText, styles.optionNameColumn]}>Arrival window</ThemedText>
        <View style={styles.optionActionColumn} />
      </View>
      {draftOptions.map((option) => (
        <View key={option.id} style={[styles.optionRow, styles.compactOptionRow, { borderColor: colors.borderSoft }]}>
          <TextInput defaultValue={option.id} placeholder="id" placeholderTextColor={colors.placeholder} style={[styles.optionInput, styles.optionSmallColumn, { color: colors.text }]} />
          <TextInput defaultValue={option.label} placeholder="Arrival label" placeholderTextColor={colors.placeholder} style={[styles.optionInput, styles.optionNameColumn, { color: colors.text }]} />
          <Pressable
            accessibilityLabel="Remove arrival window"
            accessibilityRole="button"
            onPress={() => setDraftOptions((currentOptions) => currentOptions.filter((currentOption) => currentOption.id !== option.id))}
            style={styles.rowRemoveButton}
          >
            <X color={designSystem.colors.mutedText} size={15} weight="bold" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function FriendlySection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.friendlySection}>
      <ThemedText style={styles.friendlySectionTitle}>{title}</ThemedText>
      <View style={styles.friendlyTable}>{children}</View>
    </View>
  );
}

function FriendlyField({
  colors,
  inputMode = 'text',
  label,
  multiline = false,
  value,
}: {
  colors: DashboardColors;
  inputMode?: 'text' | 'number' | 'phone';
  label: string;
  multiline?: boolean;
  value: string;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const placeholder = getFriendlyPlaceholder(label, inputMode, multiline);

  return (
    <View style={[styles.friendlyRow, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.friendlyLabel}>{label}</ThemedText>
      <TextInput
        keyboardType={inputMode === 'number' ? 'decimal-pad' : inputMode === 'phone' ? 'phone-pad' : 'default'}
        multiline={multiline}
        onChangeText={setDraftValue}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={[styles.friendlyInput, multiline && styles.friendlyInputMultiline, { color: colors.text }]}
        value={draftValue}
      />
    </View>
  );
}

function FriendlyDerivedValue({ colors, label, rateLabel, value }: { colors: DashboardColors; label: string; rateLabel?: string; value: string }) {
  return (
    <View style={[styles.friendlyRow, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.friendlyLabel}>{label}</ThemedText>
      <View style={styles.derivedValueStack}>
        <ThemedText style={styles.derivedValueText}>{value || 'Derived when value is set'}</ThemedText>
        {rateLabel ? <ThemedText style={styles.derivedRateText}>{rateLabel}</ThemedText> : null}
      </View>
    </View>
  );
}

function FriendlyNumberField({
  colors,
  label,
  max = 99,
  min = 0,
  suffix,
  value,
}: {
  colors: DashboardColors;
  label: string;
  max?: number;
  min?: number;
  suffix?: string;
  value: number;
}) {
  const [draftValue, setDraftValue] = useState(Number.isFinite(value) ? value : min);

  useEffect(() => {
    setDraftValue(Number.isFinite(value) ? value : min);
  }, [min, value]);

  const updateValue = (nextValue: number) => {
    setDraftValue(Math.min(max, Math.max(min, nextValue)));
  };

  return (
    <View style={[styles.friendlyRow, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.friendlyLabel}>{label}</ThemedText>
      <View style={styles.stepperCell}>
        <Pressable accessibilityRole="button" onPress={() => updateValue(draftValue - 1)} style={styles.stepperButton}>
          <ThemedText style={styles.stepperButtonText}>-</ThemedText>
        </Pressable>
        <TextInput
          keyboardType="number-pad"
          onChangeText={(nextValue) => updateValue(Number.parseInt(nextValue, 10) || min)}
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          style={[styles.stepperInput, { color: colors.text }]}
          value={String(draftValue)}
        />
        <Pressable accessibilityRole="button" onPress={() => updateValue(draftValue + 1)} style={styles.stepperButton}>
          <ThemedText style={styles.stepperButtonText}>+</ThemedText>
        </Pressable>
        {suffix ? <ThemedText style={styles.stepperSuffix}>{suffix}</ThemedText> : null}
      </View>
    </View>
  );
}

function FriendlyUsdPriceField({
  colors,
  label,
  preferredCurrency,
  value,
}: {
  colors: DashboardColors;
  label: string;
  preferredCurrency: string;
  value: number;
}) {
  const [draftValue, setDraftValue] = useState(Number.isFinite(value) ? String(value) : '');

  useEffect(() => {
    setDraftValue(Number.isFinite(value) ? String(value) : '');
  }, [value]);

  return (
    <View style={[styles.friendlyRow, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.friendlyLabel}>{label}</ThemedText>
      <View style={styles.priceCell}>
        <ThemedText style={styles.currencyPrefix}>USD</ThemedText>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setDraftValue}
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          style={[styles.friendlyInput, styles.priceInput, { color: colors.text }]}
          value={draftValue}
        />
        <DraftPricePreview currencyCode={preferredCurrency} value={draftValue} />
      </View>
    </View>
  );
}

function DraftPricePreview({ currencyCode, value }: { currencyCode: string; value: string }) {
  const price = formatDraftUsdPrice(value, currencyCode);

  return (
    <View style={styles.derivedValueStack}>
      <ThemedText style={styles.derivedValueText}>{price.amountLabel}</ThemedText>
      {price.rateLabel ? <ThemedText style={styles.derivedRateText}>{price.rateLabel}</ThemedText> : null}
    </View>
  );
}

function FriendlyCapacityField({
  colors,
  initialLabel,
  label,
}: {
  colors: DashboardColors;
  initialLabel: string;
  label: string;
}) {
  const [capacity, setCapacity] = useState(parseCapacityFromLabel(initialLabel));

  useEffect(() => {
    setCapacity(parseCapacityFromLabel(initialLabel));
  }, [initialLabel]);

  return (
    <View style={[styles.friendlyRow, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.friendlyLabel}>{label}</ThemedText>
      <View style={styles.capacityCell}>
        <View style={styles.stepperCell}>
          <Pressable accessibilityRole="button" onPress={() => setCapacity((currentValue) => Math.max(0, currentValue - 1))} style={styles.stepperButton}>
            <ThemedText style={styles.stepperButtonText}>-</ThemedText>
          </Pressable>
          <TextInput
            keyboardType="number-pad"
            onChangeText={(nextValue) => setCapacity(Math.max(0, Number.parseInt(nextValue, 10) || 0))}
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            style={[styles.stepperInput, { color: colors.text }]}
            value={String(capacity)}
          />
          <Pressable accessibilityRole="button" onPress={() => setCapacity((currentValue) => currentValue + 1)} style={styles.stepperButton}>
            <ThemedText style={styles.stepperButtonText}>+</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function FriendlySelect({
  colors,
  label,
  options,
  value,
}: {
  colors: DashboardColors;
  label: string;
  options: readonly string[];
  value: string;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <View style={[styles.friendlyRow, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.friendlyLabel}>{label}</ThemedText>
      <View style={styles.selectCell}>
        {options.map((option) => {
          const active = draftValue === option;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option || 'empty'}
              onPress={() => setDraftValue(option)}
              style={[styles.selectPill, active && styles.selectPillActive]}
            >
              <ThemedText style={[styles.selectPillText, active && styles.selectPillTextActive]}>{option || 'Not set'}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FriendlyListEditor({
  colors,
  items,
  title,
}: {
  colors: DashboardColors;
  items: readonly string[];
  title?: string;
}) {
  const [draftValue, setDraftValue] = useState(() => items.join(', '));

  useEffect(() => {
    setDraftValue(items.join(', '));
  }, [items]);

  const parsedItems = draftValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const label = title ?? 'List';

  return (
    <View style={styles.friendlyListBlock}>
      {title ? <ThemedText style={styles.friendlySubsectionTitle}>{title}</ThemedText> : null}
      <View style={[styles.friendlyRow, { borderColor: colors.borderSoft }]}>
        <ThemedText style={styles.friendlyLabel}>{label}</ThemedText>
        <TextInput
          multiline
          onChangeText={setDraftValue}
          placeholder={`Enter ${label.toLowerCase()} separated by commas`}
          placeholderTextColor={colors.placeholder}
          style={[styles.friendlyInput, styles.friendlyInputMultiline, { color: colors.text }]}
          value={draftValue}
        />
      </View>
      {parsedItems.length ? (
        <View style={styles.commaPreviewWrap}>
          {parsedItems.map((item) => (
            <View key={`${label}-${item}`} style={styles.commaPreviewChip}>
              <ThemedText style={styles.commaPreviewText}>{item}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TripFitEditor({
  colors,
  items,
}: {
  colors: DashboardColors;
  items: NonNullable<ExploreExperience['tripFit']>;
}) {
  const [draftItems, setDraftItems] = useState(() => (items.length ? [...items] : [{ label: '', value: '', detail: '', icon: 'compass' as const }]));

  useEffect(() => {
    setDraftItems(items.length ? [...items] : [{ label: '', value: '', detail: '', icon: 'compass' as const }]);
  }, [items]);

  return (
    <View style={styles.tripFitList}>
      <View style={styles.tripFitTableHeader}>
        <ThemedText style={[styles.tableHeaderText, styles.tripFitLabelColumn]}>Label</ThemedText>
        <ThemedText style={[styles.tableHeaderText, styles.tripFitValueColumn]}>Value</ThemedText>
        <ThemedText style={[styles.tableHeaderText, styles.tripFitDetailColumn]}>Detail</ThemedText>
        <View style={styles.optionActionColumn} />
      </View>
      {draftItems.map((item, index) => (
        <View key={`${item.label}-${index}`} style={[styles.tripFitRow, { borderColor: colors.borderSoft }]}>
          <TextInput
            defaultValue={item.label}
            placeholder="Enter label"
            placeholderTextColor={colors.placeholder}
            style={[styles.optionInput, styles.tripFitLabelColumn, { color: colors.text }]}
          />
          <TextInput
            defaultValue={item.value}
            placeholder="Enter value"
            placeholderTextColor={colors.placeholder}
            style={[styles.optionInput, styles.tripFitValueColumn, { color: colors.text }]}
          />
          <View style={styles.tripFitDetailColumn}>
            <TextInput
              defaultValue={item.detail}
              placeholder="Enter detail"
              placeholderTextColor={colors.placeholder}
              style={[styles.optionInput, styles.tripFitDetailInput, { color: colors.text }]}
              multiline
            />
          </View>
          <Pressable
            accessibilityLabel="Remove trip fit row"
            accessibilityRole="button"
            onPress={() => setDraftItems((currentItems) => currentItems.filter((_, itemIndex) => itemIndex !== index))}
            style={styles.rowRemoveButton}
          >
            <X color={designSystem.colors.mutedText} size={15} weight="bold" />
          </Pressable>
        </View>
      ))}
      <Pressable accessibilityRole="button" onPress={() => setDraftItems((currentItems) => [...currentItems, { label: '', value: '', detail: '', icon: 'compass' }])} style={styles.inlineAddButton}>
        <Plus color={designSystem.colors.darkGreen} size={14} weight="bold" />
        <ThemedText style={styles.inlineAddText}>Add trip fit row</ThemedText>
      </Pressable>
    </View>
  );
}

function FriendlyImageField({
  colors,
  label,
  multiple = false,
  value,
}: {
  colors: DashboardColors;
  label: string;
  multiple?: boolean;
  value: string;
}) {
  return (
    <View style={[styles.friendlyRow, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.friendlyLabel}>{label}</ThemedText>
      <SchemaCellEditor colors={colors} row={{ editor: multiple ? 'images' : 'image', label, value }} />
    </View>
  );
}

function FriendlyDerivedLocation({
  colors,
  coordinate,
  label,
  meta,
}: {
  colors: DashboardColors;
  coordinate: string;
  label: string;
  meta: string;
}) {
  return (
    <View style={[styles.friendlyRow, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.friendlyLabel}>Mapbox location</ThemedText>
      <View style={styles.derivedLocationCell}>
        <ThemedText style={styles.derivedLocationTitle}>{label}</ThemedText>
        {meta ? <ThemedText style={styles.derivedLocationMeta}>{meta}</ThemedText> : null}
        {coordinate ? <ThemedText style={styles.derivedLocationMeta}>{coordinate}</ThemedText> : null}
        <SchemaCellEditor colors={colors} row={{ editor: 'coordinate', label: 'mapLocation', value: coordinate }} />
      </View>
    </View>
  );
}

function SectionBlock({
  children,
  colors,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  colors: DashboardColors;
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={[styles.sectionBlock, { borderColor: colors.borderSoft }]}>
      <View style={styles.sectionBlockHeader}>
        <ThemedText style={styles.sectionBlockTitle}>{title}</ThemedText>
        {subtitle ? <ThemedText style={styles.sectionBlockSubtitle}>{subtitle}</ThemedText> : null}
      </View>
      {children}
    </View>
  );
}

function BookingsTable({
  bookingFilter,
  bookings,
  busyBookingId,
  colors,
  onChangeFilter,
  onUpdateStatus,
  preferredCurrency,
}: {
  bookingFilter: BookingFilter;
  bookings: ManagedBooking[];
  busyBookingId: string | null;
  colors: DashboardColors;
  onChangeFilter: (filter: BookingFilter) => void;
  onUpdateStatus: (booking: ManagedBooking, status: 'confirmed' | 'cancelled') => void;
  preferredCurrency: string;
}) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.filterRow}>
        <SegmentedTabs
          options={bookingFilters}
          value={bookingFilter}
          onChange={onChangeFilter}
          contentContainerStyle={styles.bookingFilterContent}
          tabStyle={styles.bookingFilterTab}
        />
      </View>
      <View style={[styles.table, { borderColor: colors.borderSoft }]}>
        <View style={[styles.tableHeader, { borderColor: colors.borderSoft }]}>
          <ThemedText style={[styles.tableHeaderText, styles.guestColumn]}>Guest</ThemedText>
          <ThemedText style={[styles.tableHeaderText, styles.bookingColumn]}>Booking</ThemedText>
          <ThemedText style={[styles.tableHeaderText, styles.statusColumn]}>Status</ThemedText>
          <ThemedText style={[styles.tableHeaderText, styles.actionColumn]}>Actions</ThemedText>
        </View>
        {bookings.length === 0 ? (
          <EmptyTableRow label="No bookings in this view." />
        ) : (
          bookings.map((booking) => (
            <BookingRow
              booking={booking}
              busy={busyBookingId === booking._id}
              colors={colors}
              key={`${booking.source}-${booking._id}`}
              onUpdateStatus={onUpdateStatus}
              preferredCurrency={preferredCurrency}
            />
          ))
        )}
      </View>
    </View>
  );
}

function BookingRow({
  booking,
  busy,
  colors,
  onUpdateStatus,
  preferredCurrency,
}: {
  booking: ManagedBooking;
  busy: boolean;
  colors: DashboardColors;
  onUpdateStatus: (booking: ManagedBooking, status: 'confirmed' | 'cancelled') => void;
  preferredCurrency: string;
}) {
  const dateLabel = getManagedBookingDateLabel(booking);
  const moneyLabel = typeof booking.totalPrice === 'number' ? formatUsdConversion(booking.totalPrice, preferredCurrency) : null;

  return (
    <View style={[styles.tableRow, { borderColor: colors.borderSoft }]}>
      <View style={[styles.guestColumn, styles.identityCell]}>
        {booking.imageUri ? (
          <ExpoImage source={{ uri: booking.imageUri }} style={styles.rowImage} contentFit="cover" />
        ) : (
          <View style={[styles.rowImage, { backgroundColor: colors.surface }]} />
        )}
        <View style={styles.cellCopy}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>{booking.travelerSlug}</ThemedText>
          <ThemedText numberOfLines={1} style={styles.rowMeta}>{booking.kind === 'stay' ? 'Room guest' : 'Experience guest'}</ThemedText>
        </View>
      </View>
      <View style={styles.bookingColumn}>
        <ThemedText numberOfLines={1} style={styles.rowTitle}>{booking.title}</ThemedText>
        <ThemedText numberOfLines={2} style={styles.rowMeta}>
          {[dateLabel, booking.detailLabel ?? booking.subtitle, moneyLabel].filter(Boolean).join(' · ')}
        </ThemedText>
        {booking.stayBookingDetails?.specialRequest ? (
          <ThemedText numberOfLines={1} style={styles.specialRequest}>{booking.stayBookingDetails.specialRequest}</ThemedText>
        ) : null}
      </View>
      <ThemedText numberOfLines={1} style={[styles.statusText, styles.statusColumn, getStatusStyle(booking.status)]}>
        {booking.status}
      </ThemedText>
      <View style={[styles.actionColumn, styles.actionCell]}>
        {booking.status === 'pending' ? (
          <>
            <ActionButton disabled={busy} label="Approve" tone="approve" onPress={() => onUpdateStatus(booking, 'confirmed')} />
            <ActionButton disabled={busy} label="Cancel" tone="cancel" onPress={() => onUpdateStatus(booking, 'cancelled')} />
          </>
        ) : booking.status === 'confirmed' ? (
          <ActionButton disabled={busy} label="Cancel" tone="cancel" onPress={() => onUpdateStatus(booking, 'cancelled')} />
        ) : (
          <ThemedText style={styles.noActionText}>Closed</ThemedText>
        )}
      </View>
    </View>
  );
}

function VisitsTable({
  bookings,
  colors,
  groups,
  resource,
}: {
  bookings: ManagedBooking[];
  colors: DashboardColors;
  groups: ExploreJoinableTripCard[];
  resource: ManagedResource;
}) {
  const resourceGroups =
    resource.kind === 'experience'
      ? groups.filter((group) => group.experienceSlug === resource.experience.slug)
      : [];

  return (
    <View style={styles.sectionStack}>
      <View style={[styles.table, { borderColor: colors.borderSoft }]}>
        <View style={[styles.tableHeader, { borderColor: colors.borderSoft }]}>
          <ThemedText style={[styles.tableHeaderText, styles.guestColumn]}>Visitor</ThemedText>
          <ThemedText style={[styles.tableHeaderText, styles.visitDetailColumn]}>Visit</ThemedText>
        </View>
        {bookings.length === 0 ? (
          <EmptyTableRow label="No confirmed visits yet." />
        ) : (
          bookings.map((booking) => (
            <View key={`${booking.source}-${booking._id}`} style={[styles.tableRow, { borderColor: colors.borderSoft }]}>
              <View style={[styles.guestColumn, styles.cellCopy]}>
                <ThemedText numberOfLines={1} style={styles.rowTitle}>{booking.travelerSlug}</ThemedText>
                <ThemedText numberOfLines={1} style={styles.rowMeta}>{booking.statusLabel}</ThemedText>
              </View>
              <ThemedText numberOfLines={2} style={[styles.rowMeta, styles.visitDetailColumn]}>
                {[getManagedBookingDateLabel(booking), booking.detailLabel ?? booking.subtitle].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
          ))
        )}
      </View>
      {resourceGroups.length ? (
        <View style={[styles.table, { borderColor: colors.borderSoft }]}>
          <View style={[styles.tableHeader, { borderColor: colors.borderSoft }]}>
            <ThemedText style={[styles.tableHeaderText, styles.guestColumn]}>Group</ThemedText>
            <ThemedText style={[styles.tableHeaderText, styles.bookingColumn]}>Travelers</ThemedText>
            <ThemedText style={[styles.tableHeaderText, styles.statusColumn]}>Trip</ThemedText>
          </View>
          {resourceGroups.map((group) => (
            <View key={group.circleId} style={[styles.tableRow, { borderColor: colors.borderSoft }]}>
              <ThemedText numberOfLines={1} style={[styles.rowTitle, styles.guestColumn]}>{group.groupName}</ThemedText>
              <ThemedText numberOfLines={1} style={[styles.rowMeta, styles.bookingColumn]}>{group.memberCount} travelers · {group.destinationLabel}</ThemedText>
              <ThemedText numberOfLines={1} style={[styles.rowValue, styles.statusColumn]}>{group.tripName}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RatingsPanel({
  bookings,
  colors,
  resource,
}: {
  bookings: ManagedBooking[];
  colors: DashboardColors;
  resource: ManagedResource;
}) {
  const rating = getResourceRating(resource);
  const reviewCount = resource.kind === 'room' ? resource.room.stay.reviewCount : bookings.filter((booking) => booking.status === 'confirmed').length;

  return (
    <View style={styles.sectionStack}>
      <View style={[styles.ratingSummary, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
        <Star color={designSystem.colors.darkGreen} size={24} weight="fill" />
        <View>
          <ThemedText style={styles.ratingValue}>{rating}</ThemedText>
          <ThemedText style={styles.ratingMeta}>{reviewCount} ratings and visit signals</ThemedText>
        </View>
      </View>
      <View style={[styles.table, { borderColor: colors.borderSoft }]}>
        <View style={[styles.tableHeader, { borderColor: colors.borderSoft }]}>
          <ThemedText style={[styles.tableHeaderText, styles.guestColumn]}>Signal</ThemedText>
          <ThemedText style={[styles.tableHeaderText, styles.bookingColumn]}>Detail</ThemedText>
          <ThemedText style={[styles.tableHeaderText, styles.statusColumn]}>Score</ThemedText>
        </View>
        {buildRatingSignals(resource, bookings).map((signal) => (
          <View key={signal.label} style={[styles.tableRow, { borderColor: colors.borderSoft }]}>
            <ThemedText style={[styles.rowTitle, styles.guestColumn]}>{signal.label}</ThemedText>
            <ThemedText style={[styles.rowMeta, styles.bookingColumn]}>{signal.detail}</ThemedText>
            <ThemedText style={[styles.rowValue, styles.statusColumn]}>{signal.value}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function ImagesPanel({
  colors,
  onApprove,
  onReject,
  photos,
  resource,
}: {
  colors: DashboardColors;
  onApprove: (photoId: Id<'locationPhotos'>) => void;
  onReject: (photoId: Id<'locationPhotos'>) => void;
  photos: ManagedLocationPhoto[];
  resource: ManagedResource;
}) {
  const baseImages = getResourceGallery(resource);

  return (
    <View style={styles.sectionStack}>
      <View style={styles.imageGrid}>
        {baseImages.map((imageUri) => (
          <ExpoImage key={imageUri} source={{ uri: imageUri }} style={styles.galleryImage} contentFit="cover" />
        ))}
      </View>
      <View style={[styles.table, { borderColor: colors.borderSoft }]}>
        <View style={[styles.tableHeader, { borderColor: colors.borderSoft }]}>
          <ThemedText style={[styles.tableHeaderText, styles.guestColumn]}>Upload</ThemedText>
          <ThemedText style={[styles.tableHeaderText, styles.bookingColumn]}>Caption</ThemedText>
          <ThemedText style={[styles.tableHeaderText, styles.actionColumn]}>Review</ThemedText>
        </View>
        {photos.length === 0 ? (
          <EmptyTableRow label="No user images for this item yet." />
        ) : (
          photos.map((photo) => (
            <View key={photo.id} style={[styles.tableRow, { borderColor: colors.borderSoft }]}>
              <View style={[styles.guestColumn, styles.identityCell]}>
                <ExpoImage source={{ uri: photo.imageUri }} style={styles.rowImage} contentFit="cover" />
                <View style={styles.cellCopy}>
                  <ThemedText numberOfLines={1} style={styles.rowTitle}>{photo.source}</ThemedText>
                  <ThemedText numberOfLines={1} style={styles.rowMeta}>{photo.travelerSlug}</ThemedText>
                </View>
              </View>
              <ThemedText numberOfLines={2} style={[styles.rowMeta, styles.bookingColumn]}>{photo.caption ?? 'No caption'}</ThemedText>
              <View style={[styles.actionColumn, styles.iconActions]}>
                <Pressable accessibilityLabel="Approve image" onPress={() => onApprove(photo.id)} style={[styles.iconAction, { backgroundColor: designSystem.colors.lime }]}>
                  <Check color={designSystem.colors.darkGreen} size={16} weight="bold" />
                </Pressable>
                <Pressable accessibilityLabel="Reject image" onPress={() => onReject(photo.id)} style={[styles.iconAction, { backgroundColor: colors.overlay }]}>
                  <X color={colors.textMuted} size={16} weight="bold" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function SchemaRowsTable({
  colors,
  rows,
  title,
}: {
  colors: DashboardColors;
  rows: SchemaRow[];
  title: string;
}) {
  return (
    <View style={styles.sectionStack}>
      <SectionBlock colors={colors} title={title}>
        <View style={[styles.table, { borderColor: colors.borderSoft }]}>
          {rows.map((row) => (
            <View key={row.label} style={[styles.dataRow, { borderColor: colors.borderSoft }]}>
              <ThemedText style={styles.dataLabel}>{row.label}</ThemedText>
              <SchemaCellEditor colors={colors} row={row} />
            </View>
          ))}
        </View>
      </SectionBlock>
    </View>
  );
}

function SchemaCellEditor({
  colors,
  onChange,
  row,
}: {
  colors: DashboardColors;
  onChange?: (value: string) => void;
  row: SchemaRow;
}) {
  const editor = row.editor ?? getSchemaEditor(row.label, row.multiline);
  const [value, setValue] = useState(row.value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');

  useEffect(() => {
    setValue(row.value);
  }, [row.value]);

  const updateValue = (nextValue: string) => {
    setValue(nextValue);
    onChange?.(nextValue);
  };

  if (editor === 'select') {
    const options = row.options ?? getSchemaOptions(row.label);

    return (
      <View style={styles.selectCell}>
        {options.map((option) => {
          const active = value === option;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option}
              onPress={() => updateValue(option)}
              style={[styles.selectPill, active && styles.selectPillActive]}
            >
              <ThemedText style={[styles.selectPillText, active && styles.selectPillTextActive]}>{option || 'Not set'}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (editor === 'image' || editor === 'images') {
    const images = value.split(',').map((item) => item.trim()).filter(Boolean);
    const removeImage = (uriToRemove: string) => {
      const nextImages = images.filter((uri) => uri !== uriToRemove);
      updateValue(editor === 'image' ? '' : nextImages.join(', '));
    };
    const applyImageLinks = () => {
      const nextLinks = linkDraft.split(',').map((item) => item.trim()).filter(Boolean);
      if (nextLinks.length === 0) {
        return;
      }

      updateValue(editor === 'image' ? nextLinks[0] : [...images, ...nextLinks].join(', '));
      setLinkDraft('');
    };

    return (
      <View style={styles.mediaCell}>
        <View style={styles.mediaPreviewRow}>
          {images.slice(0, 4).map((uri) => (
            <View key={uri} style={styles.schemaImagePreviewWrap}>
              <ExpoImage source={{ uri }} style={styles.schemaImagePreview} contentFit="cover" />
              <Pressable accessibilityLabel="Remove image" accessibilityRole="button" onPress={() => removeImage(uri)} style={styles.removeImageButton}>
                <X color={designSystem.colors.ink} size={12} weight="bold" />
              </Pressable>
            </View>
          ))}
        </View>
        <View style={styles.cellActionRow}>
          <Pressable accessibilityRole="button" onPress={() => pickSchemaImage(editor, value, updateValue)} style={styles.cellActionButton}>
            <ThemedText style={styles.cellActionText}>{editor === 'images' ? 'Add images' : 'Choose cover'}</ThemedText>
          </Pressable>
          <TextInput
            value={linkDraft}
            onChangeText={setLinkDraft}
            placeholder={editor === 'images' ? 'Paste image URLs, separated by commas' : 'Paste image URL'}
            placeholderTextColor={colors.placeholder}
            style={[styles.mediaLinkInput, { color: colors.text }]}
          />
          <Pressable accessibilityRole="button" onPress={applyImageLinks} style={styles.secondaryTinyButton}>
            <ThemedText style={styles.secondaryTinyButtonText}>{editor === 'images' ? 'Add links' : 'Use link'}</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (editor === 'coordinate') {
    return (
      <View style={styles.coordinateCell}>
        <Pressable accessibilityRole="button" onPress={() => setPickerOpen(true)} style={styles.cellActionButton}>
          <ThemedText style={styles.cellActionText}>{value ? 'Change with Mapbox' : 'Choose with Mapbox'}</ThemedText>
        </Pressable>
        <CoordinatePickerModal
          colors={colors}
          initialValue={value}
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(nextValue) => {
            updateValue(nextValue);
            setPickerOpen(false);
          }}
        />
      </View>
    );
  }

  if (editor === 'list' || editor === 'json') {
    return (
      <TextInput
        value={value}
        onChangeText={updateValue}
        multiline
        placeholder={editor === 'json' ? 'JSON value' : 'Comma-separated list'}
        placeholderTextColor={colors.placeholder}
        style={[styles.dataValueInput, styles.dataValueMultiline, { color: colors.text }]}
      />
    );
  }

  return (
      <TextInput
        value={value}
        onChangeText={updateValue}
        keyboardType={getSchemaKeyboardType(row.label, editor)}
        multiline={row.multiline}
      placeholder="Not set"
      placeholderTextColor={colors.placeholder}
      style={[styles.dataValueInput, row.multiline && styles.dataValueMultiline, { color: colors.text }]}
    />
  );
}

function CoordinatePickerModal({
  colors,
  initialValue,
  onClose,
  onSelect,
  visible,
}: {
  colors: DashboardColors;
  initialValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
  visible: boolean;
}) {
  const parsedCoordinate = parseCoordinateValue(initialValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [coordinate, setCoordinate] = useState<readonly [number, number] | null>(parsedCoordinate);
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof fetchMapboxLocationSuggestions>>>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (visible) {
      const nextCoordinate = parseCoordinateValue(initialValue);
      setCoordinate(nextCoordinate);
      setSearchQuery('');
      setSuggestions([]);
      setHasSearched(false);
    }
  }, [initialValue, visible]);

  async function searchPlace() {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    try {
      const results = await fetchMapboxLocationSuggestions({
        currentCoordinate: coordinate ?? DEFAULT_MANAGER_MAP_CENTER,
        query: trimmedQuery,
      });
      setHasSearched(true);
      setSuggestions(results);
    } catch {
      setHasSearched(true);
      // Keep the current pin if search is unavailable.
    }
  }

  function selectSuggestion(index: number) {
    const suggestion = suggestions[index];
    if (!suggestion?.centerCoordinate) {
      return;
    }
    setCoordinate(suggestion.centerCoordinate);
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.coordinateModal, { backgroundColor: colors.background, borderColor: colors.borderSoft }]}>
          <View style={styles.coordinateModalHeader}>
            <View>
              <ThemedText style={styles.sectionBlockTitle}>Pick coordinate</ThemedText>
              <ThemedText style={styles.sectionBlockSubtitle}>Search the exact place, or click the map to drop the pin yourself.</ThemedText>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>Close</ThemedText>
            </Pressable>
          </View>
          <View style={styles.coordinatePickerLayout}>
            <View style={styles.coordinateSearchPane}>
              <View style={styles.coordinateSearchRow}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search exact place or address"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.coordinateSearchInput, { color: colors.text, borderColor: colors.borderSoft }]}
                  returnKeyType="search"
                  onSubmitEditing={searchPlace}
                />
                <Pressable accessibilityRole="button" onPress={searchPlace} style={styles.cellActionButton}>
                  <ThemedText style={styles.cellActionText}>Search</ThemedText>
                </Pressable>
              </View>
              <ScrollView style={styles.mapboxSuggestionList} showsVerticalScrollIndicator={false}>
                {suggestions.length ? (
                  suggestions.map((suggestion, index) => (
                    <Pressable key={suggestion.id} accessibilityRole="button" onPress={() => selectSuggestion(index)} style={styles.mapboxSuggestionRow}>
                      <ThemedText style={styles.rowTitle}>{suggestion.label}</ThemedText>
                      <ThemedText style={styles.rowMeta}>{suggestion.detail}</ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyTableRow}>
                    <ThemedText style={styles.emptyText}>
                      {hasSearched ? 'No Mapbox results. Click the map to place the pin.' : 'Search for a place or click the map to place the pin.'}
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                onPress={() => coordinate ? onSelect(formatCoordinateValue(coordinate)) : undefined}
                style={[styles.saveButton, !coordinate && styles.actionButtonDisabled]}
              >
                <ThemedText style={styles.saveButtonText}>Use selected coordinate</ThemedText>
              </Pressable>
            </View>
            <View style={styles.coordinateMapFrame}>
              <MapPreview
                centerCoordinate={coordinate ?? DEFAULT_MANAGER_MAP_CENTER}
                markers={coordinate ? [{ id: 'selected', coordinate, label: 'Selected point', priceLabel: 'Pin', status: 'active' }] : []}
                onMapPress={(nextCoordinate) => {
                  setCoordinate(nextCoordinate);
                }}
                zoomLevel={coordinate ? 16 : 13}
                style={styles.coordinateMap}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DraftResourceEditor({
  colors,
  draft,
  isCreating,
  onCancel,
  onChange,
  onCreate,
}: {
  colors: DashboardColors;
  draft: DraftResource;
  isCreating: boolean;
  onCancel: () => void;
  onChange: (draft: DraftResource) => void;
  onCreate: () => void;
}) {
  const groupedRows = groupSchemaRows(draft.rows);
  const [importReport, setImportReport] = useState<JsonImportReport | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const promptText = MANAGER_IMPORT_PROMPTS[draft.kind === 'experience' ? 'experiences' : 'rooms'];
  const editorDiagnostics = useMemo(() => analyzeDraftJsonText(pastedJson, draft), [draft, pastedJson]);
  const editorHasErrors = editorDiagnostics.some((diagnostic) => diagnostic.severity === 'error');
  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(8, pastedJson.split('\n').length) }, (_, index) => index + 1),
    [pastedJson]
  );
  const updateRow = (label: string, value: string) => {
    onChange({
      ...draft,
      rows: draft.rows.map((row) => (row.label === label ? { ...row, value } : row)),
    });
  };
  const handleImportJson = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('JSON import needs desktop web', 'Open the manager dashboard on a large web screen to upload a JSON file.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const compiled = compileDraftJson(text, draft);
        onChange(compiled.draft);
        setImportReport({
          fileName: file.name,
          messages: compiled.messages.length ? compiled.messages : ['JSON compiled and populated the form.'],
          status: 'success',
        });
      } catch (error) {
        setImportReport({
          fileName: file.name,
          messages: splitCompilerMessage(error instanceof Error ? error.message : 'Could not compile JSON.'),
          status: 'error',
        });
      }
    };
    input.click();
  };
  const handleCopyPrompt = async () => {
    if (Platform.OS === 'web' && globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(promptText);
      setImportReport({
        fileName: 'schema prompt',
        messages: ['Prompt copied. Paste it into your AI tool, then upload the JSON it returns.'],
        status: 'success',
      });
      return;
    }

    setIsPromptOpen(true);
  };
  const handleCompilePastedJson = () => {
    try {
      const compiled = compileDraftJson(pastedJson, draft);
      onChange(compiled.draft);
      setImportReport({
        fileName: 'pasted JSON',
        messages: compiled.messages.length ? compiled.messages : ['JSON compiled and populated the form.'],
        status: 'success',
      });
      setIsPromptOpen(false);
    } catch (error) {
      setImportReport({
        fileName: 'pasted JSON',
        messages: splitCompilerMessage(error instanceof Error ? error.message : 'Could not compile JSON.'),
        status: 'error',
      });
    }
  };

  return (
    <View style={styles.detailContent}>
      <View style={styles.draftHeader}>
        <View>
          <ThemedText style={styles.detailEyebrow}>New {draft.kind}</ThemedText>
          <ThemedText style={styles.detailTitle}>Add {draft.kind === 'experience' ? 'experience' : 'room'}</ThemedText>
          <ThemedText style={styles.detailSubtitle}>Fill the sections and create when ready.</ThemedText>
        </View>
        <View style={styles.draftHeaderActions}>
          <Pressable accessibilityRole="button" onPress={() => setIsPromptOpen(true)} style={styles.secondaryButton}>
            <ThemedText style={styles.secondaryButtonText}>Schema prompt</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleImportJson} style={styles.secondaryButton}>
            <ThemedText style={styles.secondaryButtonText}>Import JSON</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
            <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isCreating}
            onPress={onCreate}
            style={[styles.saveButton, isCreating ? styles.disabledButton : null]}
          >
            <ThemedText style={styles.saveButtonText}>{isCreating ? 'Creating...' : 'Create draft'}</ThemedText>
          </Pressable>
        </View>
      </View>
      <Modal transparent animationType="fade" visible={isPromptOpen} onRequestClose={() => setIsPromptOpen(false)}>
        <View style={styles.promptModalBackdrop}>
          <View style={[styles.promptModal, { backgroundColor: colors.background, borderColor: colors.borderSoft }]}>
            <View style={styles.promptModalHeader}>
              <View>
                <ThemedText style={styles.detailEyebrow}>AI schema</ThemedText>
                <ThemedText style={styles.promptModalTitle}>Prompt and paste JSON</ThemedText>
              </View>
              <View style={styles.draftHeaderActions}>
                <Pressable accessibilityRole="button" onPress={handleCopyPrompt} style={styles.saveButton}>
                  <ThemedText style={styles.saveButtonText}>Copy</ThemedText>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setIsPromptOpen(false)} style={styles.secondaryButton}>
                  <ThemedText style={styles.secondaryButtonText}>Close</ThemedText>
                </Pressable>
              </View>
            </View>
            <TextInput
              editable={false}
              multiline
              scrollEnabled
              value={promptText}
              style={[styles.promptTextArea, { borderColor: colors.borderSoft, color: colors.text }]}
            />
            <View style={[styles.pasteCompilerBox, { borderColor: colors.borderSoft }]}>
              <View style={styles.pasteCompilerHeader}>
                <View>
                  <ThemedText style={styles.importReportTitle}>Paste generated JSON</ThemedText>
                  <ThemedText style={styles.importReportMessage}>Compile it here and the create form will fill in automatically.</ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={!pastedJson.trim() || editorHasErrors}
                  onPress={handleCompilePastedJson}
                  style={[styles.saveButton, (!pastedJson.trim() || editorHasErrors) && styles.actionButtonDisabled]}>
                  <ThemedText style={styles.saveButtonText}>Compile JSON</ThemedText>
                </Pressable>
              </View>
              <View style={[styles.jsonEditorFrame, { borderColor: colors.borderSoft }]}>
                <ScrollView style={styles.lineNumberGutter} showsVerticalScrollIndicator={false}>
                  {lineNumbers.map((lineNumber) => {
                    const hasLineError = editorDiagnostics.some((diagnostic) => diagnostic.line === lineNumber && diagnostic.severity === 'error');
                    return (
                      <ThemedText key={lineNumber} style={[styles.lineNumberText, hasLineError && styles.lineNumberTextError]}>
                        {lineNumber}
                      </ThemedText>
                    );
                  })}
                </ScrollView>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  onChangeText={setPastedJson}
                  placeholder="Paste the AI-generated JSON here"
                  placeholderTextColor={colors.placeholder}
                  scrollEnabled
                  spellCheck={false}
                  style={[styles.jsonEditorInput, { color: colors.text }]}
                  textAlignVertical="top"
                  value={pastedJson}
                />
              </View>
              <View style={styles.diagnosticsPanel}>
                {editorDiagnostics.map((diagnostic, index) => (
                  <View
                    key={`${diagnostic.severity}-${diagnostic.line ?? 'global'}-${diagnostic.message}-${index}`}
                    style={[
                      styles.diagnosticRow,
                      diagnostic.severity === 'error'
                        ? styles.diagnosticError
                        : diagnostic.severity === 'warning'
                          ? styles.diagnosticWarning
                          : styles.diagnosticInfo,
                    ]}>
                    <ThemedText style={styles.diagnosticLine}>{diagnostic.line ? `L${diagnostic.line}` : '--'}</ThemedText>
                    <ThemedText style={styles.diagnosticMessage}>{diagnostic.message}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView style={styles.detailScroller} contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
        {importReport ? (
          <View
            style={[
              styles.importReport,
              {
                backgroundColor: importReport.status === 'success' ? designSystem.colors.limeSoft : colors.surface,
                borderColor: importReport.status === 'success' ? designSystem.colors.lime : colors.borderSoft,
              },
            ]}>
            <ThemedText style={styles.importReportTitle}>
              {importReport.status === 'success' ? 'JSON compiled' : 'JSON compiler errors'} · {importReport.fileName}
            </ThemedText>
            {importReport.messages.map((message) => (
              <ThemedText key={message} style={styles.importReportMessage}>{message}</ThemedText>
            ))}
          </View>
        ) : null}
        {groupedRows.map((group) => (
          <SectionBlock colors={colors} key={group.title} title={group.title}>
            <View style={[styles.table, { borderColor: colors.borderSoft }]}>
              {group.rows.map((row) => (
                <View key={row.label} style={[styles.dataRow, { borderColor: colors.borderSoft }]}>
                  <ThemedText style={styles.dataLabel}>{getSchemaDisplayLabel(row.label)}</ThemedText>
                  <SchemaCellEditor colors={colors} row={row} onChange={(value) => updateRow(row.label, value)} />
                </View>
              ))}
            </View>
          </SectionBlock>
        ))}
      </ScrollView>
    </View>
  );
}

function ManagerField({ colors, label, value }: { colors: DashboardColors; label: string; value: string }) {
  return (
    <View style={[styles.managerField, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        defaultValue={value}
        placeholder="Not set"
        placeholderTextColor={colors.placeholder}
        style={[styles.textInput, { color: colors.text }]}
      />
    </View>
  );
}

function ManagerTextArea({ colors, label, value }: { colors: DashboardColors; label: string; value: string }) {
  return (
    <View style={[styles.managerField, styles.managerTextArea, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        defaultValue={value}
        multiline
        placeholder="Not set"
        placeholderTextColor={colors.placeholder}
        style={[styles.textInput, styles.textAreaInput, { color: colors.text }]}
      />
    </View>
  );
}

function ManagerList({ colors, items, label }: { colors: DashboardColors; items: readonly string[]; label: string }) {
  return (
    <View style={[styles.managerField, styles.managerTextArea, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.bulletList}>
        {(items.length ? items : ['']).map((item, index) => (
          <TextInput
            defaultValue={item}
            key={`${label}-${index}-${item}`}
            placeholder={index === 0 ? 'Add item' : 'Not set'}
            placeholderTextColor={colors.placeholder}
            style={[styles.listInput, { color: colors.text }]}
          />
        ))}
      </View>
    </View>
  );
}

function DraftField({
  colors,
  label,
  multiline = false,
  onChangeText,
  value,
}: {
  colors: DashboardColors;
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={[styles.managerField, { borderColor: colors.borderSoft }]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        placeholder={label}
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
        value={value}
        onChangeText={onChangeText}
        style={[styles.textInput, multiline && styles.textAreaInput, { color: colors.text }]}
      />
    </View>
  );
}

function DetailMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.detailMetric}>
      <ThemedText style={styles.detailMetricValue}>{value}</ThemedText>
      <ThemedText style={styles.detailMetricLabel}>{label}</ThemedText>
    </View>
  );
}

function ActionButton({
  disabled,
  label,
  onPress,
  tone,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  tone: 'approve' | 'cancel';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        tone === 'approve' ? styles.actionButtonApprove : styles.actionButtonCancel,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <ThemedText style={[styles.actionButtonText, tone === 'approve' && styles.actionButtonTextApprove]}>{label}</ThemedText>
    </Pressable>
  );
}

function EmptyTableRow({ label }: { label: string }) {
  return (
    <View style={styles.emptyTableRow}>
      <ThemedText style={styles.emptyText}>{label}</ThemedText>
    </View>
  );
}

function EmptyDetail({ colors, mode, onAdd }: { colors: DashboardColors; mode: ResourceMode; onAdd: () => void }) {
  return (
    <View style={styles.emptyDetail}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.overlay }]}>
        {mode === 'experiences' ? <MapTrifold color={colors.textMuted} size={24} weight="duotone" /> : <Bed color={colors.textMuted} size={24} weight="duotone" />}
      </View>
      <ThemedText style={styles.emptyTitle}>No item selected</ThemedText>
      <ThemedText style={styles.emptyBody}>Choose an item from the list or add a new {mode === 'experiences' ? 'experience' : 'room'}.</ThemedText>
      <Pressable accessibilityRole="button" onPress={onAdd} style={styles.addButton}>
        <Plus color={designSystem.colors.darkGreen} size={18} weight="bold" />
        <ThemedText style={styles.addButtonText}>Add {mode === 'experiences' ? 'experience' : 'room'}</ThemedText>
      </Pressable>
    </View>
  );
}

function filterBookingsForResource(bookings: ManagedBooking[], resource: ManagedResource | null) {
  if (!resource) {
    return [];
  }

  if (resource.kind === 'experience') {
    return bookings.filter((booking) => booking.kind === 'experience' && booking.slug === resource.experience.slug);
  }

  return bookings.filter((booking) => booking.kind === 'stay' && booking.slug === resource.room.stay.slug);
}

function filterPhotosForResource(photos: ManagedLocationPhoto[], resource: ManagedResource | null) {
  if (!resource) {
    return [];
  }

  if (resource.kind === 'experience') {
    return photos.filter((photo) => photo.locationKind === 'experience' && photo.locationSlug === resource.experience.slug);
  }

  return photos.filter((photo) => photo.locationKind === 'stay' && photo.locationSlug === resource.room.stay.slug);
}

function getResourceTitle(resource: ManagedResource) {
  return resource.kind === 'experience' ? resource.experience.title : resource.room.stay.name;
}

function getResourceSubtitle(resource: ManagedResource) {
  return resource.kind === 'experience'
    ? resource.experience.locationLabel ?? resource.experience.subtitle
    : resource.room.stay.locationLabel;
}

function getResourceImage(resource: ManagedResource) {
  return resource.kind === 'experience' ? resource.experience.imageUri : resource.room.imageUri;
}

function getResourceGallery(resource: ManagedResource) {
  return resource.kind === 'experience'
    ? resource.experience.galleryImages?.length
      ? resource.experience.galleryImages
      : [resource.experience.imageUri]
    : resource.room.stay.galleryImages.length
      ? resource.room.stay.galleryImages
      : [resource.room.stay.imageUri];
}

function getExperienceKind(experience: ExploreExperience) {
  return experience.itemKind === 'hiddenGem' ? 'hiddenGem' : 'experience';
}

function getExperienceKindLabel(experience: ExploreExperience) {
  return getExperienceKind(experience) === 'hiddenGem' ? 'Hidden gem' : 'Experience';
}

function getExperienceKindSelectValue(experience: ExploreExperience) {
  return getExperienceKindLabel(experience);
}

function getResourceRating(resource: ManagedResource) {
  if (resource.kind === 'room') {
    return resource.room.stay.rating.toFixed(1);
  }

  const visitorCount = resource.experience.travelerMomentum?.visitorCount ?? 0;
  return visitorCount > 100 ? '4.8' : visitorCount > 40 ? '4.6' : 'New';
}

function getResourceVisitorCount(resource: ManagedResource, bookings: ManagedBooking[]) {
  if (resource.kind === 'experience') {
    return resource.experience.travelerMomentum?.visitorCount ?? bookings.filter((booking) => booking.status === 'confirmed').length;
  }

  return resource.room.stay.reviewCount;
}

function buildRatingSignals(resource: ManagedResource, bookings: ManagedBooking[]) {
  if (resource.kind === 'room') {
    return [
      { label: 'Guest rating', detail: `${resource.room.stay.reviewCount} stay reviews`, value: resource.room.stay.rating.toFixed(1) },
      { label: 'Sleep signal', detail: resource.room.stay.sleepSignal, value: 'High' },
      { label: 'Confirmed stays', detail: 'Completed or approved room bookings', value: bookings.filter((booking) => booking.status === 'confirmed').length },
    ];
  }

  return [
    { label: 'Traveler momentum', detail: resource.experience.travelerMomentum?.summary ?? 'No public momentum yet', value: resource.experience.travelerMomentum?.visitorCount ?? 0 },
    { label: 'Confirmed visits', detail: 'Approved bookings for this experience', value: bookings.filter((booking) => booking.status === 'confirmed').length },
    { label: 'Trip fit', detail: resource.experience.tripFit?.map((item) => item.value).join(' · ') ?? 'Not set', value: resource.experience.tripFit?.length ?? 0 },
  ];
}

function getAvailabilitySummary(resource: ManagedResource, bookings: ManagedBooking[]) {
  const confirmedCount = bookings.filter((booking) => booking.status === 'confirmed').length;
  const pendingCount = bookings.filter((booking) => booking.status === 'pending').length;

  if (resource.kind === 'room') {
    const hasBookings = confirmedCount > 0 || pendingCount > 0;

    return {
      capacityLabel: hasBookings ? `${confirmedCount} confirmed` : 'Open',
      confirmedCount,
      detail: pendingCount ? `${pendingCount} pending requests` : 'No pending requests',
      isFull: false,
      label: 'Available',
      pendingCount,
    };
  }

  const publicLabel = resource.experience.booking?.availabilityLabel ?? 'Available';
  const normalized = publicLabel.toLowerCase();
  const isFull = normalized.includes('full') || normalized.includes('sold');

  return {
    capacityLabel: resource.experience.groupSizeLabel ?? 'Open capacity',
    confirmedCount,
    detail: `${confirmedCount} confirmed visits · ${pendingCount} pending requests`,
    isFull,
    label: isFull ? publicLabel : 'Available',
    pendingCount,
  };
}

function getSchemaEditor(label: string, multiline?: boolean): NonNullable<SchemaRow['editor']> {
  if (label === 'coordinate' || label.endsWith('.coordinate')) {
    return 'coordinate';
  }

  if (label === 'imageUri' || label.endsWith('.imageUri')) {
    return 'image';
  }

  if (label === 'galleryImages' || label.endsWith('.galleryImages')) {
    return 'images';
  }

  if (
    label === 'description' ||
    label.endsWith('.detail') ||
    label.endsWith('.summary') ||
    label.endsWith('.sleepSignal') ||
    label.endsWith('.bookingNote')
  ) {
    return 'text';
  }

  if (
    label === 'includes' ||
    label.endsWith('.idealFor') ||
    label.endsWith('.amenities') ||
    label.endsWith('.nearbyHighlights')
  ) {
    return 'list';
  }

  if (
    label === 'tripFit' ||
    label.endsWith('.bedOptions') ||
    label.endsWith('.roomOptions') ||
    label.endsWith('.arrivalOptions')
  ) {
    return 'json';
  }

  if (
    label.endsWith('.maxAdults') ||
    label.endsWith('.maxChildren') ||
    label.endsWith('.maxRooms') ||
    label === 'priceUsd' ||
    label.endsWith('.priceUsd') ||
    label.endsWith('.pricePerNight') ||
    label.endsWith('.rating') ||
    label.endsWith('.reviewCount') ||
    label.endsWith('.confirmed') ||
    label.endsWith('.pending')
  ) {
    return 'number';
  }

  if (
    label === 'itemKind' ||
    label === 'badgeTone' ||
    label === 'category' ||
    label === 'durationLabel' ||
    label.endsWith('.availabilityLabel') ||
    label.endsWith('.stayStyle') ||
    label.endsWith('.routeVibe') ||
    label.endsWith('.confirmMode')
  ) {
    return 'select';
  }

  return multiline ? 'list' : 'text';
}

function getSchemaKeyboardType(
  label: string,
  editor: NonNullable<SchemaRow['editor']>
): React.ComponentProps<typeof TextInput>['keyboardType'] {
  if (label.toLowerCase().includes('phone')) {
    return 'phone-pad';
  }

  if (editor === 'number') {
    return 'decimal-pad';
  }

  return 'default';
}

function getSchemaOptions(label: string) {
  if (label === 'itemKind') {
    return EXPERIENCE_KIND_OPTIONS;
  }

  if (label === 'badgeTone') {
    return ['', 'accent', 'soft', 'dark'];
  }

  if (label === 'category') {
    return EXPERIENCE_CATEGORY_OPTIONS;
  }

  if (label === 'durationLabel') {
    return EXPERIENCE_DURATION_OPTIONS;
  }

  if (label.endsWith('.availabilityLabel')) {
    return PUBLIC_AVAILABILITY_OPTIONS;
  }

  if (label.endsWith('.stayStyle')) {
    return ['design', 'lodge', 'roadside', 'wellness'];
  }

  if (label.endsWith('.routeVibe')) {
    return ['city reset', 'coast base', 'wildlife stop', 'desert night'];
  }

  if (label.endsWith('.confirmMode')) {
    return ['', 'Instant confirmation', 'Host confirmation within 1 hour', 'Host confirmation within 2 hours', 'Host confirmation within 4 hours', 'Manual confirmation'];
  }

  return [''];
}

async function pickSchemaImage(editor: 'image' | 'images', currentValue: string, onChange: (value: string) => void) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: editor === 'images',
    mediaTypes: ['images'],
    quality: 0.9,
    selectionLimit: editor === 'images' ? 0 : 1,
  });

  if (result.canceled || result.assets.length === 0) {
    return;
  }

  const nextUris = result.assets.map((asset) => asset.uri).filter(Boolean);
  if (editor === 'image') {
    onChange(nextUris[0] ?? currentValue);
    return;
  }

  const existingUris = currentValue.split(',').map((item) => item.trim()).filter(Boolean);
  onChange([...existingUris, ...nextUris].join(', '));
}

function compileDraftJson(jsonText: string, draft: DraftResource): { draft: DraftResource; messages: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Invalid JSON syntax: ${error instanceof Error ? error.message : 'parse failed'}`);
  }

  if (!isPlainRecord(parsed)) {
    throw new Error('Root must be a JSON object.');
  }

  const kind = typeof parsed.kind === 'string' ? parsed.kind : null;
  if (kind !== draft.kind) {
    errors.push(`kind must be "${draft.kind}".`);
  }

  const fields = isPlainRecord(parsed.fields) ? parsed.fields : null;
  if (!fields) {
    errors.push('fields object is required.');
  }

  if (!fields) {
    throw new Error(errors.join('\n'));
  }

  const usedFieldKeys = new Set<string>();
  const rows = draft.rows.map((row) => {
    const importedValue = readImportedField(fields, row.label, usedFieldKeys);
    if (importedValue === undefined || importedValue === null || importedValue === '') {
      errors.push(`${row.label} is required.`);
      return row;
    }

    const compiledValue = compileSchemaValue(row, importedValue, errors);
    return { ...row, value: compiledValue };
  });

  const knownRoots = new Set(draft.rows.map((row) => row.label.split('.')[0]));
  Object.keys(fields).forEach((key) => {
    if (!usedFieldKeys.has(key) && !knownRoots.has(key)) {
      warnings.push(`Ignored unknown field "${key}".`);
    }
  });

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  return {
    draft: { ...draft, rows } as DraftResource,
    messages: warnings,
  };
}

function analyzeDraftJsonText(jsonText: string, draft: DraftResource): JsonEditorDiagnostic[] {
  const trimmedText = jsonText.trim();
  if (!trimmedText) {
    return [{ message: 'Paste generated JSON to start live validation.', severity: 'info' }];
  }

  const diagnostics: JsonEditorDiagnostic[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const syntax = getJsonSyntaxDiagnostic(jsonText, error);
    return [{ line: syntax.line, message: syntax.message, severity: 'error' }];
  }

  if (!isPlainRecord(parsed)) {
    return [{ line: 1, message: 'Root must be a JSON object.', severity: 'error' }];
  }

  if (parsed.kind !== draft.kind) {
    diagnostics.push({
      line: findJsonLine(jsonText, 'kind'),
      message: `kind must be "${draft.kind}".`,
      severity: 'error',
    });
  }

  if (!isPlainRecord(parsed.fields)) {
    diagnostics.push({
      line: findJsonLine(jsonText, 'fields'),
      message: 'fields object is required.',
      severity: 'error',
    });
    return diagnostics;
  }

  const validLabels = draft.rows.map((row) => row.label);
  const flattenedFields = flattenImportedFields(parsed.fields);
  flattenedFields.forEach((field) => {
    if (validLabels.includes(field.path)) {
      return;
    }

    const suggestion = findClosestFieldLabel(field.path, validLabels);
    diagnostics.push({
      line: findJsonLine(jsonText, field.key),
      message: suggestion ? `Unknown field "${field.path}". Did you mean "${suggestion}"?` : `Unknown field "${field.path}".`,
      severity: 'warning',
    });
  });

  try {
    const compiled = compileDraftJson(jsonText, draft);
    compiled.messages.forEach((message) => {
      diagnostics.push({ message, severity: 'warning' });
    });
  } catch (error) {
    splitCompilerMessage(error instanceof Error ? error.message : 'Could not compile JSON.').forEach((message) => {
      diagnostics.push({
        line: findDiagnosticLine(jsonText, message),
        message,
        severity: 'error',
      });
    });
  }

  getPlaceholderDiagnostics(jsonText, flattenedFields).forEach((diagnostic) => diagnostics.push(diagnostic));

  if (diagnostics.length === 0) {
    return [{ message: 'Ready to compile. JSON matches the manager schema.', severity: 'info' }];
  }

  return dedupeDiagnostics(diagnostics);
}

function flattenImportedFields(value: Record<string, unknown>, prefix = ''): { key: string; path: string; value: unknown }[] {
  const fields: { key: string; path: string; value: unknown }[] = [];

  Object.entries(value).forEach(([key, fieldValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainRecord(fieldValue) && !isCoordinateLikeRecord(fieldValue)) {
      fields.push(...flattenImportedFields(fieldValue, path));
      return;
    }

    fields.push({ key, path, value: fieldValue });
  });

  return fields;
}

function getPlaceholderDiagnostics(jsonText: string, fields: { key: string; path: string; value: unknown }[]): JsonEditorDiagnostic[] {
  return fields.flatMap((field) => {
    const values = Array.isArray(field.value) ? field.value : [field.value];
    const diagnostics: JsonEditorDiagnostic[] = [];
    if (values.some((value) => {
      if (typeof value !== 'string') {
        return false;
      }
      const normalized = value.trim().toLowerCase();
      return normalized === 'string' || normalized === 'https://...' || normalized === '...' || normalized.includes('placeholder');
    })) {
      diagnostics.push({
        line: findJsonLine(jsonText, field.key),
        message: `${field.path} still looks like placeholder text.`,
        severity: 'warning',
      });
    }

    const isImageField = field.path === 'imageUri' || field.path.endsWith('.imageUri') || field.path === 'galleryImages' || field.path.endsWith('.galleryImages');

    if (!isImageField && values.some((value) => typeof value === 'string' && looksLikeCorruptedImportedText(value))) {
      diagnostics.push({
        line: findJsonLine(jsonText, field.key),
        message: `${field.path} looks corrupted with markdown, URLs, or JSON fragments.`,
        severity: 'error',
      });
    }

    if (isImageField && values.some((value) => typeof value !== 'string' || !isValidPublicImageUrl(value.trim()))) {
      diagnostics.push({
        line: findJsonLine(jsonText, field.key),
        message: `${field.path} must contain bare public image URL strings only.`,
        severity: 'error',
      });
    }

    return diagnostics;
  });
}

function getJsonSyntaxDiagnostic(jsonText: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Invalid JSON syntax.';
  const positionMatch = message.match(/position\s+(\d+)/i);
  if (!positionMatch) {
    return { line: 1, message: `Invalid JSON syntax: ${message}` };
  }

  const position = Number(positionMatch[1]);
  const line = jsonText.slice(0, position).split('\n').length;
  return { line, message: `Invalid JSON syntax near line ${line}: ${message}` };
}

function findDiagnosticLine(jsonText: string, message: string) {
  const fieldMatch = message.match(/^([A-Za-z0-9_.]+)\s/);
  if (!fieldMatch) {
    return undefined;
  }

  const parts = fieldMatch[1].split('.');
  return findJsonLine(jsonText, parts[parts.length - 1] ?? fieldMatch[1]);
}

function findJsonLine(jsonText: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`"${escapedKey}"\\s*:`);
  const lines = jsonText.split('\n');
  const lineIndex = lines.findIndex((line) => pattern.test(line));
  return lineIndex >= 0 ? lineIndex + 1 : undefined;
}

function findClosestFieldLabel(fieldPath: string, validLabels: string[]) {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestLabel = '';

  validLabels.forEach((label) => {
    const distance = levenshteinDistance(fieldPath.toLowerCase(), label.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestLabel = label;
    }
  });

  if (!bestLabel || bestDistance > Math.max(3, Math.floor(bestLabel.length / 3))) {
    return null;
  }

  return bestLabel;
}

function levenshteinDistance(first: string, second: string) {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  const current = Array.from({ length: second.length + 1 }, () => 0);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    current[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const cost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + cost
      );
    }
    for (let index = 0; index <= second.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[second.length];
}

function isCoordinateLikeRecord(value: Record<string, unknown>) {
  return 'longitude' in value || 'latitude' in value || 'lng' in value || 'lat' in value;
}

function dedupeDiagnostics(diagnostics: JsonEditorDiagnostic[]) {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.line ?? ''}:${diagnostic.severity}:${diagnostic.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function compileSchemaValue(row: SchemaRow, value: unknown, errors: string[]) {
  const editor = row.editor ?? getSchemaEditor(row.label, row.multiline);

  if (editor === 'number') {
    const numberValue = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(numberValue)) {
      errors.push(`${row.label} must be a number.`);
      return '';
    }
    return String(numberValue);
  }

  if (editor === 'select') {
    const textValue = String(value).trim();
    const options = row.options ?? getSchemaOptions(row.label);
    if (!options.some((option) => option === textValue)) {
      errors.push(`${row.label} must be one of: ${options.map((option) => option || 'Not set').join(', ')}.`);
    }
    return textValue;
  }

  if (editor === 'coordinate') {
    const coordinate = normalizeImportedCoordinate(value);
    if (!coordinate) {
      errors.push(`${row.label} must be "longitude, latitude", [longitude, latitude], or { "longitude": number, "latitude": number }.`);
      return '';
    }
    return formatCoordinateValue(coordinate);
  }

  if (editor === 'image') {
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`${row.label} must be an image URL string.`);
      return '';
    }
    const imageUri = value.trim();
    if (!isValidPublicImageUrl(imageUri)) {
      errors.push(`${row.label} must be a bare public image URL starting with http:// or https://. Do not include markdown brackets or extra text.`);
    }
    return imageUri;
  }

  if (editor === 'images') {
    if (Array.isArray(value)) {
      const items = value.map((item) => String(item).trim()).filter(Boolean);
      if (items.length === 0) {
        errors.push(`${row.label} must include at least one item.`);
      }
      items.forEach((item) => {
        if (!isValidPublicImageUrl(item)) {
          errors.push(`${row.label} contains an invalid image URL: ${item}`);
        }
      });
      return items.join(', ');
    }
    if (typeof value === 'string' && value.trim()) {
      const items = value.split(',').map((item) => item.trim()).filter(Boolean);
      items.forEach((item) => {
        if (!isValidPublicImageUrl(item)) {
          errors.push(`${row.label} contains an invalid image URL: ${item}`);
        }
      });
      return items.join(', ');
    }
    errors.push(`${row.label} must be a non-empty array or comma-separated string.`);
    return '';
  }

  if (editor === 'list') {
    if (Array.isArray(value)) {
      const items = value.map((item) => String(item).trim()).filter(Boolean);
      if (items.length === 0) {
        errors.push(`${row.label} must include at least one item.`);
      }
      return items.join(', ');
    }
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    errors.push(`${row.label} must be a non-empty array or comma-separated string.`);
    return '';
  }

  if (editor === 'json') {
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return value;
      } catch {
        errors.push(`${row.label} must be valid JSON.`);
        return value;
      }
    }
    return JSON.stringify(value, null, 2);
  }

  const textValue = String(value).trim();
  if (!textValue) {
    errors.push(`${row.label} must be populated.`);
  }
  if (looksLikeCorruptedImportedText(textValue)) {
    errors.push(`${row.label} looks corrupted. Keep this as plain text only; move image URLs into imageUri/galleryImages and remove JSON or markdown fragments.`);
  }
  return textValue;
}

function isValidPublicImageUrl(value: string) {
  if (value.includes('[') || value.includes(']') || value.includes('(') || value.includes(')') || value.includes('%22')) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function looksLikeCorruptedImportedText(value: string) {
  const normalized = value.toLowerCase();
  return (
    /\[[^\]]*\]\(https?:\/\//i.test(value) ||
    /https?:\/\//i.test(value) ||
    normalized.includes('%22') ||
    normalized.includes('"galleryimages"') ||
    normalized.includes('"imageuri"') ||
    normalized.includes('"bookingnote"') ||
    normalized.includes('galleryimages%22') ||
    normalized.includes('imageuri%22') ||
    normalized.includes('bookingnote%22')
  );
}

function readImportedField(fields: Record<string, unknown>, label: string, usedFieldKeys: Set<string>) {
  if (Object.prototype.hasOwnProperty.call(fields, label)) {
    usedFieldKeys.add(label);
    return fields[label];
  }

  const path = label.split('.');
  let value: unknown = fields;
  let consumedRoot: string | null = null;
  for (const segment of path) {
    if (!isPlainRecord(value) || !Object.prototype.hasOwnProperty.call(value, segment)) {
      return undefined;
    }
    consumedRoot = consumedRoot ?? segment;
    value = value[segment];
  }

  if (consumedRoot) {
    usedFieldKeys.add(consumedRoot);
  }
  return value;
}

function normalizeImportedCoordinate(value: unknown): readonly [number, number] | null {
  if (typeof value === 'string') {
    return parseCoordinateValue(value);
  }

  if (Array.isArray(value) && value.length >= 2) {
    const longitude = Number(value[0]);
    const latitude = Number(value[1]);
    return Number.isFinite(longitude) && Number.isFinite(latitude) ? ([longitude, latitude] as const) : null;
  }

  if (isPlainRecord(value)) {
    const longitude = Number(value.longitude ?? value.lng);
    const latitude = Number(value.latitude ?? value.lat);
    return Number.isFinite(longitude) && Number.isFinite(latitude) ? ([longitude, latitude] as const) : null;
  }

  return null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function splitCompilerMessage(message: string) {
  return message.split('\n').map((item) => item.trim()).filter(Boolean);
}

function parseCoordinateValue(value: string): readonly [number, number] | null {
  const [longitudeRaw, latitudeRaw] = value.split(',').map((part) => Number(part.trim()));

  if (!Number.isFinite(longitudeRaw) || !Number.isFinite(latitudeRaw)) {
    return null;
  }

  return [longitudeRaw, latitudeRaw] as const;
}

function formatCoordinateValue(coordinate: readonly [number, number]) {
  return `${coordinate[0].toFixed(5)}, ${coordinate[1].toFixed(5)}`;
}

function buildSchemaRows(resource: ManagedResource): SchemaRow[] {
  if (resource.kind === 'experience') {
    const experience = resource.experience;
    return [
      { label: 'itemKind', value: getExperienceKindSelectValue(experience) },
      { label: 'slug', value: experience.slug },
      { label: 'badge', value: experience.badge },
      { label: 'badgeTone', value: experience.badgeTone ?? '' },
      { label: 'title', value: experience.title },
      { label: 'subtitle', value: experience.subtitle },
      { label: 'description', multiline: true, value: experience.description },
      { label: 'imageUri', value: experience.imageUri },
      { label: 'galleryImages', multiline: true, value: joinList(experience.galleryImages) },
      { editor: 'number', label: 'priceUsd', value: String(parsePriceAmount(experience.price)) },
      { label: 'category', value: experience.category ?? '' },
      { label: 'countryCode', value: experience.countryCode ?? '' },
      { label: 'countryLabel', value: experience.countryLabel ?? '' },
      { label: 'planningLocationId', value: experience.planningLocationId ?? '' },
      { label: 'coordinate', value: joinList(experience.coordinate) },
      { label: 'locationLabel', value: experience.locationLabel ?? '' },
      { label: 'geography.region', value: experience.geography?.region ?? '' },
      { label: 'geography.town', value: experience.geography?.town ?? '' },
      { label: 'durationLabel', value: experience.durationLabel ?? '' },
      { label: 'groupSizeLabel', value: experience.groupSizeLabel ?? '' },
      { label: 'booking.availabilityLabel', value: experience.booking?.availabilityLabel ?? '' },
      { label: 'booking.confirmMode', value: experience.booking?.confirmMode ?? '' },
      { label: 'includes', multiline: true, value: joinList(experience.includes) },
      { label: 'tripFit', multiline: true, value: stringifyCompact(experience.tripFit) },
    ];
  }

  const { room, stay } = resource.room;
  return [
    { label: 'room.id', value: room.id },
    { label: 'room.label', value: room.label },
    { label: 'room.detail', multiline: true, value: room.detail },
    { label: 'room.maxAdults', value: String(room.maxAdults) },
    { label: 'room.maxChildren', value: String(room.maxChildren) },
    { label: 'room.maxRooms', value: String(room.maxRooms) },
    { label: 'room.bedOptions', multiline: true, value: stringifyCompact(room.bedOptions) },
    { label: 'stay.id', value: stay.id },
    { label: 'stay.slug', value: stay.slug },
    { label: 'stay.name', value: stay.name },
    { label: 'stay.bookingPhone', value: stay.bookingPhone ?? '' },
    { label: 'stay.locationLabel', value: stay.locationLabel },
    { label: 'stay.town', value: stay.town },
    { label: 'stay.region', value: stay.region },
    { label: 'stay.countryCode', value: stay.countryCode ?? '' },
    { label: 'stay.countryLabel', value: stay.countryLabel ?? '' },
    { label: 'stay.planningLocationId', value: stay.planningLocationId ?? '' },
    { label: 'stay.coordinate', value: joinList(stay.coordinate) },
    { label: 'stay.imageUri', value: stay.imageUri },
    { label: 'stay.galleryImages', multiline: true, value: joinList(stay.galleryImages) },
    { editor: 'number', label: 'stay.priceUsd', value: String(stay.pricePerNight) },
    { label: 'stay.rating', value: String(stay.rating) },
    { label: 'stay.reviewCount', value: String(stay.reviewCount) },
    { label: 'stay.stayStyle', value: stay.stayStyle },
    { label: 'stay.routeVibe', value: stay.routeVibe },
    { label: 'stay.sleepSignal', value: stay.sleepSignal },
    { label: 'stay.summary', multiline: true, value: stay.summary },
    { label: 'stay.idealFor', multiline: true, value: joinList(stay.idealFor) },
    { label: 'stay.amenities', multiline: true, value: joinList(stay.amenities) },
    { label: 'stay.nearbyHighlights', multiline: true, value: joinList(stay.nearbyHighlights) },
    { label: 'bookingProfile.defaultRoomOptionId', value: stay.bookingProfile?.defaultRoomOptionId ?? '' },
    { label: 'bookingProfile.defaultArrivalOptionId', value: stay.bookingProfile?.defaultArrivalOptionId ?? '' },
    { editor: 'json', label: 'bookingProfile.roomOptions', multiline: true, value: stringifyCompact(stay.bookingProfile?.roomOptions) },
    { editor: 'json', label: 'bookingProfile.arrivalOptions', multiline: true, value: stringifyCompact(stay.bookingProfile?.arrivalOptions) },
    { label: 'stay.bookingNote', multiline: true, value: stay.bookingNote },
  ];
}

function groupSchemaRows(rows: SchemaRow[]) {
  const groups: { rows: SchemaRow[]; title: string }[] = [];

  rows.forEach((row) => {
    const title = getSchemaGroupTitle(row.label);
    const existingGroup = groups.find((group) => group.title === title);

    if (existingGroup) {
      existingGroup.rows.push(row);
      return;
    }

    groups.push({ title, rows: [row] });
  });

  return groups;
}

function getSchemaGroupTitle(label: string) {
  if (label.startsWith('room.')) {
    return 'Room option';
  }

  if (label.startsWith('stay.')) {
    return 'Stay property';
  }

  if (label.startsWith('bookingProfile.')) {
    return 'Booking profile';
  }

  if (label.startsWith('booking.')) {
    return 'Booking settings';
  }

  if (label.startsWith('geography.')) {
    return 'Geography';
  }

  if (label === 'priceUsd' || label.endsWith('.priceUsd') || label.endsWith('.pricePerNight')) {
    return 'Pricing';
  }

  if (label === 'imageUri' || label === 'galleryImages') {
    return 'Media';
  }

  return 'Listing';
}

function getSchemaDisplayLabel(label: string) {
  const labels: Record<string, string> = {
    'booking.availabilityLabel': 'Public availability',
    'booking.confirmMode': 'Confirmation',
    'category': 'Category',
    'description': 'Description',
    'durationLabel': 'Duration',
    'galleryImages': 'Gallery',
    'groupCapacity': 'Capacity',
    'imageUri': 'Main image',
    'includes': 'Includes',
    'itemKind': 'Type',
    'mapLocation': 'Mapbox location',
    'priceUsd': 'USD price',
    'room.bedOptions': 'Bed options',
    'room.detail': 'Room detail',
    'room.label': 'Room name',
    'room.maxAdults': 'Adults',
    'room.maxChildren': 'Children',
    'room.maxRooms': 'Rooms available',
    'stay.bookingNote': 'Booking note',
    'stay.bookingPhone': 'Booking phone',
    'stay.galleryImages': 'Gallery',
    'stay.idealFor': 'Ideal for',
    'stay.imageUri': 'Main image',
    'stay.name': 'Property name',
    'stay.priceUsd': 'USD nightly price',
    'stay.routeVibe': 'Route vibe',
    'stay.sleepSignal': 'Sleep signal',
    'stay.stayStyle': 'Stay style',
    'stay.summary': 'Summary',
    'subtitle': 'Subtitle',
    'title': 'Title',
  };

  return labels[label] ?? label.replace(/\./g, ' ');
}

function joinList(value: readonly unknown[] | undefined) {
  return value?.map((item) => String(item)).join(', ') ?? '';
}

function stringifyCompact(value: unknown) {
  return value ? JSON.stringify(value) : '';
}

function stringifyValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function parseCapacityFromLabel(label: string) {
  const match = label.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function getFriendlyPlaceholder(label: string, inputMode: 'text' | 'number' | 'phone', multiline: boolean) {
  const normalized = label.toLowerCase();

  if (inputMode === 'phone') {
    return `Enter ${normalized}`;
  }

  if (inputMode === 'number') {
    return `Enter ${normalized}`;
  }

  if (multiline) {
    return `Add ${normalized}`;
  }

  return `Enter ${normalized}`;
}

function parsePriceAmount(value: string) {
  const normalized = value.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return normalized ? Number.parseFloat(normalized[0]) : 0;
}

function formatDraftUsdPrice(value: string, currencyCode: string) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { amountLabel: 'Converted for each traveler', rateLabel: '' };
  }

  return formatUsdConversionParts(amount, currencyCode);
}

function getManagedBookingDateLabel(booking: ManagedBooking) {
  const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });

  if (booking.kind === 'stay' && booking.checkIn) {
    const checkIn = formatter.format(new Date(booking.checkIn));
    const checkOut = booking.checkOut ? formatter.format(new Date(booking.checkOut)) : null;

    return checkOut ? `${checkIn} - ${checkOut}` : checkIn;
  }

  return formatter.format(new Date(booking.bookedAt));
}

function getStatusStyle(status: ManagedBooking['status']) {
  if (status === 'confirmed') {
    return styles.statusConfirmed;
  }

  if (status === 'cancelled') {
    return styles.statusCancelled;
  }

  return styles.statusPending;
}

const styles = StyleSheet.create({
  managerListPanel: {
    flex: 1,
    minHeight: 0,
  },
  managerListHeader: {
    alignItems: 'center',
    borderBottomColor: designSystem.colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  managerListTitleBlock: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  managerListTitle: {
    color: designSystem.colors.ink,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  managerListMeta: {
    color: designSystem.colors.mutedText,
    fontSize: 11,
    lineHeight: 15,
  },
  compactCreateButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 10,
  },
  compactCreateButtonText: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  inventoryHeaderRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 30,
    paddingHorizontal: 12,
  },
  inventoryHeaderText: {
    color: designSystem.colors.subtleText,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
    textTransform: 'uppercase',
  },
  inventoryListingColumn: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  inventoryMetricColumn: {
    flexShrink: 0,
    textAlign: 'right',
    width: 52,
  },
  managerDetailPanel: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: 'auto',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  resourceList: {
    gap: 0,
    padding: 0,
  },
  resourceItem: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
  },
  resourceSelectedRail: {
    backgroundColor: designSystem.colors.darkGreen,
    borderRadius: 2,
    bottom: 9,
    left: 0,
    position: 'absolute',
    top: 9,
    width: 3,
  },
  resourceImage: {
    borderRadius: 6,
    height: 40,
    width: 40,
  },
  resourceCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  resourceTitle: {
    color: designSystem.colors.ink,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  resourceSubtitle: {
    color: designSystem.colors.mutedText,
    fontSize: 10,
    lineHeight: 14,
  },
  inventoryCellText: {
    color: designSystem.colors.ink,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  detailArea: {
    borderRadius: 12,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  detailContent: {
    flex: 1,
    minHeight: 0,
  },
  detailHeader: {
    alignItems: 'center',
    borderBottomColor: designSystem.colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailHeroImage: {
    borderRadius: 8,
    height: 82,
    width: 112,
  },
  detailHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  detailTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailEyebrow: {
    color: designSystem.colors.darkGreen,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  detailTitle: {
    color: designSystem.colors.ink,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  detailSubtitle: {
    color: designSystem.colors.warmDark,
    fontSize: 12,
    lineHeight: 16,
  },
  detailStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    maxWidth: 420,
  },
  detailMetric: {
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    gap: 1,
    minWidth: 78,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  detailMetricValue: {
    color: designSystem.colors.ink,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  detailMetricLabel: {
    color: designSystem.colors.mutedText,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
    textTransform: 'uppercase',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  saveButtonText: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  disabledButton: {
    opacity: 0.55,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.scrimFaint,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  detailTabs: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 48,
  },
  detailTabsContent: {
    borderBottomColor: designSystem.colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailTab: {
    minHeight: 30,
    minWidth: 84,
  },
  detailScroller: {
    flex: 1,
  },
  detailBody: {
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionStack: {
    gap: 14,
  },
  editorStack: {
    gap: 16,
  },
  friendlySection: {
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    overflow: 'hidden',
    paddingTop: 0,
  },
  friendlySectionTitle: {
    backgroundColor: designSystem.colors.scrimFaint,
    color: designSystem.colors.ink,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  friendlySubsectionTitle: {
    color: designSystem.colors.subtleText,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    paddingTop: 4,
    textTransform: 'uppercase',
  },
  friendlyTable: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  friendlyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    minHeight: 34,
    paddingVertical: 2,
  },
  friendlyLabel: {
    color: designSystem.colors.subtleText,
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    paddingTop: 3,
    textTransform: 'uppercase',
    width: 160,
  },
  friendlyInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 22,
    padding: 0,
  },
  friendlyInputMultiline: {
    minHeight: 54,
    textAlignVertical: 'top',
  },
  derivedValueText: {
    color: designSystem.colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 22,
  },
  derivedValueStack: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  derivedRateText: {
    color: designSystem.colors.gray,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  priceCell: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  currencyPrefix: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  priceInput: {
    flex: 0,
    minWidth: 72,
  },
  capacityCell: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  stepperCell: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  stepperButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.scrimFaint,
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  stepperButtonText: {
    color: designSystem.colors.darkGreen,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  stepperInput: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    minWidth: 34,
    padding: 0,
    textAlign: 'center',
  },
  stepperSuffix: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },
  friendlyListBlock: {
    gap: 8,
  },
  commaPreviewWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
    paddingLeft: 172,
  },
  commaPreviewChip: {
    backgroundColor: designSystem.colors.scrimFaint,
    borderRadius: 14,
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  commaPreviewText: {
    color: designSystem.colors.ink,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  tripFitList: {
    gap: 0,
    paddingBottom: 12,
  },
  tripFitTableHeader: {
    alignItems: 'center',
    borderBottomColor: designSystem.colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 34,
    paddingVertical: 6,
  },
  tripFitRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingVertical: 6,
  },
  tripFitLabelColumn: {
    flexShrink: 0,
    minWidth: 0,
    width: 140,
  },
  tripFitValueColumn: {
    flexShrink: 0,
    width: 140,
  },
  tripFitDetailColumn: {
    flex: 1.6,
  },
  tripFitDetailInput: {
    minHeight: 24,
    textAlignVertical: 'top',
  },
  inlineAddButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
    minHeight: 26,
    paddingHorizontal: 9,
  },
  inlineAddText: {
    color: designSystem.colors.darkGreen,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  sectionBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    paddingBottom: 10,
  },
  sectionBlockHeader: {
    gap: 3,
  },
  sectionBlockTitle: {
    color: designSystem.colors.ink,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  sectionBlockSubtitle: {
    color: designSystem.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
  },
  formGrid: {
    gap: 0,
  },
  availabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availabilityCard: {
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 58,
    padding: 10,
  },
  availabilityLabel: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  availabilityOpen: {
    color: designSystem.colors.darkGreen,
  },
  availabilityFull: {
    color: designSystem.colors.copper,
  },
  availabilityMeta: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  managerField: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 5,
    minHeight: 42,
    paddingVertical: 7,
  },
  managerTextArea: {
    alignItems: 'flex-start',
    minHeight: 72,
  },
  fieldLabel: {
    color: designSystem.colors.subtleText,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textTransform: 'uppercase',
    width: 160,
  },
  fieldValue: {
    color: designSystem.colors.ink,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    padding: 0,
  },
  textAreaInput: {
    minHeight: 54,
    textAlignVertical: 'top',
  },
  bulletList: {
    flex: 1,
    gap: 4,
  },
  listInput: {
    borderBottomColor: designSystem.colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 24,
    padding: 0,
  },
  optionTable: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionHeader: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  optionHeaderText: {
    color: designSystem.colors.subtleText,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  optionRow: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 92,
    padding: 10,
  },
  compactOptionRow: {
    alignItems: 'center',
    minHeight: 46,
  },
  optionNameColumn: {
    flex: 1,
    minWidth: 0,
  },
  optionSmallColumn: {
    flexShrink: 0,
    width: 84,
  },
  optionActionColumn: {
    flexShrink: 0,
    width: 28,
  },
  optionInput: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    minHeight: 24,
    padding: 0,
  },
  compactStepperCell: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'flex-end',
  },
  compactStepperButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.scrimFaint,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  compactStepperText: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  compactStepperInput: {
    borderBottomColor: designSystem.colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    minWidth: 22,
    padding: 0,
    textAlign: 'center',
  },
  rowRemoveButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.scrimFaint,
    borderRadius: 13,
    flexShrink: 0,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  optionDetailInput: {
    fontWeight: '500',
    minHeight: 36,
    textAlignVertical: 'top',
  },
  optionMetaInput: {
    color: designSystem.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
    padding: 0,
  },
  bulletItem: {
    color: designSystem.colors.ink,
    fontSize: 13,
    lineHeight: 18,
  },
  filterRow: {
    minHeight: 34,
  },
  bookingFilterContent: {
    paddingRight: 0,
  },
  bookingFilterTab: {
    minHeight: 32,
    minWidth: 96,
  },
  table: {
    borderRadius: 9,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    color: designSystem.colors.subtleText,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  tableRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  guestColumn: {
    flex: 1,
    minWidth: 0,
  },
  bookingColumn: {
    flex: 1.45,
    minWidth: 0,
  },
  visitDetailColumn: {
    flex: 2.1,
    minWidth: 0,
  },
  statusColumn: {
    flexShrink: 0,
    width: 88,
  },
  actionColumn: {
    flexShrink: 0,
    width: 146,
  },
  identityCell: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  rowImage: {
    borderRadius: 8,
    height: 38,
    width: 38,
  },
  cellCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitle: {
    color: designSystem.colors.ink,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  rowMeta: {
    color: designSystem.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
  },
  rowValue: {
    color: designSystem.colors.darkGreen,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  specialRequest: {
    color: designSystem.colors.copper,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    textTransform: 'capitalize',
  },
  statusPending: {
    color: designSystem.colors.copper,
  },
  statusConfirmed: {
    color: designSystem.colors.darkGreen,
  },
  statusCancelled: {
    color: designSystem.colors.gray,
  },
  actionCell: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'flex-end',
  },
  actionButton: {
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 9,
  },
  actionButtonApprove: {
    backgroundColor: designSystem.colors.lime,
  },
  actionButtonCancel: {
    backgroundColor: designSystem.colors.scrimFaint,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonText: {
    color: designSystem.colors.mutedText,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
  },
  actionButtonTextApprove: {
    color: designSystem.colors.darkGreen,
  },
  noActionText: {
    color: designSystem.colors.gray,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    textAlign: 'right',
  },
  ratingSummary: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  ratingValue: {
    color: designSystem.colors.ink,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  ratingMeta: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryImage: {
    borderRadius: 9,
    height: 106,
    width: 136,
  },
  iconActions: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'flex-end',
  },
  iconAction: {
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  dataRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 16,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dataLabel: {
    color: designSystem.colors.subtleText,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    textTransform: 'uppercase',
    width: 148,
  },
  dataValue: {
    color: designSystem.colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  dataValueInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    minHeight: 22,
    padding: 0,
  },
  dataValueMultiline: {
    minHeight: 58,
    textAlignVertical: 'top',
  },
  selectCell: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectPill: {
    backgroundColor: designSystem.colors.scrimFaint,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 10,
  },
  selectPillActive: {
    backgroundColor: designSystem.colors.lime,
  },
  selectPillText: {
    color: designSystem.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  selectPillTextActive: {
    color: designSystem.colors.darkGreen,
  },
  mediaCell: {
    flex: 1,
    gap: 8,
  },
  mediaPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  schemaImagePreviewWrap: {
    position: 'relative',
  },
  schemaImagePreview: {
    borderRadius: 7,
    height: 48,
    width: 64,
  },
  removeImageButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.surface,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: -5,
    top: -5,
    width: 20,
  },
  cellActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  mediaLinkInput: {
    backgroundColor: designSystem.colors.scrimFaint,
    borderRadius: 8,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    minHeight: 28,
    minWidth: 220,
    paddingHorizontal: 9,
    paddingVertical: 0,
  },
  cellActionButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 10,
  },
  cellActionText: {
    color: designSystem.colors.darkGreen,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  secondaryTinyButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.scrimFaint,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 10,
  },
  secondaryTinyButtonText: {
    color: designSystem.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  coordinateCell: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  derivedLocationCell: {
    flex: 1,
    gap: 5,
  },
  derivedLocationTitle: {
    color: designSystem.colors.ink,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  derivedLocationMeta: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.scrim,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  coordinateModal: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    maxWidth: 1120,
    padding: 16,
    width: '100%',
  },
  coordinateModalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  coordinateSearchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  coordinatePickerLayout: {
    flexDirection: 'row',
    gap: 14,
    minHeight: 460,
  },
  coordinateSearchPane: {
    flexBasis: 360,
    flexGrow: 0,
    flexShrink: 0,
    gap: 10,
  },
  coordinateSearchInput: {
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    fontSize: 13,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  coordinateMapFrame: {
    borderRadius: 12,
    flex: 1,
    minHeight: 460,
    overflow: 'hidden',
  },
  coordinateMap: {
    flex: 1,
  },
  mapboxSuggestionList: {
    borderRadius: 10,
    flex: 1,
    overflow: 'hidden',
  },
  mapboxSuggestionRow: {
    backgroundColor: designSystem.colors.scrimFaint,
    borderBottomColor: designSystem.colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  derivedLocationBox: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
    padding: 12,
  },
  emptyTableRow: {
    justifyContent: 'center',
    minHeight: 72,
    paddingHorizontal: 12,
  },
  emptyText: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyDetail: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emptyTitle: {
    color: designSystem.colors.ink,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  emptyBody: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 360,
    textAlign: 'center',
  },
  importReport: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 5,
    padding: 12,
  },
  importReportTitle: {
    color: designSystem.colors.ink,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  importReportMessage: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  promptModalBackdrop: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.scrim,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  promptModal: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    maxHeight: '86%',
    maxWidth: 920,
    padding: 16,
    width: '100%',
  },
  promptModalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  promptModalTitle: {
    color: designSystem.colors.ink,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  promptTextArea: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 260,
    padding: 12,
    textAlignVertical: 'top',
  },
  pasteCompilerBox: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 12,
  },
  pasteCompilerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  jsonEditorFrame: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 220,
    overflow: 'hidden',
  },
  lineNumberGutter: {
    backgroundColor: designSystem.colors.scrimFaint,
    flexGrow: 0,
    paddingHorizontal: 8,
    paddingTop: 11,
    width: 44,
  },
  lineNumberText: {
    color: designSystem.colors.gray,
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'right',
  },
  lineNumberTextError: {
    color: designSystem.colors.copper,
  },
  jsonEditorInput: {
    flex: 1,
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 220,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  diagnosticsPanel: {
    gap: 6,
  },
  diagnosticRow: {
    alignItems: 'flex-start',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  diagnosticError: {
    backgroundColor: 'rgba(161, 75, 26, 0.14)',
  },
  diagnosticWarning: {
    backgroundColor: designSystem.colors.scrimFaint,
  },
  diagnosticInfo: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  diagnosticLine: {
    color: designSystem.colors.gray,
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    width: 34,
  },
  diagnosticMessage: {
    color: designSystem.colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  draftHeader: {
    alignItems: 'flex-start',
    borderBottomColor: designSystem.colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    padding: 16,
  },
  draftHeaderActions: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
});
