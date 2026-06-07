import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';
import { ThemedText } from '@/components/themed-text';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { ProfileSettingScreen, SettingActionButton } from '@/components/wandr/profile/profile-setting-screen';
import { designSystem } from '@/constants/design-system';
import {
  providerArchiveMyListingRef,
  providerCompleteMyBusinessSetupRef,
  providerGenerateImageUploadUrlRef,
  providerGetMyBusinessProfileRef,
  providerListMyListingsRef,
  providerListMyRequestsRef,
  providerSubmitMyExperienceForReviewRef,
  providerSubmitMyStayForReviewRef,
  providerUpdateMyRequestStatusRef,
  providerUpsertMyExperienceDraftRef,
  providerUpsertMyStayDraftRef,
} from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';

type ProviderTab = 'overview' | 'listings' | 'requests';
type ListingKind = 'experience' | 'stay';
type StayStyle = 'design' | 'lodge' | 'roadside' | 'wellness';
type RouteVibe = 'city reset' | 'coast base' | 'wildlife stop' | 'desert night';

type ExperienceFormState = {
  availabilityLabel: string;
  cancellationPolicy: string;
  category: string;
  confirmMode: string;
  contactNote: string;
  coordinate: string;
  countryCode: string;
  countryLabel: string;
  description: string;
  directPaymentNotes: string;
  durationLabel: string;
  galleryImages: string[];
  galleryPreviewUris: string[];
  galleryStorageIds: Id<'_storage'>[];
  groupCapacity: string;
  imageStorageId?: Id<'_storage'>;
  imageUri: string;
  includes: string;
  locationLabel: string;
  priceUsd: string;
  region: string;
  subtitle: string;
  title: string;
  town: string;
};

type StayFormState = {
  amenities: string;
  arrivalLabel: string;
  bedLabel: string;
  bookingNote: string;
  cancellationPolicy: string;
  contactNote: string;
  coordinate: string;
  countryCode: string;
  countryLabel: string;
  currencyCode: string;
  directPaymentNotes: string;
  galleryImages: string[];
  galleryPreviewUris: string[];
  galleryStorageIds: Id<'_storage'>[];
  idealFor: string;
  imageStorageId?: Id<'_storage'>;
  imageUri: string;
  locationLabel: string;
  maxAdults: string;
  maxChildren: string;
  maxRooms: string;
  name: string;
  nearbyHighlights: string;
  priceUsd: string;
  region: string;
  roomDetail: string;
  roomLabel: string;
  sleepSignal: string;
  summary: string;
  town: string;
};

const tabOptions: readonly { key: ProviderTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'listings', label: 'Listings' },
  { key: 'requests', label: 'Requests' },
] as const;

const stayStyleOptions: readonly { key: StayStyle; label: string }[] = [
  { key: 'lodge', label: 'Lodge' },
  { key: 'design', label: 'Hotel' },
  { key: 'roadside', label: 'Guesthouse' },
  { key: 'wellness', label: 'Wellness' },
] as const;

const routeVibeOptions: readonly { key: RouteVibe; label: string }[] = [
  { key: 'wildlife stop', label: 'Wildlife' },
  { key: 'city reset', label: 'City' },
  { key: 'coast base', label: 'Coast' },
  { key: 'desert night', label: 'Desert' },
] as const;

const DEFAULT_COORDINATE = '17.0832, -22.5597';
const MAX_GALLERY_IMAGES = 6;

const defaultExperienceForm = (): ExperienceFormState => ({
  availabilityLabel: 'Provider confirms within 24 hours',
  cancellationPolicy: '',
  category: 'Guided tour',
  confirmMode: 'Provider confirms within 24 hours',
  contactNote: '',
  coordinate: DEFAULT_COORDINATE,
  countryCode: 'NA',
  countryLabel: 'Namibia',
  description: '',
  directPaymentNotes: 'Cash on arrival or direct transfer with the provider.',
  durationLabel: '',
  galleryImages: [],
  galleryPreviewUris: [],
  galleryStorageIds: [],
  groupCapacity: '8',
  imageStorageId: undefined,
  imageUri: '',
  includes: '',
  locationLabel: '',
  priceUsd: '',
  region: '',
  subtitle: '',
  title: '',
  town: '',
});

const defaultStayForm = (): StayFormState => ({
  amenities: '',
  arrivalLabel: '15:00 - 20:00',
  bedLabel: 'Queen bed',
  bookingNote: '',
  cancellationPolicy: '',
  contactNote: '',
  coordinate: DEFAULT_COORDINATE,
  countryCode: 'NA',
  countryLabel: 'Namibia',
  currencyCode: 'USD',
  directPaymentNotes: 'Cash on arrival or direct transfer with the property.',
  galleryImages: [],
  galleryPreviewUris: [],
  galleryStorageIds: [],
  idealFor: '',
  imageStorageId: undefined,
  imageUri: '',
  locationLabel: '',
  maxAdults: '2',
  maxChildren: '1',
  maxRooms: '4',
  name: '',
  nearbyHighlights: '',
  priceUsd: '',
  region: '',
  roomDetail: '',
  roomLabel: 'Standard room',
  sleepSignal: '',
  summary: '',
  town: '',
});

const defaultBusinessSetupForm = {
  businessName: '',
  contactEmail: '',
  contactName: '',
  contactPhone: '',
  directPaymentNotes: 'Guests can pay cash or arrange bank transfer directly.',
};

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function parseCoordinate(value: string) {
  const [lng, lat] = value
    .split(',')
    .map((part) => Number(part.trim()));

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new Error('Use coordinates like 17.0832, -22.5597.');
  }

  return [lng, lat];
}

function formatCoordinate(value?: readonly number[]) {
  return value && value.length >= 2 ? `${value[0]}, ${value[1]}` : DEFAULT_COORDINATE;
}

function getAllowedKinds(providerType: string | undefined): ListingKind[] {
  if (providerType === 'experiences') return ['experience'];
  if (providerType === 'stays') return ['stay'];
  return ['experience', 'stay'];
}

function getListingKindOptions(providerType: string | undefined) {
  return getAllowedKinds(providerType).map((kind) => ({
    key: kind,
    label: kind === 'experience' ? 'Experience' : 'Stay',
  }));
}

function getGalleryPreviews(form: { galleryImages: string[]; galleryPreviewUris: string[] }) {
  return Array.from(new Set([...form.galleryPreviewUris, ...form.galleryImages])).slice(0, MAX_GALLERY_IMAGES);
}

export function ProviderBusinessScreen() {
  const { isLoading, session } = useAuthSession();
  const [activeTab, setActiveTab] = useState<ProviderTab>('overview');
  const [listingKind, setListingKind] = useState<ListingKind>('experience');
  const [experienceId, setExperienceId] = useState<Id<'experiences'> | undefined>();
  const [stayId, setStayId] = useState<Id<'stays'> | undefined>();
  const [experienceForm, setExperienceForm] = useState<ExperienceFormState>(() => defaultExperienceForm());
  const [stayForm, setStayForm] = useState<StayFormState>(() => defaultStayForm());
  const [businessSetupForm, setBusinessSetupForm] = useState(defaultBusinessSetupForm);
  const [stayStyle, setStayStyle] = useState<StayStyle>('lodge');
  const [routeVibe, setRouteVibe] = useState<RouteVibe>('wildlife stop');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const loadedBusinessSetupKeyRef = useRef<string | null>(null);

  const canOpenBusiness = session?.role === 'serviceProvider';
  const profile = useQuery(providerGetMyBusinessProfileRef, canOpenBusiness ? {} : 'skip');
  const canLoadProviderData = Boolean(profile && profile.status === 'active');
  const listings = useQuery(providerListMyListingsRef, canLoadProviderData ? {} : 'skip');
  const requests = useQuery(providerListMyRequestsRef, canLoadProviderData ? { status: 'all' } : 'skip');
  const completeBusinessSetup = useMutation(providerCompleteMyBusinessSetupRef);
  const generateUploadUrl = useMutation(providerGenerateImageUploadUrlRef);
  const upsertExperience = useMutation(providerUpsertMyExperienceDraftRef);
  const submitExperience = useMutation(providerSubmitMyExperienceForReviewRef);
  const upsertStay = useMutation(providerUpsertMyStayDraftRef);
  const submitStay = useMutation(providerSubmitMyStayForReviewRef);
  const updateRequestStatus = useMutation(providerUpdateMyRequestStatusRef);
  const archiveListing = useMutation(providerArchiveMyListingRef);

  const allowedKinds = useMemo(() => getAllowedKinds(profile?.providerType), [profile?.providerType]);
  const listingKindOptions = useMemo(() => getListingKindOptions(profile?.providerType), [profile?.providerType]);

  useEffect(() => {
    if (!allowedKinds.includes(listingKind)) {
      setListingKind(allowedKinds[0] ?? 'experience');
    }
  }, [allowedKinds, listingKind]);

  useEffect(() => {
    if (!profile) {
      loadedBusinessSetupKeyRef.current = null;
      return;
    }

    const setupKey = `${profile._id}:${profile.updatedAt ?? profile.status}`;
    if (loadedBusinessSetupKeyRef.current === setupKey) {
      return;
    }
    loadedBusinessSetupKeyRef.current = setupKey;

    setBusinessSetupForm({
      businessName: profile.businessName ?? '',
      contactEmail: profile.contactEmail ?? session?.email ?? '',
      contactName: profile.contactName ?? session?.name ?? '',
      contactPhone: profile.contactPhone ?? '',
      directPaymentNotes: profile.directPaymentNotes ?? defaultBusinessSetupForm.directPaymentNotes,
    });
  }, [profile, session?.email, session?.name]);

  function updateBusinessSetupField(field: keyof typeof defaultBusinessSetupForm, value: string) {
    setBusinessSetupForm((current) => ({ ...current, [field]: value }));
  }

  function updateExperienceField<Key extends keyof ExperienceFormState>(field: Key, value: ExperienceFormState[Key]) {
    setExperienceForm((current) => ({ ...current, [field]: value }));
  }

  function updateStayField<Key extends keyof StayFormState>(field: Key, value: StayFormState[Key]) {
    setStayForm((current) => ({ ...current, [field]: value }));
  }

  async function uploadPickedAsset(asset: ImagePicker.ImagePickerAsset) {
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': asset.mimeType ?? blob.type ?? 'image/jpeg' },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('The image could not be uploaded.');
    }

    const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
    return storageId;
  }

  async function pickListingImages(target: 'experienceCover' | 'experienceGallery' | 'stayCover' | 'stayGallery') {
    const isGallery = target.endsWith('Gallery');
    setBusyAction(`upload:${target}`);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Allow photo access to upload images.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: isGallery,
        exif: false,
        mediaTypes: ['images'],
        quality: 0.88,
        selectionLimit: isGallery ? MAX_GALLERY_IMAGES : 1,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const assets = isGallery ? result.assets.slice(0, MAX_GALLERY_IMAGES) : result.assets.slice(0, 1);
      const storageIds = await Promise.all(assets.map(uploadPickedAsset));
      const previewUris = assets.map((asset) => asset.uri);

      if (target === 'experienceCover') {
        setExperienceForm((current) => ({ ...current, imageStorageId: storageIds[0], imageUri: previewUris[0] ?? current.imageUri }));
      }
      if (target === 'stayCover') {
        setStayForm((current) => ({ ...current, imageStorageId: storageIds[0], imageUri: previewUris[0] ?? current.imageUri }));
      }
      if (target === 'experienceGallery') {
        setExperienceForm((current) => ({
          ...current,
          galleryPreviewUris: [...current.galleryPreviewUris, ...previewUris].slice(0, MAX_GALLERY_IMAGES),
          galleryStorageIds: [...current.galleryStorageIds, ...storageIds].slice(0, MAX_GALLERY_IMAGES),
        }));
      }
      if (target === 'stayGallery') {
        setStayForm((current) => ({
          ...current,
          galleryPreviewUris: [...current.galleryPreviewUris, ...previewUris].slice(0, MAX_GALLERY_IMAGES),
          galleryStorageIds: [...current.galleryStorageIds, ...storageIds].slice(0, MAX_GALLERY_IMAGES),
        }));
      }
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyAction(null);
    }
  }

  async function finishBusinessSetup() {
    setBusyAction('completeBusinessSetup');
    try {
      await completeBusinessSetup({
        acceptedPaymentModes: ['cash'],
        businessName: businessSetupForm.businessName,
        contactEmail: businessSetupForm.contactEmail || undefined,
        contactName: businessSetupForm.contactName || undefined,
        contactPhone: businessSetupForm.contactPhone || undefined,
        directPaymentNotes: businessSetupForm.directPaymentNotes || undefined,
      });
      Alert.alert('Saved', 'Business setup is complete.');
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyAction(null);
    }
  }

  async function saveExperience(shouldSubmit: boolean) {
    if (shouldSubmit && !experienceForm.imageStorageId && !experienceForm.imageUri.trim()) {
      Alert.alert('Cover image needed', 'Upload a cover image before submitting.');
      return;
    }

    setBusyAction(shouldSubmit ? 'submitExperience' : 'saveExperience');
    try {
      const saved = await upsertExperience({
        experienceId,
        title: experienceForm.title,
        subtitle: experienceForm.subtitle || undefined,
        description: experienceForm.description || undefined,
        category: experienceForm.category || undefined,
        durationLabel: experienceForm.durationLabel || undefined,
        groupCapacity: parsePositiveNumber(experienceForm.groupCapacity, 1),
        priceUsd: parsePositiveNumber(experienceForm.priceUsd),
        locationLabel: experienceForm.locationLabel,
        town: experienceForm.town || undefined,
        region: experienceForm.region,
        countryCode: experienceForm.countryCode || undefined,
        countryLabel: experienceForm.countryLabel || undefined,
        coordinate: parseCoordinate(experienceForm.coordinate),
        imageStorageId: experienceForm.imageStorageId,
        imageUri: experienceForm.imageStorageId ? undefined : experienceForm.imageUri || undefined,
        galleryImages: experienceForm.galleryImages,
        galleryStorageIds: experienceForm.galleryStorageIds,
        availabilityLabel: experienceForm.availabilityLabel || undefined,
        confirmMode: experienceForm.confirmMode || undefined,
        includes: splitList(experienceForm.includes),
        acceptedPaymentModes: ['cash'],
        directPaymentNotes: experienceForm.directPaymentNotes || undefined,
        cancellationPolicy: experienceForm.cancellationPolicy || undefined,
        contactNote: experienceForm.contactNote || undefined,
      });
      setExperienceId(saved.experienceId as Id<'experiences'>);
      if (shouldSubmit) {
        await submitExperience({ experienceId: saved.experienceId as Id<'experiences'> });
      }
      Alert.alert('Saved', shouldSubmit ? 'Submitted for review.' : 'Draft saved.');
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyAction(null);
    }
  }

  async function saveStay(shouldSubmit: boolean) {
    if (shouldSubmit && !stayForm.imageStorageId && !stayForm.imageUri.trim()) {
      Alert.alert('Cover image needed', 'Upload a cover image before submitting.');
      return;
    }

    setBusyAction(shouldSubmit ? 'submitStay' : 'saveStay');
    try {
      const roomOptionId = 'standard-room';
      const arrivalOptionId = 'main-arrival';
      const saved = await upsertStay({
        stayId,
        name: stayForm.name,
        locationLabel: stayForm.locationLabel,
        town: stayForm.town,
        region: stayForm.region,
        countryCode: stayForm.countryCode || undefined,
        countryLabel: stayForm.countryLabel || undefined,
        summary: stayForm.summary || undefined,
        coordinate: parseCoordinate(stayForm.coordinate),
        imageStorageId: stayForm.imageStorageId,
        imageUri: stayForm.imageStorageId ? undefined : stayForm.imageUri || undefined,
        galleryImages: stayForm.galleryImages,
        galleryStorageIds: stayForm.galleryStorageIds,
        priceUsd: parsePositiveNumber(stayForm.priceUsd),
        currencyCode: stayForm.currencyCode || 'USD',
        bookingNote: stayForm.bookingNote || undefined,
        stayStyle,
        routeVibe,
        sleepSignal: stayForm.sleepSignal || undefined,
        idealFor: splitList(stayForm.idealFor),
        amenities: splitList(stayForm.amenities),
        nearbyHighlights: splitList(stayForm.nearbyHighlights),
        bookingProfile: {
          roomOptions: [
            {
              id: roomOptionId,
              label: stayForm.roomLabel || 'Standard room',
              detail: stayForm.roomDetail || stayForm.summary || 'Room',
              maxAdults: Math.max(1, Math.round(parsePositiveNumber(stayForm.maxAdults, 2))),
              maxChildren: Math.round(parsePositiveNumber(stayForm.maxChildren, 0)),
              maxRooms: Math.max(1, Math.round(parsePositiveNumber(stayForm.maxRooms, 1))),
              bedOptions: [{ id: 'main-bed', label: stayForm.bedLabel || 'Bed' }],
            },
          ],
          arrivalOptions: [{ id: arrivalOptionId, label: stayForm.arrivalLabel || 'Flexible arrival' }],
          defaultRoomOptionId: roomOptionId,
          defaultArrivalOptionId: arrivalOptionId,
        },
        acceptedPaymentModes: ['cash'],
        directPaymentNotes: stayForm.directPaymentNotes || undefined,
        cancellationPolicy: stayForm.cancellationPolicy || undefined,
        contactNote: stayForm.contactNote || undefined,
      });
      setStayId(saved.stayId as Id<'stays'>);
      if (shouldSubmit) {
        await submitStay({ stayId: saved.stayId as Id<'stays'> });
      }
      Alert.alert('Saved', shouldSubmit ? 'Submitted for review.' : 'Draft saved.');
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyAction(null);
    }
  }

  async function updateRequest(request: any, status: 'confirmed' | 'cancelled') {
    setBusyAction(request._id);
    try {
      await updateRequestStatus({
        requestId: request._id as Id<'bookings'> | Id<'reservations'>,
        source: request.source,
        status,
      });
    } catch (error) {
      Alert.alert('Request update failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyAction(null);
    }
  }

  async function archive(kind: ListingKind, id: Id<'experiences'> | Id<'stays'>) {
    setBusyAction(id);
    try {
      await archiveListing({ kind, id });
    } catch (error) {
      Alert.alert('Archive failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyAction(null);
    }
  }

  function resetListingForm(kind: ListingKind) {
    if (kind === 'experience') {
      setExperienceId(undefined);
      setExperienceForm(defaultExperienceForm());
    } else {
      setStayId(undefined);
      setStayForm(defaultStayForm());
      setStayStyle('lodge');
      setRouteVibe('wildlife stop');
    }
    setListingKind(kind);
  }

  function editListing(listing: any) {
    setListingKind(listing.kind);
    setActiveTab('listings');
    if (listing.kind === 'experience') {
      setExperienceId(listing._id as Id<'experiences'>);
      setExperienceForm({
        availabilityLabel: listing.availabilityLabel ?? '',
        cancellationPolicy: listing.cancellationPolicy ?? '',
        category: listing.category ?? 'Guided tour',
        confirmMode: listing.confirmMode ?? defaultExperienceForm().confirmMode,
        contactNote: listing.contactNote ?? '',
        coordinate: formatCoordinate(listing.coordinate),
        countryCode: listing.countryCode ?? 'NA',
        countryLabel: listing.countryLabel ?? 'Namibia',
        description: listing.description ?? '',
        directPaymentNotes: listing.directPaymentNotes ?? defaultExperienceForm().directPaymentNotes,
        durationLabel: listing.durationLabel ?? '',
        galleryImages: listing.galleryStorageIds?.length ? [] : listing.galleryImages ?? [],
        galleryPreviewUris: listing.galleryImages ?? [],
        galleryStorageIds: listing.galleryStorageIds ?? [],
        groupCapacity: String(listing.groupCapacity ?? 8),
        imageStorageId: listing.imageStorageId ?? undefined,
        imageUri: listing.imageUri ?? '',
        includes: (listing.includes ?? []).join('\n'),
        locationLabel: listing.locationLabel ?? '',
        priceUsd: String(listing.priceUsd ?? ''),
        region: listing.region ?? '',
        subtitle: listing.subtitle ?? '',
        title: listing.title ?? '',
        town: listing.town ?? '',
      });
      return;
    }

    const room = listing.bookingProfile?.roomOptions?.[0];
    const arrival = listing.bookingProfile?.arrivalOptions?.[0];
    setStayId(listing._id as Id<'stays'>);
    setStayStyle(listing.stayStyle ?? 'lodge');
    setRouteVibe(listing.routeVibe ?? 'wildlife stop');
    setStayForm({
      amenities: (listing.amenities ?? []).join('\n'),
      arrivalLabel: arrival?.label ?? '15:00 - 20:00',
      bedLabel: room?.bedOptions?.[0]?.label ?? 'Queen bed',
      bookingNote: listing.bookingNote ?? '',
      cancellationPolicy: listing.cancellationPolicy ?? '',
      contactNote: listing.contactNote ?? '',
      coordinate: formatCoordinate(listing.coordinate),
      countryCode: listing.countryCode ?? 'NA',
      countryLabel: listing.countryLabel ?? 'Namibia',
      currencyCode: listing.currencyCode ?? 'USD',
      directPaymentNotes: listing.directPaymentNotes ?? defaultStayForm().directPaymentNotes,
      galleryImages: listing.galleryStorageIds?.length ? [] : listing.galleryImages ?? [],
      galleryPreviewUris: listing.galleryImages ?? [],
      galleryStorageIds: listing.galleryStorageIds ?? [],
      idealFor: (listing.idealFor ?? []).join('\n'),
      imageStorageId: listing.imageStorageId ?? undefined,
      imageUri: listing.imageUri ?? '',
      locationLabel: listing.locationLabel ?? '',
      maxAdults: String(room?.maxAdults ?? 2),
      maxChildren: String(room?.maxChildren ?? 1),
      maxRooms: String(room?.maxRooms ?? 4),
      name: listing.name ?? listing.title ?? '',
      nearbyHighlights: (listing.nearbyHighlights ?? []).join('\n'),
      priceUsd: String(listing.priceUsd ?? ''),
      region: listing.region ?? '',
      roomDetail: room?.detail ?? '',
      roomLabel: room?.label ?? 'Standard room',
      sleepSignal: listing.sleepSignal ?? '',
      summary: listing.summary ?? '',
      town: listing.town ?? '',
    });
  }

  if (isLoading) {
    return <LoadingBusinessScreen />;
  }

  if (!session || !canOpenBusiness) {
    return (
      <ProfileSettingScreen title="My business" presentation="plain">
        <PanelState icon="lock-outline" title="Invite required" body="An admin needs to invite this account first." />
      </ProfileSettingScreen>
    );
  }

  if (profile === undefined) {
    return <LoadingBusinessScreen />;
  }

  if (!profile) {
    return (
      <ProfileSettingScreen title="My business" presentation="plain">
        <PanelState icon="storefront-outline" title="No business yet" body="Ask an admin to invite this account as a provider." />
      </ProfileSettingScreen>
    );
  }

  const setupPending = profile.status === 'invited';
  const suspended = profile.status === 'suspended';

  return (
    <ProfileSettingScreen title="My business" presentation="plain">
      <View style={styles.stack}>
        <BusinessHeader profile={profile} />
        {setupPending ? (
          <BusinessSetupForm
            busy={busyAction === 'completeBusinessSetup'}
            form={businessSetupForm}
            onFieldChange={updateBusinessSetupField}
            onSubmit={finishBusinessSetup}
          />
        ) : suspended ? (
          <PanelState icon="pause-circle-outline" title="Business suspended" body="Contact an admin before editing listings." />
        ) : (
          <>
            <SegmentedTabs options={tabOptions} value={activeTab} onChange={setActiveTab} />
            {activeTab === 'overview' ? (
              <OverviewTab
                busyAction={busyAction}
                listings={listings}
                onArchive={archive}
                onEdit={editListing}
                profile={profile}
                requests={requests}
              />
            ) : null}
            {activeTab === 'listings' ? (
              <ListingsTab
                busyAction={busyAction}
                experienceForm={experienceForm}
                experienceId={experienceId}
                listingKind={listingKind}
                listingKindOptions={listingKindOptions}
                listings={listings}
                onArchive={archive}
                onEdit={editListing}
                onExperienceFieldChange={updateExperienceField}
                onKindChange={setListingKind}
                onNew={resetListingForm}
                onPickImage={pickListingImages}
                onSaveExperience={saveExperience}
                onSaveStay={saveStay}
                onStayFieldChange={updateStayField}
                routeVibe={routeVibe}
                stayForm={stayForm}
                stayId={stayId}
                stayStyle={stayStyle}
                onRouteVibeChange={setRouteVibe}
                onStayStyleChange={setStayStyle}
              />
            ) : null}
            {activeTab === 'requests' ? (
              <RequestsTab
                busyAction={busyAction}
                requests={requests}
                onCancel={(request) => updateRequest(request, 'cancelled')}
                onConfirm={(request) => updateRequest(request, 'confirmed')}
              />
            ) : null}
          </>
        )}
      </View>
    </ProfileSettingScreen>
  );
}

function LoadingBusinessScreen() {
  return (
    <ProfileSettingScreen title="My business" presentation="plain">
      <View style={styles.loadingPanel}>
        <ActivityIndicator color={designSystem.colors.lime} />
      </View>
    </ProfileSettingScreen>
  );
}

function BusinessHeader({ profile }: { profile: any }) {
  return (
    <View style={styles.headerPanel}>
      <View style={styles.headerIcon}>
        <MaterialCommunityIcons name="storefront-outline" color={designSystem.colors.darkGreen} size={22} />
      </View>
      <View style={styles.flexText}>
        <ThemedText style={styles.businessName}>{profile.businessName}</ThemedText>
        <ThemedText style={styles.metaText}>
          {profile.providerType} - {profile.status} - payments: {(profile.acceptedPaymentModes ?? ['cash']).join(', ')}
        </ThemedText>
      </View>
    </View>
  );
}

function BusinessSetupForm({
  busy,
  form,
  onFieldChange,
  onSubmit,
}: {
  busy: boolean;
  form: typeof defaultBusinessSetupForm;
  onFieldChange: (field: keyof typeof defaultBusinessSetupForm, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.stack}>
      <FormSection title="Business setup">
        <Field label="Business name" value={form.businessName} onChangeText={(value) => onFieldChange('businessName', value)} />
        <Field label="Contact name" value={form.contactName} onChangeText={(value) => onFieldChange('contactName', value)} />
        <Field label="Contact email" value={form.contactEmail} onChangeText={(value) => onFieldChange('contactEmail', value)} />
        <Field label="Phone" value={form.contactPhone} onChangeText={(value) => onFieldChange('contactPhone', value)} />
        <Field label="Payment note" multiline value={form.directPaymentNotes} onChangeText={(value) => onFieldChange('directPaymentNotes', value)} />
      </FormSection>
      <View style={styles.formActions}>
        <SettingActionButton disabled={busy} label={busy ? 'Saving...' : 'Finish setup'} onPress={onSubmit} />
      </View>
    </View>
  );
}

function OverviewTab({
  busyAction,
  listings,
  onArchive,
  onEdit,
  profile,
  requests,
}: {
  busyAction: string | null;
  listings: any;
  onArchive: (kind: ListingKind, id: Id<'experiences'> | Id<'stays'>) => void;
  onEdit: (listing: any) => void;
  profile: any;
  requests: any[] | undefined;
}) {
  const experiences = listings?.experiences ?? [];
  const stays = listings?.stays ?? [];
  const pendingRequests = (requests ?? []).filter((request) => request.status === 'pending').length;
  const confirmedRevenue = (requests ?? [])
    .filter((request) => request.status === 'confirmed')
    .reduce((total, request) => total + (typeof request.totalPrice === 'number' ? request.totalPrice : 0), 0);

  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        <Metric label="Listings" value={String(experiences.length + stays.length)} />
        <Metric label="Pending" value={String(pendingRequests)} />
        <Metric label="Tracked cash" value={`$${confirmedRevenue}`} />
      </View>
      {profile.directPaymentNotes ? <PanelState icon="cash" title="Payment note" body={profile.directPaymentNotes} /> : null}
      {listings === undefined ? (
        <LoadingRows />
      ) : experiences.length + stays.length === 0 ? (
        <PanelState icon="playlist-plus" title="No listings yet" body="Create a listing, then submit it for review." />
      ) : (
        <View style={styles.stack}>
          {[...experiences, ...stays].slice(0, 4).map((listing) => (
            <ListingRow
              busy={busyAction === listing._id}
              key={`${listing.kind}-${listing._id}`}
              listing={listing}
              onArchive={() => onArchive(listing.kind, listing._id)}
              onEdit={() => onEdit(listing)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ListingsTab({
  busyAction,
  experienceForm,
  experienceId,
  listingKind,
  listingKindOptions,
  listings,
  onArchive,
  onEdit,
  onExperienceFieldChange,
  onKindChange,
  onNew,
  onPickImage,
  onRouteVibeChange,
  onSaveExperience,
  onSaveStay,
  onStayFieldChange,
  onStayStyleChange,
  routeVibe,
  stayForm,
  stayId,
  stayStyle,
}: {
  busyAction: string | null;
  experienceForm: ExperienceFormState;
  experienceId?: Id<'experiences'>;
  listingKind: ListingKind;
  listingKindOptions: readonly { key: ListingKind; label: string }[];
  listings: any;
  onArchive: (kind: ListingKind, id: Id<'experiences'> | Id<'stays'>) => void;
  onEdit: (listing: any) => void;
  onExperienceFieldChange: <Key extends keyof ExperienceFormState>(field: Key, value: ExperienceFormState[Key]) => void;
  onKindChange: (kind: ListingKind) => void;
  onNew: (kind: ListingKind) => void;
  onPickImage: (target: 'experienceCover' | 'experienceGallery' | 'stayCover' | 'stayGallery') => void;
  onRouteVibeChange: (value: RouteVibe) => void;
  onSaveExperience: (shouldSubmit: boolean) => void;
  onSaveStay: (shouldSubmit: boolean) => void;
  onStayFieldChange: <Key extends keyof StayFormState>(field: Key, value: StayFormState[Key]) => void;
  onStayStyleChange: (value: StayStyle) => void;
  routeVibe: RouteVibe;
  stayForm: StayFormState;
  stayId?: Id<'stays'>;
  stayStyle: StayStyle;
}) {
  const rows = listingKind === 'experience' ? listings?.experiences ?? [] : listings?.stays ?? [];

  return (
    <View style={styles.stack}>
      <View style={styles.toolbar}>
        <SegmentedTabs options={listingKindOptions} value={listingKind} onChange={onKindChange} />
        <SettingActionButton label="New" onPress={() => onNew(listingKind)} variant="secondary" />
      </View>
      {listings === undefined ? (
        <LoadingRows />
      ) : rows.length > 0 ? (
        <View style={styles.stack}>
          {rows.map((listing: any) => (
            <ListingRow
              busy={busyAction === listing._id}
              key={`${listing.kind}-${listing._id}`}
              listing={listing}
              onArchive={() => onArchive(listing.kind, listing._id)}
              onEdit={() => onEdit(listing)}
            />
          ))}
        </View>
      ) : (
        <PanelState icon="playlist-plus" title="No listings" body="Create a draft below." />
      )}

      {listingKind === 'experience' ? (
        <ExperienceEditor
          busyAction={busyAction}
          form={experienceForm}
          isEditing={Boolean(experienceId)}
          onFieldChange={onExperienceFieldChange}
          onPickCover={() => onPickImage('experienceCover')}
          onPickGallery={() => onPickImage('experienceGallery')}
          onSave={() => onSaveExperience(false)}
          onSubmit={() => onSaveExperience(true)}
        />
      ) : (
        <StayEditor
          busyAction={busyAction}
          form={stayForm}
          isEditing={Boolean(stayId)}
          onFieldChange={onStayFieldChange}
          onPickCover={() => onPickImage('stayCover')}
          onPickGallery={() => onPickImage('stayGallery')}
          onRouteVibeChange={onRouteVibeChange}
          onSave={() => onSaveStay(false)}
          onStayStyleChange={onStayStyleChange}
          onSubmit={() => onSaveStay(true)}
          routeVibe={routeVibe}
          stayStyle={stayStyle}
        />
      )}
    </View>
  );
}

function ExperienceEditor({
  busyAction,
  form,
  isEditing,
  onFieldChange,
  onPickCover,
  onPickGallery,
  onSave,
  onSubmit,
}: {
  busyAction: string | null;
  form: ExperienceFormState;
  isEditing: boolean;
  onFieldChange: <Key extends keyof ExperienceFormState>(field: Key, value: ExperienceFormState[Key]) => void;
  onPickCover: () => void;
  onPickGallery: () => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  const busy = busyAction === 'saveExperience' || busyAction === 'submitExperience';

  return (
    <EditorPanel title={isEditing ? 'Edit experience' : 'New experience'}>
      <FormSection title="Basics">
        <Field label="Title" value={form.title} onChangeText={(value) => onFieldChange('title', value)} />
        <Field label="Short line" value={form.subtitle} onChangeText={(value) => onFieldChange('subtitle', value)} />
        <Field label="Description" multiline value={form.description} onChangeText={(value) => onFieldChange('description', value)} />
        <Field label="Category" value={form.category} onChangeText={(value) => onFieldChange('category', value)} />
      </FormSection>
      <FormSection title="Location">
        <Field label="Location label" value={form.locationLabel} onChangeText={(value) => onFieldChange('locationLabel', value)} />
        <Field label="Town" value={form.town} onChangeText={(value) => onFieldChange('town', value)} />
        <Field label="Region" value={form.region} onChangeText={(value) => onFieldChange('region', value)} />
        <Field label="Coordinates" placeholder={DEFAULT_COORDINATE} value={form.coordinate} onChangeText={(value) => onFieldChange('coordinate', value)} />
      </FormSection>
      <PhotoPicker
        coverUri={form.imageUri}
        galleryUris={getGalleryPreviews(form)}
        isUploading={busyAction?.startsWith('upload:experience') ?? false}
        onPickCover={onPickCover}
        onPickGallery={onPickGallery}
      />
      <FormSection title="Booking">
        <Field label="Duration" value={form.durationLabel} onChangeText={(value) => onFieldChange('durationLabel', value)} />
        <Field keyboardType="numeric" label="Group size" value={form.groupCapacity} onChangeText={(value) => onFieldChange('groupCapacity', value)} />
        <Field keyboardType="numeric" label="Price USD" value={form.priceUsd} onChangeText={(value) => onFieldChange('priceUsd', value)} />
        <Field label="Availability" value={form.availabilityLabel} onChangeText={(value) => onFieldChange('availabilityLabel', value)} />
        <Field label="Confirmation" value={form.confirmMode} onChangeText={(value) => onFieldChange('confirmMode', value)} />
        <Field label="Included items" multiline value={form.includes} onChangeText={(value) => onFieldChange('includes', value)} />
      </FormSection>
      <FormSection title="Notes">
        <Field label="Payment note" multiline value={form.directPaymentNotes} onChangeText={(value) => onFieldChange('directPaymentNotes', value)} />
        <Field label="Cancellation" multiline value={form.cancellationPolicy} onChangeText={(value) => onFieldChange('cancellationPolicy', value)} />
        <Field label="Contact note" multiline value={form.contactNote} onChangeText={(value) => onFieldChange('contactNote', value)} />
      </FormSection>
      <FormActions busy={busy} onSave={onSave} onSubmit={onSubmit} />
    </EditorPanel>
  );
}

function StayEditor({
  busyAction,
  form,
  isEditing,
  onFieldChange,
  onPickCover,
  onPickGallery,
  onRouteVibeChange,
  onSave,
  onStayStyleChange,
  onSubmit,
  routeVibe,
  stayStyle,
}: {
  busyAction: string | null;
  form: StayFormState;
  isEditing: boolean;
  onFieldChange: <Key extends keyof StayFormState>(field: Key, value: StayFormState[Key]) => void;
  onPickCover: () => void;
  onPickGallery: () => void;
  onRouteVibeChange: (value: RouteVibe) => void;
  onSave: () => void;
  onStayStyleChange: (value: StayStyle) => void;
  onSubmit: () => void;
  routeVibe: RouteVibe;
  stayStyle: StayStyle;
}) {
  const busy = busyAction === 'saveStay' || busyAction === 'submitStay';

  return (
    <EditorPanel title={isEditing ? 'Edit stay' : 'New stay'}>
      <FormSection title="Property">
        <Field label="Property name" value={form.name} onChangeText={(value) => onFieldChange('name', value)} />
        <Field label="Summary" multiline value={form.summary} onChangeText={(value) => onFieldChange('summary', value)} />
        <SegmentedTabs options={stayStyleOptions} value={stayStyle} onChange={onStayStyleChange} />
        <SegmentedTabs options={routeVibeOptions} value={routeVibe} onChange={onRouteVibeChange} />
      </FormSection>
      <FormSection title="Location">
        <Field label="Location label" value={form.locationLabel} onChangeText={(value) => onFieldChange('locationLabel', value)} />
        <Field label="Town" value={form.town} onChangeText={(value) => onFieldChange('town', value)} />
        <Field label="Region" value={form.region} onChangeText={(value) => onFieldChange('region', value)} />
        <Field label="Coordinates" placeholder={DEFAULT_COORDINATE} value={form.coordinate} onChangeText={(value) => onFieldChange('coordinate', value)} />
      </FormSection>
      <PhotoPicker
        coverUri={form.imageUri}
        galleryUris={getGalleryPreviews(form)}
        isUploading={busyAction?.startsWith('upload:stay') ?? false}
        onPickCover={onPickCover}
        onPickGallery={onPickGallery}
      />
      <FormSection title="Rooms">
        <Field label="Room type" value={form.roomLabel} onChangeText={(value) => onFieldChange('roomLabel', value)} />
        <Field label="Room detail" value={form.roomDetail} onChangeText={(value) => onFieldChange('roomDetail', value)} />
        <Field keyboardType="numeric" label="Max rooms" value={form.maxRooms} onChangeText={(value) => onFieldChange('maxRooms', value)} />
        <Field keyboardType="numeric" label="Adults" value={form.maxAdults} onChangeText={(value) => onFieldChange('maxAdults', value)} />
        <Field keyboardType="numeric" label="Children" value={form.maxChildren} onChangeText={(value) => onFieldChange('maxChildren', value)} />
        <Field label="Beds" value={form.bedLabel} onChangeText={(value) => onFieldChange('bedLabel', value)} />
        <Field label="Arrival window" value={form.arrivalLabel} onChangeText={(value) => onFieldChange('arrivalLabel', value)} />
      </FormSection>
      <FormSection title="Pricing and details">
        <Field keyboardType="numeric" label="Nightly price" value={form.priceUsd} onChangeText={(value) => onFieldChange('priceUsd', value)} />
        <Field label="Currency" value={form.currencyCode} onChangeText={(value) => onFieldChange('currencyCode', value)} />
        <Field label="Booking note" multiline value={form.bookingNote} onChangeText={(value) => onFieldChange('bookingNote', value)} />
        <Field label="Sleep signal" value={form.sleepSignal} onChangeText={(value) => onFieldChange('sleepSignal', value)} />
        <Field label="Ideal for" multiline value={form.idealFor} onChangeText={(value) => onFieldChange('idealFor', value)} />
        <Field label="Amenities" multiline value={form.amenities} onChangeText={(value) => onFieldChange('amenities', value)} />
        <Field label="Nearby" multiline value={form.nearbyHighlights} onChangeText={(value) => onFieldChange('nearbyHighlights', value)} />
      </FormSection>
      <FormSection title="Notes">
        <Field label="Payment note" multiline value={form.directPaymentNotes} onChangeText={(value) => onFieldChange('directPaymentNotes', value)} />
        <Field label="Cancellation" multiline value={form.cancellationPolicy} onChangeText={(value) => onFieldChange('cancellationPolicy', value)} />
        <Field label="Contact note" multiline value={form.contactNote} onChangeText={(value) => onFieldChange('contactNote', value)} />
      </FormSection>
      <FormActions busy={busy} onSave={onSave} onSubmit={onSubmit} />
    </EditorPanel>
  );
}

function PhotoPicker({
  coverUri,
  galleryUris,
  isUploading,
  onPickCover,
  onPickGallery,
}: {
  coverUri: string;
  galleryUris: string[];
  isUploading: boolean;
  onPickCover: () => void;
  onPickGallery: () => void;
}) {
  return (
    <FormSection title="Photos">
      <View style={styles.photoActions}>
        <Pressable accessibilityRole="button" disabled={isUploading} onPress={onPickCover} style={styles.uploadButton}>
          <MaterialCommunityIcons name="image-plus" color={designSystem.colors.darkGreen} size={17} />
          <ThemedText style={styles.uploadButtonText}>{isUploading ? 'Uploading...' : 'Cover'}</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isUploading} onPress={onPickGallery} style={styles.uploadButtonSecondary}>
          <MaterialCommunityIcons name="image-multiple-outline" color={businessColors.text} size={17} />
          <ThemedText style={styles.uploadButtonSecondaryText}>Gallery</ThemedText>
        </Pressable>
      </View>
      <View style={styles.coverFrame}>
        {coverUri ? (
          <ExpoImage source={{ uri: coverUri }} style={styles.coverImage} contentFit="cover" />
        ) : (
          <View style={styles.coverEmpty}>
            <MaterialCommunityIcons name="image-outline" color={businessColors.textSubtle} size={26} />
          </View>
        )}
      </View>
      {galleryUris.length > 0 ? (
        <View style={styles.galleryStrip}>
          {galleryUris.map((uri) => (
            <ExpoImage key={uri} source={{ uri }} style={styles.galleryThumb} contentFit="cover" />
          ))}
        </View>
      ) : null}
    </FormSection>
  );
}

function RequestsTab({
  busyAction,
  onCancel,
  onConfirm,
  requests,
}: {
  busyAction: string | null;
  onCancel: (request: any) => void;
  onConfirm: (request: any) => void;
  requests: any[] | undefined;
}) {
  if (requests === undefined) {
    return <LoadingRows />;
  }

  if (requests.length === 0) {
    return <PanelState icon="calendar-blank-outline" title="No requests" body="Guest booking requests will show here." />;
  }

  return (
    <View style={styles.stack}>
      {requests.map((request) => (
        <RequestRow
          busy={busyAction === request._id}
          key={`${request.source}-${request._id}`}
          request={request}
          onCancel={() => onCancel(request)}
          onConfirm={() => onConfirm(request)}
        />
      ))}
    </View>
  );
}

function ListingRow({
  busy,
  listing,
  onArchive,
  onEdit,
}: {
  busy: boolean;
  listing: any;
  onArchive: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.flexText}>
        <View style={styles.titleLine}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>
            {listing.title}
          </ThemedText>
          <StatusPill status={listing.reviewStatus} />
        </View>
        <ThemedText numberOfLines={1} style={styles.metaText}>
          {listing.kind} - {listing.locationLabel} - {listing.price}
        </ThemedText>
        {listing.rejectionNote ? <ThemedText style={styles.metaText}>{listing.rejectionNote}</ThemedText> : null}
      </View>
      <View style={styles.actionRow}>
        <IconButton disabled={busy} icon="pencil-outline" label="Edit" onPress={onEdit} />
        <IconButton disabled={busy || listing.status === 'archived'} icon="archive-outline" label="Archive" onPress={onArchive} />
      </View>
    </View>
  );
}

function RequestRow({
  busy,
  onCancel,
  onConfirm,
  request,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  request: any;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.flexText}>
        <View style={styles.titleLine}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>
            {request.title}
          </ThemedText>
          <StatusPill status={request.status} />
        </View>
        <ThemedText numberOfLines={1} style={styles.metaText}>{request.detailLabel}</ThemedText>
        <ThemedText numberOfLines={1} style={styles.metaText}>
          {request.paymentMode ?? 'cash'} - {request.paymentStatus ?? 'unpaid'}
          {typeof request.totalPrice === 'number' ? ` - $${request.totalPrice}` : ''}
        </ThemedText>
      </View>
      <View style={styles.actionRow}>
        <IconButton disabled={busy || request.status === 'confirmed'} icon="check" label="Confirm" onPress={onConfirm} primary />
        <IconButton disabled={busy || request.status === 'cancelled'} icon="close" label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

function EditorPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.editorPanel}>
      <ThemedText style={styles.editorTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function FormSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.formSection}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.formGrid}>{children}</View>
    </View>
  );
}

function Field({
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'numeric';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={[styles.field, multiline && styles.fieldWide]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={businessColors.placeholder}
        style={[styles.input, multiline && styles.textArea]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

function FormActions({ busy, onSave, onSubmit }: { busy: boolean; onSave: () => void; onSubmit: () => void }) {
  return (
    <View style={styles.formActions}>
      <SettingActionButton disabled={busy} label={busy ? 'Saving...' : 'Save draft'} onPress={onSave} variant="secondary" />
      <SettingActionButton disabled={busy} label="Submit for review" onPress={onSubmit} />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
    </View>
  );
}

function LoadingRows() {
  return (
    <View style={styles.loadingPanel}>
      <ActivityIndicator color={designSystem.colors.lime} />
    </View>
  );
}

function PanelState({ body, icon, title }: { body: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string }) {
  return (
    <View style={styles.panelState}>
      <MaterialCommunityIcons color={designSystem.colors.fern} name={icon} size={22} />
      <ThemedText style={styles.stateTitle}>{title}</ThemedText>
      <ThemedText style={styles.stateBody}>{body}</ThemedText>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const positive = status === 'approved' || status === 'confirmed' || status === 'live' || status === 'active';
  return (
    <View style={[styles.statusPill, positive ? styles.statusPositive : styles.statusNeutral]}>
      <ThemedText style={[styles.statusText, !positive && styles.statusTextNeutral]}>{status}</ThemedText>
    </View>
  );
}

function IconButton({
  disabled,
  icon,
  label,
  onPress,
  primary = false,
}: {
  disabled?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, primary && styles.iconButtonPrimary, disabled && styles.disabled]}
    >
      <MaterialCommunityIcons color={primary ? designSystem.colors.darkGreen : businessColors.text} name={icon} size={16} />
      <ThemedText style={[styles.iconButtonText, primary && styles.iconButtonTextPrimary]}>{label}</ThemedText>
    </Pressable>
  );
}

const businessColors = designSystem.semantic.dark;

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  businessName: {
    color: designSystem.colors.ink,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  coverEmpty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  coverFrame: {
    aspectRatio: 16 / 9,
    backgroundColor: businessColors.surface,
    borderColor: businessColors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  coverImage: {
    height: '100%',
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  editorPanel: {
    backgroundColor: businessColors.surfaceRaised,
    borderColor: businessColors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 14,
  },
  editorTitle: {
    color: designSystem.colors.ink,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 21,
  },
  field: {
    flexGrow: 1,
    gap: 6,
    minWidth: 210,
  },
  fieldLabel: {
    color: designSystem.colors.gray,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  fieldWide: {
    minWidth: 280,
  },
  flexText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formSection: {
    gap: 10,
  },
  galleryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryThumb: {
    backgroundColor: businessColors.surface,
    borderRadius: 8,
    height: 70,
    width: 70,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerPanel: {
    alignItems: 'center',
    backgroundColor: businessColors.surfaceRaised,
    borderColor: businessColors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: businessColors.surface,
    borderColor: businessColors.borderSoft,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  iconButtonPrimary: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  iconButtonText: {
    color: designSystem.colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  iconButtonTextPrimary: {
    color: designSystem.colors.darkGreen,
  },
  input: {
    backgroundColor: businessColors.surfaceRaised,
    borderColor: businessColors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    color: businessColors.text,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  loadingPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  metaText: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  metric: {
    backgroundColor: businessColors.surfaceRaised,
    borderColor: businessColors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 120,
    padding: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricLabel: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
  metricValue: {
    color: designSystem.colors.ink,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 26,
  },
  panelState: {
    alignItems: 'flex-start',
    backgroundColor: businessColors.surfaceRaised,
    borderColor: businessColors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    alignItems: 'flex-start',
    backgroundColor: businessColors.surfaceRaised,
    borderColor: businessColors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  rowTitle: {
    color: designSystem.colors.ink,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  sectionTitle: {
    color: designSystem.colors.ink,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  stack: {
    gap: 16,
  },
  stateBody: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  stateTitle: {
    color: designSystem.colors.ink,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  statusNeutral: {
    backgroundColor: businessColors.overlay,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPositive: {
    backgroundColor: designSystem.colors.lime,
  },
  statusText: {
    color: designSystem.colors.darkGreen,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
    textTransform: 'capitalize',
  },
  statusTextNeutral: {
    color: designSystem.colors.ink,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 10,
  },
  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  uploadButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  uploadButtonSecondary: {
    alignItems: 'center',
    backgroundColor: businessColors.surface,
    borderColor: businessColors.borderSoft,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  uploadButtonSecondaryText: {
    color: businessColors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  uploadButtonText: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '800',
  },
});
