import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import type React from 'react';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';
import { ThemedText } from '@/components/themed-text';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { ProfileSettingScreen, SettingActionButton } from '@/components/wandr/profile/profile-setting-screen';
import { designSystem } from '@/constants/design-system';
import {
  providerArchiveMyListingRef,
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

type ProviderTab = 'overview' | 'experience' | 'stay' | 'requests';
type StayStyle = 'design' | 'lodge' | 'roadside' | 'wellness';
type RouteVibe = 'city reset' | 'coast base' | 'wildlife stop' | 'desert night';

const tabOptions: readonly { key: ProviderTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'experience', label: 'Experience' },
  { key: 'stay', label: 'Stay' },
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

const defaultExperienceForm = {
  title: '',
  subtitle: '',
  description: '',
  category: 'Guided tour',
  durationLabel: '',
  groupCapacity: '8',
  priceUsd: '',
  locationLabel: '',
  town: '',
  region: '',
  countryCode: 'NA',
  countryLabel: 'Namibia',
  coordinate: '',
  imageUri: '',
  galleryImages: '',
  availabilityLabel: '',
  confirmMode: 'Provider confirms within 24 hours',
  includes: '',
  directPaymentNotes: 'Cash on arrival or direct transfer with the provider.',
  cancellationPolicy: '',
  contactNote: '',
};

const defaultStayForm = {
  name: '',
  summary: '',
  locationLabel: '',
  town: '',
  region: '',
  countryCode: 'NA',
  countryLabel: 'Namibia',
  coordinate: '',
  imageUri: '',
  galleryImages: '',
  priceUsd: '',
  currencyCode: 'USD',
  bookingNote: '',
  sleepSignal: '',
  idealFor: '',
  amenities: '',
  nearbyHighlights: '',
  roomLabel: 'Standard room',
  roomDetail: '',
  maxAdults: '2',
  maxChildren: '1',
  maxRooms: '4',
  bedLabel: 'Queen bed',
  arrivalLabel: '15:00 - 20:00',
  directPaymentNotes: 'Cash on arrival or direct transfer with the property.',
  cancellationPolicy: '',
  contactNote: '',
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

function galleryFrom(imageUri: string, galleryImages: string) {
  const gallery = splitList(galleryImages);
  return gallery.length ? gallery : imageUri.trim() ? [imageUri.trim()] : [];
}

export function ProviderBusinessScreen() {
  const { isLoading, session } = useAuthSession();
  const [activeTab, setActiveTab] = useState<ProviderTab>('overview');
  const [experienceId, setExperienceId] = useState<Id<'experiences'> | undefined>();
  const [stayId, setStayId] = useState<Id<'stays'> | undefined>();
  const [experienceForm, setExperienceForm] = useState(defaultExperienceForm);
  const [stayForm, setStayForm] = useState(defaultStayForm);
  const [stayStyle, setStayStyle] = useState<StayStyle>('lodge');
  const [routeVibe, setRouteVibe] = useState<RouteVibe>('wildlife stop');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const canOpenBusiness = session?.role === 'serviceProvider' || session?.role === 'admin';
  const profile = useQuery(providerGetMyBusinessProfileRef, canOpenBusiness ? {} : 'skip');
  const canLoadProviderData = Boolean(profile && profile.status === 'active');
  const listings = useQuery(providerListMyListingsRef, canLoadProviderData ? {} : 'skip');
  const requests = useQuery(providerListMyRequestsRef, canLoadProviderData ? { status: 'all' } : 'skip');
  const upsertExperience = useMutation(providerUpsertMyExperienceDraftRef);
  const submitExperience = useMutation(providerSubmitMyExperienceForReviewRef);
  const upsertStay = useMutation(providerUpsertMyStayDraftRef);
  const submitStay = useMutation(providerSubmitMyStayForReviewRef);
  const updateRequestStatus = useMutation(providerUpdateMyRequestStatusRef);
  const archiveListing = useMutation(providerArchiveMyListingRef);

  function updateExperienceField(field: keyof typeof defaultExperienceForm, value: string) {
    setExperienceForm((current) => ({ ...current, [field]: value }));
  }

  function updateStayField(field: keyof typeof defaultStayForm, value: string) {
    setStayForm((current) => ({ ...current, [field]: value }));
  }

  async function saveExperience(shouldSubmit: boolean) {
    setBusyAction(shouldSubmit ? 'submitExperience' : 'saveExperience');
    try {
      const saved = await upsertExperience({
        experienceId,
        title: experienceForm.title,
        subtitle: experienceForm.subtitle,
        description: experienceForm.description,
        category: experienceForm.category,
        durationLabel: experienceForm.durationLabel,
        groupCapacity: parsePositiveNumber(experienceForm.groupCapacity, 1),
        priceUsd: parsePositiveNumber(experienceForm.priceUsd),
        locationLabel: experienceForm.locationLabel,
        town: experienceForm.town || undefined,
        region: experienceForm.region,
        countryCode: experienceForm.countryCode || undefined,
        countryLabel: experienceForm.countryLabel || undefined,
        coordinate: parseCoordinate(experienceForm.coordinate),
        imageUri: experienceForm.imageUri,
        galleryImages: galleryFrom(experienceForm.imageUri, experienceForm.galleryImages),
        availabilityLabel: experienceForm.availabilityLabel,
        confirmMode: experienceForm.confirmMode,
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
        summary: stayForm.summary,
        coordinate: parseCoordinate(stayForm.coordinate),
        imageUri: stayForm.imageUri,
        galleryImages: galleryFrom(stayForm.imageUri, stayForm.galleryImages),
        priceUsd: parsePositiveNumber(stayForm.priceUsd),
        currencyCode: stayForm.currencyCode || 'USD',
        bookingNote: stayForm.bookingNote,
        stayStyle,
        routeVibe,
        sleepSignal: stayForm.sleepSignal,
        idealFor: splitList(stayForm.idealFor),
        amenities: splitList(stayForm.amenities),
        nearbyHighlights: splitList(stayForm.nearbyHighlights),
        bookingProfile: {
          roomOptions: [
            {
              id: roomOptionId,
              label: stayForm.roomLabel || 'Standard room',
              detail: stayForm.roomDetail || stayForm.summary,
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

  async function archive(kind: 'experience' | 'stay', id: Id<'experiences'> | Id<'stays'>) {
    setBusyAction(id);
    try {
      await archiveListing({ kind, id });
    } catch (error) {
      Alert.alert('Archive failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyAction(null);
    }
  }

  if (isLoading) {
    return <LoadingBusinessScreen />;
  }

  if (!session || !canOpenBusiness) {
    return (
      <ProfileSettingScreen title="My business">
        <PanelState icon="lock-outline" title="Invite required" body="An admin needs to invite this account first." />
      </ProfileSettingScreen>
    );
  }

  if (profile === undefined) {
    return <LoadingBusinessScreen />;
  }

  if (!profile) {
    return (
      <ProfileSettingScreen title="My business">
        <PanelState icon="storefront-outline" title="No business yet" body="Ask an admin to invite this account as a provider." />
      </ProfileSettingScreen>
    );
  }

  const disabledForSuspension = profile.status !== 'active';

  return (
    <ProfileSettingScreen title="My business">
      <View style={styles.stack}>
        <BusinessHeader profile={profile} />
        {disabledForSuspension ? (
          <PanelState
            icon={profile.status === 'invited' ? 'clock-outline' : 'pause-circle-outline'}
            title={profile.status === 'invited' ? 'Invite pending' : 'Business suspended'}
            body="Contact an admin before editing listings."
          />
        ) : (
          <>
            <SegmentedTabs options={tabOptions} value={activeTab} onChange={setActiveTab} />
            {activeTab === 'overview' ? (
              <OverviewTab
                busyAction={busyAction}
                listings={listings}
                onArchiveExperience={(id) => archive('experience', id)}
                onArchiveStay={(id) => archive('stay', id)}
                profile={profile}
                requests={requests}
              />
            ) : null}
            {activeTab === 'experience' ? (
              <ExperienceForm
                busyAction={busyAction}
                form={experienceForm}
                onFieldChange={updateExperienceField}
                onSave={() => saveExperience(false)}
                onSubmit={() => saveExperience(true)}
              />
            ) : null}
            {activeTab === 'stay' ? (
              <StayForm
                busyAction={busyAction}
                form={stayForm}
                onFieldChange={updateStayField}
                onSave={() => saveStay(false)}
                onSubmit={() => saveStay(true)}
                onStayStyleChange={setStayStyle}
                onRouteVibeChange={setRouteVibe}
                routeVibe={routeVibe}
                stayStyle={stayStyle}
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
    <ProfileSettingScreen title="My business">
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

function OverviewTab({
  busyAction,
  listings,
  onArchiveExperience,
  onArchiveStay,
  profile,
  requests,
}: {
  busyAction: string | null;
  listings: any;
  onArchiveExperience: (id: Id<'experiences'>) => void;
  onArchiveStay: (id: Id<'stays'>) => void;
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
        <PanelState icon="playlist-plus" title="No listings yet" body="Add an experience or stay, then submit it for review." />
      ) : (
        <View style={styles.stack}>
          {[...experiences, ...stays].map((listing) => (
            <ListingRow
              busy={busyAction === listing._id}
              key={`${listing.kind}-${listing._id}`}
              listing={listing}
              onArchive={() =>
                listing.kind === 'experience'
                  ? onArchiveExperience(listing._id as Id<'experiences'>)
                  : onArchiveStay(listing._id as Id<'stays'>)
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ExperienceForm({
  busyAction,
  form,
  onFieldChange,
  onSave,
  onSubmit,
}: {
  busyAction: string | null;
  form: typeof defaultExperienceForm;
  onFieldChange: (field: keyof typeof defaultExperienceForm, value: string) => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  const busy = busyAction === 'saveExperience' || busyAction === 'submitExperience';
  return (
    <View style={styles.stack}>
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
        <Field label="Coordinates" placeholder="17.0832, -22.5597" value={form.coordinate} onChangeText={(value) => onFieldChange('coordinate', value)} />
      </FormSection>
      <FormSection title="Booking">
        <Field label="Duration" value={form.durationLabel} onChangeText={(value) => onFieldChange('durationLabel', value)} />
        <Field keyboardType="numeric" label="Group size" value={form.groupCapacity} onChangeText={(value) => onFieldChange('groupCapacity', value)} />
        <Field keyboardType="numeric" label="Price USD" value={form.priceUsd} onChangeText={(value) => onFieldChange('priceUsd', value)} />
        <Field label="Availability" value={form.availabilityLabel} onChangeText={(value) => onFieldChange('availabilityLabel', value)} />
        <Field label="Included items" multiline value={form.includes} onChangeText={(value) => onFieldChange('includes', value)} />
      </FormSection>
      <FormSection title="Photos and notes">
        <Field label="Main photo URL" value={form.imageUri} onChangeText={(value) => onFieldChange('imageUri', value)} />
        <Field label="Gallery URLs" multiline value={form.galleryImages} onChangeText={(value) => onFieldChange('galleryImages', value)} />
        <Field label="Payment note" multiline value={form.directPaymentNotes} onChangeText={(value) => onFieldChange('directPaymentNotes', value)} />
        <Field label="Cancellation" multiline value={form.cancellationPolicy} onChangeText={(value) => onFieldChange('cancellationPolicy', value)} />
        <Field label="Contact note" multiline value={form.contactNote} onChangeText={(value) => onFieldChange('contactNote', value)} />
      </FormSection>
      <FormActions busy={busy} onSave={onSave} onSubmit={onSubmit} />
    </View>
  );
}

function StayForm({
  busyAction,
  form,
  onFieldChange,
  onRouteVibeChange,
  onSave,
  onStayStyleChange,
  onSubmit,
  routeVibe,
  stayStyle,
}: {
  busyAction: string | null;
  form: typeof defaultStayForm;
  onFieldChange: (field: keyof typeof defaultStayForm, value: string) => void;
  onRouteVibeChange: (value: RouteVibe) => void;
  onSave: () => void;
  onStayStyleChange: (value: StayStyle) => void;
  onSubmit: () => void;
  routeVibe: RouteVibe;
  stayStyle: StayStyle;
}) {
  const busy = busyAction === 'saveStay' || busyAction === 'submitStay';
  return (
    <View style={styles.stack}>
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
        <Field label="Coordinates" placeholder="17.0832, -22.5597" value={form.coordinate} onChangeText={(value) => onFieldChange('coordinate', value)} />
      </FormSection>
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
      <FormSection title="Photos and notes">
        <Field label="Main photo URL" value={form.imageUri} onChangeText={(value) => onFieldChange('imageUri', value)} />
        <Field label="Gallery URLs" multiline value={form.galleryImages} onChangeText={(value) => onFieldChange('galleryImages', value)} />
        <Field label="Payment note" multiline value={form.directPaymentNotes} onChangeText={(value) => onFieldChange('directPaymentNotes', value)} />
        <Field label="Cancellation" multiline value={form.cancellationPolicy} onChangeText={(value) => onFieldChange('cancellationPolicy', value)} />
        <Field label="Contact note" multiline value={form.contactNote} onChangeText={(value) => onFieldChange('contactNote', value)} />
      </FormSection>
      <FormActions busy={busy} onSave={onSave} onSubmit={onSubmit} />
    </View>
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

function ListingRow({ busy, listing, onArchive }: { busy: boolean; listing: any; onArchive: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.flexText}>
        <View style={styles.titleLine}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>{listing.title}</ThemedText>
          <StatusPill status={listing.reviewStatus} />
        </View>
        <ThemedText numberOfLines={1} style={styles.metaText}>
          {listing.kind} - {listing.locationLabel} - {listing.price}
        </ThemedText>
        {listing.rejectionNote ? <ThemedText style={styles.metaText}>{listing.rejectionNote}</ThemedText> : null}
      </View>
      <IconButton disabled={busy || listing.status === 'archived'} icon="archive-outline" label="Archive" onPress={onArchive} />
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
          <ThemedText numberOfLines={1} style={styles.rowTitle}>{request.title}</ThemedText>
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
        placeholderTextColor={designSystem.colors.mutedText}
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
      <MaterialCommunityIcons
        color={primary ? designSystem.colors.darkGreen : designSystem.colors.ink}
        name={icon}
        size={16}
      />
      <ThemedText style={[styles.iconButtonText, primary && styles.iconButtonTextPrimary]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  headerPanel: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.surfaceRaised,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  businessName: {
    color: designSystem.colors.ink,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  flexText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  metaText: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    backgroundColor: designSystem.colors.surfaceRaised,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 120,
    padding: 14,
  },
  metricValue: {
    color: designSystem.colors.ink,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 26,
  },
  metricLabel: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
  formSection: {
    gap: 10,
  },
  sectionTitle: {
    color: designSystem.colors.ink,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  field: {
    flexGrow: 1,
    gap: 6,
    minWidth: 210,
  },
  fieldWide: {
    minWidth: 280,
  },
  fieldLabel: {
    color: designSystem.colors.gray,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  input: {
    backgroundColor: designSystem.colors.surfaceRaised,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    color: designSystem.colors.ink,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 10,
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  row: {
    alignItems: 'flex-start',
    backgroundColor: designSystem.colors.surfaceRaised,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowTitle: {
    color: designSystem.colors.ink,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.surface,
    borderColor: designSystem.colors.borderSoft,
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
  disabled: {
    opacity: 0.5,
  },
  panelState: {
    alignItems: 'flex-start',
    backgroundColor: designSystem.colors.surfaceRaised,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  stateTitle: {
    color: designSystem.colors.ink,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  stateBody: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  loadingPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPositive: {
    backgroundColor: designSystem.colors.lime,
  },
  statusNeutral: {
    backgroundColor: designSystem.colors.whiteOverlayBarely,
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
});
