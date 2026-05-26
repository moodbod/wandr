import { useMutation, useQuery } from 'convex/react';
import { Check, Plus, X } from 'phosphor-react-native';
import type React from 'react';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';
import { ThemedText } from '@/components/themed-text';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { LargeScreenPanel } from '@/components/wandr/large-screen-workspace';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  type ContentStatus,
  type CuratedContentKind,
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
  coordinate: '17.0832, -22.5597',
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
        imageUri: locationForm.imageUri.trim(),
        galleryImages: parseMediaList(locationForm.galleryImages, locationForm.imageUri),
        visitTips: parseList(locationForm.visitTips),
        ...optionalArg('sectionsTitle', locationForm.sectionsTitle),
        status,
      });
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
            {statusFilters.map((filter) => (
              <Pressable
                key={filter.key}
                onPress={() => setStatusFilter(filter.key)}
                style={[
                  styles.statusFilter,
                  {
                    borderColor: statusFilter === filter.key ? designSystem.colors.lime : colors.borderSoft,
                    backgroundColor: statusFilter === filter.key ? designSystem.colors.lime : colors.surface,
                  },
                ]}
              >
                <ThemedText style={styles.statusFilterText}>{filter.label}</ThemedText>
              </Pressable>
            ))}
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
                <LocationEditor form={locationForm} onChange={setLocationForm} />
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

function LocationEditor({ form, onChange }: { form: LocationForm; onChange: (form: LocationForm) => void }) {
  return (
    <View style={styles.formGrid}>
      <Field label="Title" value={form.title} onChangeText={(title) => onChange({ ...form, title })} />
      <Field label="Category" value={form.category} onChangeText={(category) => onChange({ ...form, category })} />
      <Field label="Location label" value={form.locationLabel} onChangeText={(locationLabel) => onChange({ ...form, locationLabel })} />
      <Field label="Town" value={form.town} onChangeText={(town) => onChange({ ...form, town })} />
      <Field label="Region" value={form.region} onChangeText={(region) => onChange({ ...form, region })} />
      <Field label="Coordinate" value={form.coordinate} onChangeText={(coordinate) => onChange({ ...form, coordinate })} />
      <Field label="Image URL" value={form.imageUri} onChangeText={(imageUri) => onChange({ ...form, imageUri })} />
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
  const status = (item.status ?? 'live') as ContentStatus;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.recordRow,
        {
          borderColor: isSelected ? designSystem.colors.lime : designSystem.colors.borderSoft,
          backgroundColor: isSelected ? designSystem.colors.whiteGlassStrong : designSystem.colors.surface,
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
            <X color={designSystem.colors.mutedText} size={13} weight="bold" />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function StatusPill({ status }: { status: ContentStatus }) {
  return (
    <View style={[styles.statusPill, status === 'live' ? styles.statusLive : status === 'draft' ? styles.statusDraft : styles.statusArchived]}>
      <ThemedText style={styles.statusText}>{status}</ThemedText>
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
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        variant === 'primary' ? styles.actionPrimary : styles.actionSecondary,
        disabled && styles.actionDisabled,
      ]}
    >
      {icon}
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
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
  return [lng, lat];
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
    backgroundColor: designSystem.colors.surface,
    borderColor: designSystem.colors.borderSoft,
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
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    backgroundColor: designSystem.colors.white,
    borderColor: designSystem.colors.borderSoft,
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
    backgroundColor: designSystem.colors.surface,
  },
  statusArchived: {
    backgroundColor: designSystem.colors.borderSoft,
  },
  statusText: {
    color: designSystem.colors.darkGreen,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
    textTransform: 'capitalize',
  },
});
