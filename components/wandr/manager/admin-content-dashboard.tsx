import { useMutation, useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Check, Plus, X } from 'phosphor-react-native';
import type React from 'react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';
import { ThemedText } from '@/components/themed-text';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { LargeScreenPanel } from '@/components/wandr/large-screen-workspace';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  type ContentStatus,
  type CuratedContentKind,
  generateManagedImageUploadUrlRef,
  listManagedCatalogRef,
  migrateLegacyContentAsLiveRef,
  updateManagedContentStatusRef,
  upsertManagedExperienceRef,
  upsertManagedLocationRef,
  upsertManagedStayRef,
} from '@/lib/convex';

type AdminTab = 'locations' | 'experiences' | 'stays';
type StatusFilter = ContentStatus | 'all';

type LocationForm = {
  title: string;
  description: string;
  summary: string;
  category: string;
  badge: string;
  locationLabel: string;
  town: string;
  region: string;
  countryCode: string;
  countryLabel: string;
  planningLocationId: string;
  coordinate: string;
  imageStorageId: Id<'_storage'> | null;
  imageUri: string;
  galleryImages: string;
  visitTips: string;
  sectionsTitle: string;
};

type ExperienceForm = {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  durationLabel: string;
  groupCapacity: string;
  priceUsd: string;
  locationLabel: string;
  town: string;
  region: string;
  countryCode: string;
  countryLabel: string;
  planningLocationId: string;
  coordinate: string;
  imageUri: string;
  galleryImages: string;
  availabilityLabel: string;
  confirmMode: string;
  includes: string;
  linkedLocationSlug: string;
};

type StayForm = {
  name: string;
  locationLabel: string;
  town: string;
  region: string;
  countryCode: string;
  countryLabel: string;
  planningLocationId: string;
  summary: string;
  coordinate: string;
  imageUri: string;
  galleryImages: string;
  priceUsd: string;
  currencyCode: string;
  rating: string;
  reviewCount: string;
  bookingNote: string;
  stayStyle: 'design' | 'lodge' | 'roadside' | 'wellness';
  routeVibe: 'city reset' | 'coast base' | 'wildlife stop' | 'desert night';
  sleepSignal: string;
  idealFor: string;
  amenities: string;
  nearbyHighlights: string;
  linkedLocationSlug: string;
};

const tabs = [
  { key: 'locations', label: 'Locations' },
  { key: 'experiences', label: 'Experiences' },
  { key: 'stays', label: 'Stays' },
] as const;

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'live', label: 'Live' },
  { key: 'archived', label: 'Archived' },
] as const;

const DEFAULT_LOCATION_COORDINATE: readonly [number, number] = [17.0832, -22.5597];
const MAX_OPTIMIZED_IMAGE_DIMENSION = 1800;
const IMAGE_UPLOAD_QUALITY = 0.92;

const defaultLocationForm = (): LocationForm => ({
  title: '',
  description: '',
  summary: '',
  category: 'Point of interest',
  badge: 'Location',
  locationLabel: '',
  town: '',
  region: 'Namibia',
  countryCode: 'NA',
  countryLabel: 'Namibia',
  planningLocationId: 'namibia',
  coordinate: formatCoordinate(DEFAULT_LOCATION_COORDINATE),
  imageStorageId: null,
  imageUri: '',
  galleryImages: '',
  visitTips: '',
  sectionsTitle: 'More to know',
});

const defaultExperienceForm = (): ExperienceForm => ({
  title: '',
  subtitle: '',
  description: '',
  category: 'Experience',
  durationLabel: '2 hours',
  groupCapacity: '6',
  priceUsd: '0',
  locationLabel: '',
  town: '',
  region: 'Namibia',
  countryCode: 'NA',
  countryLabel: 'Namibia',
  planningLocationId: 'namibia',
  coordinate: '17.0832, -22.5597',
  imageUri: '',
  galleryImages: '',
  availabilityLabel: 'Open daily',
  confirmMode: 'Request to book',
  includes: '',
  linkedLocationSlug: '',
});

const defaultStayForm = (): StayForm => ({
  name: '',
  locationLabel: '',
  town: '',
  region: 'Namibia',
  countryCode: 'NA',
  countryLabel: 'Namibia',
  planningLocationId: 'namibia',
  summary: '',
  coordinate: '17.0832, -22.5597',
  imageUri: '',
  galleryImages: '',
  priceUsd: '120',
  currencyCode: 'USD',
  rating: '4.8',
  reviewCount: '0',
  bookingNote: 'Request to reserve this stay.',
  stayStyle: 'lodge',
  routeVibe: 'wildlife stop',
  sleepSignal: 'Curated stay',
  idealFor: '',
  amenities: '',
  nearbyHighlights: '',
  linkedLocationSlug: '',
});

export function AdminContentDashboard({
  inPanel = true,
  travelerSlug: _travelerSlug,
}: {
  inPanel?: boolean;
  travelerSlug?: string | null;
}) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;
  const { isLargeScreen } = useResponsive();
  const [activeTab, setActiveTab] = useState<AdminTab>('locations');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Partial<Record<AdminTab, string>>>({});
  const [locationForm, setLocationForm] = useState<LocationForm>(() => defaultLocationForm());
  const [experienceForm, setExperienceForm] = useState<ExperienceForm>(() => defaultExperienceForm());
  const [stayForm, setStayForm] = useState<StayForm>(() => defaultStayForm());
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const queryArgs = useMemo(
    () => (statusFilter === 'all' ? {} : { status: statusFilter }),
    [statusFilter]
  );
  const catalog = useQuery(listManagedCatalogRef, queryArgs);
  const generateManagedImageUploadUrl = useMutation(generateManagedImageUploadUrlRef);
  const upsertLocation = useMutation(upsertManagedLocationRef);
  const upsertExperience = useMutation(upsertManagedExperienceRef);
  const upsertStay = useMutation(upsertManagedStayRef);
  const updateStatus = useMutation(updateManagedContentStatusRef);
  const migrateLegacy = useMutation(migrateLegacyContentAsLiveRef);

  const locations = catalog?.locations ?? [];
  const records = getRecordsForTab(activeTab, catalog);
  const selectedId = selectedIds[activeTab];

  const handleSelectRecord = (item: any) => {
    setSelectedIds((current) => ({ ...current, [activeTab]: item._id }));

    if (activeTab === 'locations') {
      setLocationForm(locationFormFromItem(item));
    }
    if (activeTab === 'experiences') {
      setExperienceForm(experienceFormFromItem(item, locations));
    }
    if (activeTab === 'stays') {
      setStayForm(stayFormFromItem(item, locations));
    }
  };

  const handleNew = () => {
    setSelectedIds((current) => ({ ...current, [activeTab]: undefined }));
    if (activeTab === 'locations') {
      setLocationForm(defaultLocationForm());
    }
    if (activeTab === 'experiences') {
      setExperienceForm(defaultExperienceForm());
    }
    if (activeTab === 'stays') {
      setStayForm(defaultStayForm());
    }
  };

  const saveLocation = async (status: ContentStatus) => {
    await runAction('Saving location', async () => {
      await upsertLocation({
        ...(selectedId ? { locationId: selectedId as Id<'locations'> } : {}),
        title: requireText(locationForm.title, 'Title'),
        description: requireText(locationForm.description, 'Description'),
        ...optionalArg('summary', locationForm.summary),
        category: requireText(locationForm.category, 'Category'),
        ...optionalArg('badge', locationForm.badge),
        locationLabel: requireText(locationForm.locationLabel, 'Location label'),
        ...optionalArg('town', locationForm.town),
        region: requireText(locationForm.region, 'Region'),
        ...optionalArg('countryCode', locationForm.countryCode),
        ...optionalArg('countryLabel', locationForm.countryLabel),
        ...optionalArg('planningLocationId', locationForm.planningLocationId),
        coordinate: parseCoordinate(locationForm.coordinate),
        imageStorageId: requireStorageId(locationForm.imageStorageId),
        galleryImages: parseList(locationForm.galleryImages),
        visitTips: parseList(locationForm.visitTips),
        ...optionalArg('sectionsTitle', locationForm.sectionsTitle),
        status,
      });
    });
  };

  const pickLocationImage = async () => {
    await runAction('Uploading place image', async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Allow photo access to upload a place image.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [16, 10],
        exif: false,
        mediaTypes: ['images'],
        quality: IMAGE_UPLOAD_QUALITY,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const asset = result.assets[0];
      const optimized = await optimizePickedImage(asset);
      const uploadUrl = await generateManagedImageUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': optimized.mimeType },
        body: optimized.blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('The optimized image could not be uploaded.');
      }

      const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
      setLocationForm((current) => ({
        ...current,
        imageStorageId: storageId,
        imageUri: optimized.previewUri,
      }));
    });
  };

  const saveExperience = async (status: ContentStatus) => {
    await runAction('Saving experience', async () => {
      const linkedLocationId = getLinkedLocationId(locations, experienceForm.linkedLocationSlug);
      await upsertExperience({
        ...(selectedId ? { experienceId: selectedId as Id<'experiences'> } : {}),
        title: requireText(experienceForm.title, 'Title'),
        subtitle: requireText(experienceForm.subtitle, 'Subtitle'),
        description: requireText(experienceForm.description, 'Description'),
        category: requireText(experienceForm.category, 'Category'),
        durationLabel: requireText(experienceForm.durationLabel, 'Duration'),
        groupCapacity: parseInteger(experienceForm.groupCapacity, 1),
        priceUsd: parseMoney(experienceForm.priceUsd),
        locationLabel: requireText(experienceForm.locationLabel, 'Location label'),
        ...optionalArg('town', experienceForm.town),
        region: requireText(experienceForm.region, 'Region'),
        ...optionalArg('countryCode', experienceForm.countryCode),
        ...optionalArg('countryLabel', experienceForm.countryLabel),
        ...optionalArg('planningLocationId', experienceForm.planningLocationId),
        coordinate: parseCoordinate(experienceForm.coordinate),
        imageUri: experienceForm.imageUri.trim(),
        galleryImages: parseMediaList(experienceForm.galleryImages, experienceForm.imageUri),
        availabilityLabel: requireText(experienceForm.availabilityLabel, 'Availability'),
        confirmMode: requireText(experienceForm.confirmMode, 'Confirmation'),
        includes: parseList(experienceForm.includes),
        ...(linkedLocationId ? { linkedLocationId } : {}),
        status,
      });
    });
  };

  const saveStay = async (status: ContentStatus) => {
    await runAction('Saving stay', async () => {
      const linkedLocationId = getLinkedLocationId(locations, stayForm.linkedLocationSlug);
      await upsertStay({
        ...(selectedId ? { stayId: selectedId as Id<'stays'> } : {}),
        name: requireText(stayForm.name, 'Name'),
        locationLabel: requireText(stayForm.locationLabel, 'Location label'),
        town: requireText(stayForm.town, 'Town'),
        region: requireText(stayForm.region, 'Region'),
        ...optionalArg('countryCode', stayForm.countryCode),
        ...optionalArg('countryLabel', stayForm.countryLabel),
        ...optionalArg('planningLocationId', stayForm.planningLocationId),
        summary: requireText(stayForm.summary, 'Summary'),
        coordinate: parseCoordinate(stayForm.coordinate),
        imageUri: stayForm.imageUri.trim(),
        galleryImages: parseMediaList(stayForm.galleryImages, stayForm.imageUri),
        priceUsd: parseMoney(stayForm.priceUsd),
        currencyCode: requireText(stayForm.currencyCode, 'Currency'),
        rating: parseNumber(stayForm.rating, 0),
        reviewCount: parseInteger(stayForm.reviewCount, 0),
        bookingNote: requireText(stayForm.bookingNote, 'Booking note'),
        stayStyle: stayForm.stayStyle,
        routeVibe: stayForm.routeVibe,
        sleepSignal: requireText(stayForm.sleepSignal, 'Sleep signal'),
        idealFor: parseList(stayForm.idealFor),
        amenities: parseList(stayForm.amenities),
        nearbyHighlights: parseList(stayForm.nearbyHighlights),
        bookingProfile: buildDefaultBookingProfile(stayForm),
        ...(linkedLocationId ? { linkedLocationId } : {}),
        status,
      });
    });
  };

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    setBusyLabel(label);
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Admin action failed';
      Alert.alert('Admin action failed', message);
    } finally {
      setBusyLabel(null);
    }
  };

  const changeStatus = async (kind: CuratedContentKind, id: string, status: ContentStatus) => {
    await runAction('Updating status', async () => {
      await updateStatus({ kind, id: id as Id<'locations'> | Id<'experiences'> | Id<'stays'>, status });
    });
  };

  const runMigration = async () => {
    await runAction('Migrating legacy content', async () => {
      const result = await migrateLegacy({ limit: 120 });
      Alert.alert(
        'Migration complete',
        `${result.locationsCreated} locations, ${result.experiencesUpdated} experiences, ${result.staysUpdated} stays updated.`
      );
    });
  };

  const content = (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText style={styles.title}>Admin content</ThemedText>
            <ThemedText style={styles.subtitle}>Curate the live locations, experiences, and stays users can add to trips.</ThemedText>
          </View>
          <ActionButton
            disabled={Boolean(busyLabel)}
            icon={<Check color={designSystem.colors.darkGreen} size={14} weight="bold" />}
            label="Migrate legacy"
            onPress={runMigration}
            variant="secondary"
          />
        </View>

        <SegmentedTabs
          options={tabs}
          value={activeTab}
          onChange={setActiveTab}
          contentContainerStyle={styles.tabs}
          tabStyle={styles.tab}
        />

        <View style={styles.toolbar}>
          <View style={styles.statusFilters}>
            {statusFilters.map((filter) => {
              const isActive = statusFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setStatusFilter(filter.key)}
                  style={[
                    styles.statusFilter,
                    {
                      borderColor: isActive ? designSystem.colors.lime : colors.borderSoft,
                      backgroundColor: isActive ? designSystem.colors.lime : colors.surface,
                    },
                  ]}
                >
                  <ThemedText style={[styles.statusFilterText, !isActive && styles.statusFilterTextInactive]}>
                    {filter.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ActionButton
            icon={<Plus color={designSystem.colors.darkGreen} size={14} weight="bold" />}
            label="New"
            onPress={handleNew}
            variant="secondary"
          />
        </View>

        {busyLabel ? <ThemedText style={styles.busyText}>{busyLabel}</ThemedText> : null}

        <View style={[styles.workspace, !isLargeScreen && styles.workspaceCompact]}>
            <View style={[styles.listPane, !isLargeScreen && styles.listPaneCompact, { borderColor: colors.borderSoft }]}>
              <ThemedText style={styles.paneTitle}>{getTabLabel(activeTab)}</ThemedText>
              {records.length === 0 ? (
                <ThemedText style={styles.emptyText}>No records here yet.</ThemedText>
              ) : (
                records.map((item: any) => (
                  <RecordRow
                    isSelected={selectedId === item._id}
                    item={item}
                    key={item._id}
                    onArchive={() => changeStatus(getKindForTab(activeTab), item._id, 'archived')}
                    onPress={() => handleSelectRecord(item)}
                    onPublish={() => changeStatus(getKindForTab(activeTab), item._id, 'live')}
                  />
                ))
              )}
            </View>

            <View style={[styles.editorPane, !isLargeScreen && styles.editorPaneCompact, { borderColor: colors.borderSoft }]}>
              <View style={styles.editorHeader}>
                <View>
                  <ThemedText style={styles.paneTitle}>{selectedId ? 'Edit record' : 'New draft'}</ThemedText>
                  <ThemedText style={styles.editorSubtitle}>Drafts stay hidden until published.</ThemedText>
                </View>
                <View style={styles.editorActions}>
                  <ActionButton
                    disabled={Boolean(busyLabel)}
                    label="Save draft"
                    onPress={() => {
                      if (activeTab === 'locations') void saveLocation('draft');
                      if (activeTab === 'experiences') void saveExperience('draft');
                      if (activeTab === 'stays') void saveStay('draft');
                    }}
                  />
                  <ActionButton
                    disabled={Boolean(busyLabel)}
                    icon={<Check color={designSystem.colors.darkGreen} size={14} weight="bold" />}
                    label="Publish"
                    onPress={() => {
                      if (activeTab === 'locations') void saveLocation('live');
                      if (activeTab === 'experiences') void saveExperience('live');
                      if (activeTab === 'stays') void saveStay('live');
                    }}
                    variant="primary"
                  />
                </View>
              </View>

              {activeTab === 'locations' ? (
                <LocationEditor
                  form={locationForm}
                  isUploadingImage={busyLabel === 'Uploading place image'}
                  onChange={setLocationForm}
                  onPickImage={pickLocationImage}
                />
              ) : activeTab === 'experiences' ? (
                <ExperienceEditor form={experienceForm} onChange={setExperienceForm} />
              ) : (
                <StayEditor form={stayForm} onChange={setStayForm} />
              )}
            </View>
        </View>
      </ScrollView>
  );

  if (!inPanel) {
    return <View style={styles.embeddedRoot}>{content}</View>;
  }

  return <LargeScreenPanel kind="main">{content}</LargeScreenPanel>;
}

function LocationEditor({
  form,
  isUploadingImage,
  onChange,
  onPickImage,
}: {
  form: LocationForm;
  isUploadingImage: boolean;
  onChange: (form: LocationForm) => void;
  onPickImage: () => void;
}) {
  return (
    <View style={styles.formGrid}>
      <Field label="Title" value={form.title} onChangeText={(title) => onChange({ ...form, title })} />
      <Field label="Category" value={form.category} onChangeText={(category) => onChange({ ...form, category })} />
      <Field label="Location label" value={form.locationLabel} onChangeText={(locationLabel) => onChange({ ...form, locationLabel })} />
      <Field label="Town" value={form.town} onChangeText={(town) => onChange({ ...form, town })} />
      <Field label="Region" value={form.region} onChangeText={(region) => onChange({ ...form, region })} />
      <LocationImageField form={form} isUploading={isUploadingImage} onPickImage={onPickImage} />
      <LocationPinPicker
        coordinateValue={form.coordinate}
        imageUri={form.imageUri}
        title={form.title}
        onChangeCoordinate={(coordinate) => onChange({ ...form, coordinate: formatCoordinate(coordinate) })}
      />
      <Field label="Pinned coordinate" value={form.coordinate} onChangeText={(coordinate) => onChange({ ...form, coordinate })} />
      <Field label="Gallery URLs" multiline value={form.galleryImages} onChangeText={(galleryImages) => onChange({ ...form, galleryImages })} />
      <Field label="Description" multiline value={form.description} onChangeText={(description) => onChange({ ...form, description })} />
      <Field label="Summary" multiline value={form.summary} onChangeText={(summary) => onChange({ ...form, summary })} />
      <Field label="Visit tips" multiline value={form.visitTips} onChangeText={(visitTips) => onChange({ ...form, visitTips })} />
      <Field label="Country code" value={form.countryCode} onChangeText={(countryCode) => onChange({ ...form, countryCode })} />
      <Field label="Country label" value={form.countryLabel} onChangeText={(countryLabel) => onChange({ ...form, countryLabel })} />
      <Field label="Planning location" value={form.planningLocationId} onChangeText={(planningLocationId) => onChange({ ...form, planningLocationId })} />
    </View>
  );
}

function ExperienceEditor({ form, onChange }: { form: ExperienceForm; onChange: (form: ExperienceForm) => void }) {
  return (
    <View style={styles.formGrid}>
      <Field label="Title" value={form.title} onChangeText={(title) => onChange({ ...form, title })} />
      <Field label="Subtitle" value={form.subtitle} onChangeText={(subtitle) => onChange({ ...form, subtitle })} />
      <Field label="Category" value={form.category} onChangeText={(category) => onChange({ ...form, category })} />
      <Field label="Duration" value={form.durationLabel} onChangeText={(durationLabel) => onChange({ ...form, durationLabel })} />
      <Field label="Capacity" keyboardType="numeric" value={form.groupCapacity} onChangeText={(groupCapacity) => onChange({ ...form, groupCapacity })} />
      <Field label="Price USD" keyboardType="numeric" value={form.priceUsd} onChangeText={(priceUsd) => onChange({ ...form, priceUsd })} />
      <Field label="Location label" value={form.locationLabel} onChangeText={(locationLabel) => onChange({ ...form, locationLabel })} />
      <Field label="Town" value={form.town} onChangeText={(town) => onChange({ ...form, town })} />
      <Field label="Region" value={form.region} onChangeText={(region) => onChange({ ...form, region })} />
      <Field label="Coordinate" value={form.coordinate} onChangeText={(coordinate) => onChange({ ...form, coordinate })} />
      <Field label="Linked location slug" value={form.linkedLocationSlug} onChangeText={(linkedLocationSlug) => onChange({ ...form, linkedLocationSlug })} />
      <Field label="Availability" value={form.availabilityLabel} onChangeText={(availabilityLabel) => onChange({ ...form, availabilityLabel })} />
      <Field label="Confirmation" value={form.confirmMode} onChangeText={(confirmMode) => onChange({ ...form, confirmMode })} />
      <Field label="Image URL" value={form.imageUri} onChangeText={(imageUri) => onChange({ ...form, imageUri })} />
      <Field label="Gallery URLs" multiline value={form.galleryImages} onChangeText={(galleryImages) => onChange({ ...form, galleryImages })} />
      <Field label="Description" multiline value={form.description} onChangeText={(description) => onChange({ ...form, description })} />
      <Field label="Includes" multiline value={form.includes} onChangeText={(includes) => onChange({ ...form, includes })} />
      <Field label="Country code" value={form.countryCode} onChangeText={(countryCode) => onChange({ ...form, countryCode })} />
      <Field label="Country label" value={form.countryLabel} onChangeText={(countryLabel) => onChange({ ...form, countryLabel })} />
      <Field label="Planning location" value={form.planningLocationId} onChangeText={(planningLocationId) => onChange({ ...form, planningLocationId })} />
    </View>
  );
}

function StayEditor({ form, onChange }: { form: StayForm; onChange: (form: StayForm) => void }) {
  return (
    <View style={styles.formGrid}>
      <Field label="Name" value={form.name} onChangeText={(name) => onChange({ ...form, name })} />
      <Field label="Location label" value={form.locationLabel} onChangeText={(locationLabel) => onChange({ ...form, locationLabel })} />
      <Field label="Town" value={form.town} onChangeText={(town) => onChange({ ...form, town })} />
      <Field label="Region" value={form.region} onChangeText={(region) => onChange({ ...form, region })} />
      <Field label="Coordinate" value={form.coordinate} onChangeText={(coordinate) => onChange({ ...form, coordinate })} />
      <Field label="Linked location slug" value={form.linkedLocationSlug} onChangeText={(linkedLocationSlug) => onChange({ ...form, linkedLocationSlug })} />
      <Field label="Price USD" keyboardType="numeric" value={form.priceUsd} onChangeText={(priceUsd) => onChange({ ...form, priceUsd })} />
      <Field label="Currency" value={form.currencyCode} onChangeText={(currencyCode) => onChange({ ...form, currencyCode })} />
      <Field label="Rating" keyboardType="numeric" value={form.rating} onChangeText={(rating) => onChange({ ...form, rating })} />
      <Field label="Reviews" keyboardType="numeric" value={form.reviewCount} onChangeText={(reviewCount) => onChange({ ...form, reviewCount })} />
      <Field label="Stay style" value={form.stayStyle} onChangeText={(stayStyle) => onChange({ ...form, stayStyle: normalizeStayStyle(stayStyle) })} />
      <Field label="Route vibe" value={form.routeVibe} onChangeText={(routeVibe) => onChange({ ...form, routeVibe: normalizeRouteVibe(routeVibe) })} />
      <Field label="Sleep signal" value={form.sleepSignal} onChangeText={(sleepSignal) => onChange({ ...form, sleepSignal })} />
      <Field label="Image URL" value={form.imageUri} onChangeText={(imageUri) => onChange({ ...form, imageUri })} />
      <Field label="Gallery URLs" multiline value={form.galleryImages} onChangeText={(galleryImages) => onChange({ ...form, galleryImages })} />
      <Field label="Summary" multiline value={form.summary} onChangeText={(summary) => onChange({ ...form, summary })} />
      <Field label="Booking note" multiline value={form.bookingNote} onChangeText={(bookingNote) => onChange({ ...form, bookingNote })} />
      <Field label="Ideal for" multiline value={form.idealFor} onChangeText={(idealFor) => onChange({ ...form, idealFor })} />
      <Field label="Amenities" multiline value={form.amenities} onChangeText={(amenities) => onChange({ ...form, amenities })} />
      <Field label="Nearby highlights" multiline value={form.nearbyHighlights} onChangeText={(nearbyHighlights) => onChange({ ...form, nearbyHighlights })} />
      <Field label="Country code" value={form.countryCode} onChangeText={(countryCode) => onChange({ ...form, countryCode })} />
      <Field label="Country label" value={form.countryLabel} onChangeText={(countryLabel) => onChange({ ...form, countryLabel })} />
      <Field label="Planning location" value={form.planningLocationId} onChangeText={(planningLocationId) => onChange({ ...form, planningLocationId })} />
    </View>
  );
}

function LocationImageField({
  form,
  isUploading,
  onPickImage,
}: {
  form: LocationForm;
  isUploading: boolean;
  onPickImage: () => void;
}) {
  const hasStorageImage = Boolean(form.imageStorageId);

  return (
    <View style={styles.fieldWide}>
      <View style={styles.mediaFieldHeader}>
        <View style={styles.flexText}>
          <ThemedText style={styles.fieldLabel}>Place image</ThemedText>
          <ThemedText style={styles.fieldHint}>
            {hasStorageImage ? 'Convex storage image ready.' : 'Upload a compressed image before saving.'}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isUploading}
          onPress={onPickImage}
          style={[styles.uploadButton, isUploading && styles.actionDisabled]}
        >
          {isUploading ? <ActivityIndicator color={designSystem.colors.darkGreen} size="small" /> : null}
          <ThemedText style={styles.uploadButtonText}>{hasStorageImage ? 'Replace image' : 'Upload image'}</ThemedText>
        </Pressable>
      </View>
      <View style={styles.imagePreviewFrame}>
        {form.imageUri ? (
          <ExpoImage contentFit="cover" source={{ uri: form.imageUri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePreviewEmpty}>
            <ThemedText style={styles.emptyText}>No place image uploaded.</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

function LocationPinPicker({
  coordinateValue,
  imageUri,
  onChangeCoordinate,
  title,
}: {
  coordinateValue: string;
  imageUri: string;
  onChangeCoordinate: (coordinate: readonly [number, number]) => void;
  title: string;
}) {
  const coordinate = parseCoordinateOrDefault(coordinateValue);

  return (
    <View style={styles.fieldWide}>
      <View style={styles.mediaFieldHeader}>
        <View style={styles.flexText}>
          <ThemedText style={styles.fieldLabel}>Map pin</ThemedText>
          <ThemedText style={styles.fieldHint}>Tap the Mapbox map to set this place.</ThemedText>
        </View>
        <ThemedText style={styles.coordinateLabel}>{formatCoordinate(coordinate)}</ThemedText>
      </View>
      <View style={styles.mapPickerFrame}>
        <MapPreview
          centerCoordinate={coordinate}
          colorSchemeMode="dark"
          interactionEnabled
          markerVariant="default"
          markers={[
            {
              coordinate,
              id: 'admin-location-pin',
              imageUri: imageUri || undefined,
              label: title || 'Pinned place',
              tone: 'accent',
            },
          ]}
          onMapPress={onChangeCoordinate}
          showRoutes={false}
          style={styles.mapPicker}
          zoomLevel={11}
        />
      </View>
    </View>
  );
}

function Field({
  keyboardType,
  label,
  multiline,
  onChangeText,
  value,
}: {
  keyboardType?: 'default' | 'numeric';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={[styles.field, multiline && styles.fieldWide]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.mutedText}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          {
            backgroundColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.surface,
            borderColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft,
            color: isDark ? designSystem.colors.darkText : designSystem.colors.ink,
          },
        ]}
        value={value}
      />
    </View>
  );
}

function RecordRow({
  isSelected,
  item,
  onArchive,
  onPress,
  onPublish,
}: {
  isSelected: boolean;
  item: any;
  onArchive: () => void;
  onPress: () => void;
  onPublish: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const status = (item.status ?? 'live') as ContentStatus;
  const inactiveBorder = isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft;
  const inactiveBackground = isDark ? designSystem.colors.darkSurface : designSystem.colors.surface;
  const selectedBackground = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.whiteGlassStrong;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.recordRow,
        {
          borderColor: isSelected ? designSystem.colors.lime : inactiveBorder,
          backgroundColor: isSelected ? selectedBackground : inactiveBackground,
        },
      ]}
    >
      <View style={styles.recordText}>
        <ThemedText numberOfLines={1} style={styles.recordTitle}>{getRecordTitle(item)}</ThemedText>
        <ThemedText numberOfLines={1} style={styles.recordMeta}>{getRecordSubtitle(item)}</ThemedText>
      </View>
      <View style={styles.recordActions}>
        <StatusPill status={status} />
        {status !== 'live' ? (
          <Pressable accessibilityLabel="Publish" onPress={onPublish} style={styles.iconButton}>
            <Check color={designSystem.colors.darkGreen} size={13} weight="bold" />
          </Pressable>
        ) : null}
        {status !== 'archived' ? (
          <Pressable accessibilityLabel="Archive" onPress={onArchive} style={styles.iconButton}>
            <X color={designSystem.colors.darkMutedText} size={13} weight="bold" />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function StatusPill({ status }: { status: ContentStatus }) {
  const isLive = status === 'live';

  return (
    <View style={[styles.statusPill, isLive ? styles.statusLive : status === 'draft' ? styles.statusDraft : styles.statusArchived]}>
      <ThemedText style={[styles.statusText, !isLive && styles.statusTextMuted]}>{status}</ThemedText>
    </View>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
  variant = 'secondary',
}: {
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        isPrimary ? styles.actionPrimary : styles.actionSecondary,
        disabled && styles.actionDisabled,
      ]}
    >
      {icon}
      <ThemedText style={[styles.actionLabel, !isPrimary && styles.actionLabelSecondary]}>{label}</ThemedText>
    </Pressable>
  );
}

function getRecordsForTab(tab: AdminTab, catalog: any) {
  if (!catalog) {
    return [];
  }
  if (tab === 'locations') {
    return catalog.locations ?? [];
  }
  if (tab === 'experiences') {
    return catalog.experiences ?? [];
  }
  if (tab === 'stays') {
    return catalog.stays ?? [];
  }
  return [];
}

function getTabLabel(tab: AdminTab) {
  if (tab === 'locations') return 'Locations';
  if (tab === 'experiences') return 'Experiences';
  if (tab === 'stays') return 'Stays';
  return 'Requests';
}

function getKindForTab(tab: AdminTab): CuratedContentKind {
  if (tab === 'locations') return 'location';
  if (tab === 'experiences') return 'experience';
  return 'stay';
}

function getRecordTitle(item: any) {
  return item.title ?? item.name ?? item.slug ?? 'Untitled';
}

function getRecordSubtitle(item: any) {
  return item.locationLabel ?? item.subtitle ?? item.region ?? item.slug ?? '';
}

function formatCoordinate(coordinate?: readonly number[] | null) {
  if (!coordinate || coordinate.length < 2) {
    return '';
  }
  return `${coordinate[0]}, ${coordinate[1]}`;
}

function locationFormFromItem(item: any): LocationForm {
  return {
    title: item.title ?? '',
    description: item.description ?? '',
    summary: item.summary ?? '',
    category: item.category ?? 'Point of interest',
    badge: item.badge ?? 'Location',
    locationLabel: item.locationLabel ?? '',
    town: item.town ?? '',
    region: item.region ?? 'Namibia',
    countryCode: item.countryCode ?? 'NA',
    countryLabel: item.countryLabel ?? 'Namibia',
    planningLocationId: item.planningLocationId ?? 'namibia',
    coordinate: formatCoordinate(item.coordinate),
    imageStorageId: item.imageStorageId ?? null,
    imageUri: item.imageUri ?? '',
    galleryImages: (item.galleryImages ?? []).join('\n'),
    visitTips: (item.visitTips ?? []).join('\n'),
    sectionsTitle: item.sectionsTitle ?? 'More to know',
  };
}

function experienceFormFromItem(item: any, locations: any[]): ExperienceForm {
  const linkedLocation = locations.find((location) => location._id === item.linkedLocationId);
  return {
    title: item.title ?? '',
    subtitle: item.subtitle ?? '',
    description: item.description ?? '',
    category: item.category ?? 'Experience',
    durationLabel: item.durationLabel ?? '2 hours',
    groupCapacity: extractCapacity(item.groupSizeLabel),
    priceUsd: extractPrice(item.price),
    locationLabel: item.locationLabel ?? '',
    town: item.geography?.town ?? '',
    region: item.geography?.region ?? 'Namibia',
    countryCode: item.countryCode ?? 'NA',
    countryLabel: item.countryLabel ?? 'Namibia',
    planningLocationId: item.planningLocationId ?? 'namibia',
    coordinate: formatCoordinate(item.coordinate),
    imageUri: item.imageUri ?? '',
    galleryImages: (item.galleryImages ?? []).join('\n'),
    availabilityLabel: item.booking?.availabilityLabel ?? 'Open daily',
    confirmMode: item.booking?.confirmMode ?? 'Request to book',
    includes: (item.includes ?? []).join('\n'),
    linkedLocationSlug: linkedLocation?.slug ?? '',
  };
}

function stayFormFromItem(item: any, locations: any[]): StayForm {
  const linkedLocation = locations.find((location) => location._id === item.linkedLocationId);
  return {
    name: item.name ?? '',
    locationLabel: item.locationLabel ?? '',
    town: item.town ?? '',
    region: item.region ?? 'Namibia',
    countryCode: item.countryCode ?? 'NA',
    countryLabel: item.countryLabel ?? 'Namibia',
    planningLocationId: item.planningLocationId ?? 'namibia',
    summary: item.summary ?? '',
    coordinate: formatCoordinate(item.coordinate),
    imageUri: item.imageUri ?? '',
    galleryImages: (item.galleryImages ?? []).join('\n'),
    priceUsd: String(item.pricePerNight ?? 120),
    currencyCode: item.currencyCode ?? 'USD',
    rating: String(item.rating ?? 4.8),
    reviewCount: String(item.reviewCount ?? 0),
    bookingNote: item.bookingNote ?? 'Request to reserve this stay.',
    stayStyle: normalizeStayStyle(item.stayStyle ?? 'lodge'),
    routeVibe: normalizeRouteVibe(item.routeVibe ?? 'wildlife stop'),
    sleepSignal: item.sleepSignal ?? 'Curated stay',
    idealFor: (item.idealFor ?? []).join('\n'),
    amenities: (item.amenities ?? []).join('\n'),
    nearbyHighlights: (item.nearbyHighlights ?? []).join('\n'),
    linkedLocationSlug: linkedLocation?.slug ?? '',
  };
}

function requireText(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function requireStorageId(storageId: Id<'_storage'> | null) {
  if (!storageId) {
    throw new Error('Upload a place image before saving.');
  }
  return storageId;
}

function optionalArg<Key extends string>(key: Key, value: string) {
  const trimmed = value.trim();
  return trimmed ? ({ [key]: trimmed } as Record<Key, string>) : {};
}

function parseCoordinate(value: string) {
  const [lngRaw, latRaw] = value.split(',').map((part) => part.trim());
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new Error('Coordinate must be "longitude, latitude".');
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new Error('Coordinate is outside valid map bounds.');
  }
  return [lng, lat];
}

function parseCoordinateOrDefault(value: string): readonly [number, number] {
  try {
    const coordinate = parseCoordinate(value);
    return [coordinate[0], coordinate[1]];
  } catch {
    return DEFAULT_LOCATION_COORDINATE;
  }
}

async function optimizePickedImage(asset: ImagePicker.ImagePickerAsset) {
  const response = await fetch(asset.uri);
  const originalBlob = await response.blob();
  const originalMimeType = asset.mimeType ?? originalBlob.type ?? 'image/jpeg';

  if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      blob: originalBlob,
      mimeType: originalMimeType,
      previewUri: asset.uri,
    };
  }

  try {
    return await optimizeImageBlobForWeb(originalBlob, originalMimeType, asset.uri);
  } catch {
    return {
      blob: originalBlob,
      mimeType: originalMimeType,
      previewUri: asset.uri,
    };
  }
}

async function optimizeImageBlobForWeb(originalBlob: Blob, originalMimeType: string, fallbackPreviewUri: string) {
  const image = await loadImageElement(originalBlob);
  const scale = Math.min(1, MAX_OPTIMIZED_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return {
      blob: originalBlob,
      mimeType: originalMimeType,
      previewUri: fallbackPreviewUri,
    };
  }

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  const candidate = await canvasToBlob(canvas, 'image/webp', IMAGE_UPLOAD_QUALITY);
  const optimizedBlob =
    candidate && (candidate.size < originalBlob.size || (originalBlob.size > 8_000_000 && candidate.size <= 8_000_000))
      ? candidate
      : originalBlob;
  const mimeType = optimizedBlob === candidate ? 'image/webp' : originalMimeType;

  return {
    blob: optimizedBlob,
    mimeType,
    previewUri: optimizedBlob === originalBlob ? fallbackPreviewUri : URL.createObjectURL(optimizedBlob),
  };
}

function loadImageElement(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read that image.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

function parseList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMediaList(value: string, fallback: string) {
  const items = parseList(value);
  const image = fallback.trim();
  return items.length > 0 ? items : image ? [image] : [];
}

function parseMoney(value: string) {
  return Math.max(0, parseNumber(value, 0));
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseInteger(value: string, fallback: number) {
  return Math.max(0, Math.round(parseNumber(value, fallback)));
}

function extractPrice(value?: string) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? String(parsed) : '0';
}

function extractCapacity(value?: string) {
  const parsed = Number(String(value ?? '').replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '6';
}

function normalizeStayStyle(value: string): StayForm['stayStyle'] {
  if (value === 'design' || value === 'lodge' || value === 'roadside' || value === 'wellness') {
    return value;
  }
  return 'lodge';
}

function normalizeRouteVibe(value: string): StayForm['routeVibe'] {
  if (value === 'city reset' || value === 'coast base' || value === 'wildlife stop' || value === 'desert night') {
    return value;
  }
  return 'wildlife stop';
}

function getLinkedLocationId(locations: any[], slug: string) {
  const trimmed = slug.trim();
  if (!trimmed) {
    return null;
  }
  return locations.find((location) => location.slug === trimmed)?._id ?? null;
}

function buildDefaultBookingProfile(form: StayForm) {
  const roomLabel = form.name.trim() ? `${form.name.trim()} room` : 'Standard room';
  return {
    roomOptions: [
      {
        id: 'standard',
        label: roomLabel,
        detail: form.sleepSignal.trim() || 'Curated stay room',
        maxAdults: 2,
        maxChildren: 1,
        maxRooms: 3,
        bedOptions: [{ id: 'queen', label: 'Queen bed' }],
      },
    ],
    arrivalOptions: [
      { id: 'afternoon', label: 'After 2 PM' },
      { id: 'evening', label: 'After 6 PM' },
    ],
    defaultRoomOptionId: 'standard',
    defaultArrivalOptionId: 'afternoon',
  };
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  embeddedRoot: {
    backgroundColor: designSystem.colors.darkBackground,
    flex: 1,
    minHeight: 0,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: designSystem.colors.ink,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  tabs: {
    paddingRight: 0,
  },
  tab: {
    minWidth: 116,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusFilter: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusFilterText: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  statusFilterTextInactive: {
    color: designSystem.colors.darkText,
  },
  busyText: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  workspace: {
    flexDirection: 'row',
    gap: 14,
  },
  workspaceCompact: {
    flexDirection: 'column',
  },
  listPane: {
    backgroundColor: designSystem.colors.darkSurface,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
    width: 320,
  },
  listPaneCompact: {
    width: '100%',
  },
  editorPane: {
    backgroundColor: designSystem.colors.darkSurface,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 18,
    minWidth: 0,
    padding: 14,
  },
  editorPaneCompact: {
    width: '100%',
  },
  paneTitle: {
    color: designSystem.colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  emptyText: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  editorHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  editorSubtitle: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  editorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 13,
  },
  actionPrimary: {
    backgroundColor: designSystem.colors.lime,
  },
  actionSecondary: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderWidth: 1,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  actionLabelSecondary: {
    color: designSystem.colors.darkText,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  flexText: {
    flex: 1,
    minWidth: 0,
  },
  field: {
    gap: 6,
    width: '48.5%',
  },
  fieldWide: {
    width: '100%',
  },
  fieldLabel: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  fieldHint: {
    color: designSystem.colors.darkMutedText,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  mediaFieldHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  uploadButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  uploadButtonText: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  imagePreviewFrame: {
    aspectRatio: 16 / 9,
    backgroundColor: designSystem.colors.charcoalSoft,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  imagePreview: {
    height: '100%',
    width: '100%',
  },
  imagePreviewEmpty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  coordinateLabel: {
    color: designSystem.colors.darkMutedText,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 16,
  },
  mapPickerFrame: {
    backgroundColor: designSystem.colors.charcoalSoft,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    height: 280,
    overflow: 'hidden',
    width: '100%',
  },
  mapPicker: {
    flex: 1,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  recordRow: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    padding: 10,
  },
  recordText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  recordTitle: {
    color: designSystem.colors.ink,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  recordMeta: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    lineHeight: 15,
  },
  recordActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusLive: {
    backgroundColor: designSystem.colors.lime,
  },
  statusDraft: {
    backgroundColor: designSystem.colors.darkSurface,
  },
  statusArchived: {
    backgroundColor: designSystem.colors.darkBorderSoft,
  },
  statusText: {
    color: designSystem.colors.darkGreen,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
    textTransform: 'capitalize',
  },
  statusTextMuted: {
    color: designSystem.colors.darkText,
  },
});
