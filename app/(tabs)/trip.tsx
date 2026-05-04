import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassButton } from '@/components/ui/glass-button';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { ExperienceDetailContent } from '@/components/wandr/explore/experience-detail-content';
import { WandrHeader, type HeaderAction } from '@/components/wandr/header';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { StayDetailScreen } from '@/components/wandr/stays/stay-detail-screen';
import { TripGroupPanel } from '@/components/wandr/trip/trip-group-panel';
import { TripSwitcher } from '@/components/wandr/trip/trip-switcher';
import { TripTimelineSection } from '@/components/wandr/trip/trip-timeline-section';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { usePlanningLocation, useSyncPlanningLocationWithCurrentLocation } from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
import { createTripRef, deleteTripRef, getTripDashboardRef, getTripSettingsRef, inviteFriendsToTripRef, listUserTripsRef, removeExperienceFromTripRef, updateTripSettingsRef } from '@/lib/convex';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';
import { buildTripRouteCoordinates } from '@/lib/trip-route';
import { orderTripsByPlanningCountry } from '@/lib/trip-ordering';
import type { TripDashboard, TripDashboardItem, TripListItem } from '@/types/trip';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { GlobeHemisphereWest, LockSimple, PencilSimple, UsersThree } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();

  if (traveler === undefined || traveler === null) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader
          config={{
            overlay: true,
            trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' }],
          }}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 120 },
          ]}>
          <TripSwitcher
            isLoading
            trips={[]}
            onDeleteTrip={() => {}}
            onSelectTrip={() => {}}
            onNewTrip={() => {}}
          />
          <TripTimelineSection isLoading />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ConnectedTripScreen
      insetsBottom={insets.bottom}
      insetsTop={insets.top}
      isDark={isDark}
      router={router}
      travelerSlug={traveler.slug}
    />
  );
}

function ConnectedTripScreen({
  insetsBottom,
  insetsTop,
  isDark,
  router,
  travelerSlug,
}: {
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
  router: ReturnType<typeof useRouter>;
  travelerSlug: string;
}) {
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(undefined);
  const trips = useQuery(listUserTripsRef, { travelerSlug });
  const { coordinate: currentLocation } = useCurrentLocation();
  useSyncPlanningLocationWithCurrentLocation(currentLocation);
  const { planningLocation } = usePlanningLocation();
  const orderedTrips = useMemo(
    () => orderTripsByPlanningCountry(trips ?? [], planningLocation),
    [planningLocation, trips]
  );
  const tripSettings = useQuery(
    getTripSettingsRef,
    selectedTripId ? { travelerSlug, tripId: selectedTripId } : 'skip'
  );
  const trip = useQuery(
    getTripDashboardRef,
    selectedTripId ? { travelerSlug, tripId: selectedTripId } : { travelerSlug }
  );

  const createTripMutation = useMutation(createTripRef);
  const deleteTripMutation = useMutation(deleteTripRef);
  const inviteFriendsToTripMutation = useMutation(inviteFriendsToTripRef);
  const removeExperienceFromTripMutation = useMutation(removeExperienceFromTripRef);
  const updateTripSettingsMutation = useMutation(updateTripSettingsRef);
  const createSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const [newTripName, setNewTripName] = useState('');
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [settingsName, setSettingsName] = useState('');
  const [settingsVisibility, setSettingsVisibility] = useState<'private' | 'public'>('private');
  const [settingsSeedTripId, setSettingsSeedTripId] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [invitingFriendSlug, setInvitingFriendSlug] = useState<string | null>(null);
  const [lastResolvedTrip, setLastResolvedTrip] = useState<TripDashboard | null>(null);

  useEffect(() => {
    if (orderedTrips.length === 0) {
      return;
    }

    const hasSelection = orderedTrips.some((candidate) => candidate._id === selectedTripId);
    if (!selectedTripId || !hasSelection) {
      setSelectedTripId(orderedTrips[0]._id);
    }
  }, [orderedTrips, selectedTripId]);

  useEffect(() => {
    if (!tripSettings || tripSettings.tripId === settingsSeedTripId) {
      return;
    }

    setSettingsName(tripSettings.name);
    setSettingsVisibility(tripSettings.visibility);
    setSettingsSeedTripId(tripSettings.tripId);
  }, [settingsSeedTripId, tripSettings]);

  useEffect(() => {
    if (trip) {
      setLastResolvedTrip(trip);
      return;
    }

    if (!selectedTripId) {
      setLastResolvedTrip(null);
    }
  }, [selectedTripId, trip]);

  const handleSaveTrip = async () => {
    const trimmedName = newTripName.trim();
    if (!trimmedName) return;

    setIsSavingTrip(true);
    try {
      const tripId = await createTripMutation({
        name: trimmedName,
        travelerSlug,
      });
      setSelectedTripId(tripId);
      setNewTripName('');
      createSheetRef.current?.close();
    } catch (error) {
      console.error('Failed to create trip', error);
    } finally {
      setIsSavingTrip(false);
    }
  };

  const handleOpenCreateTrip = () => {
    setNewTripName('');
    createSheetRef.current?.snapToIndex(0);
  };

  const handleOpenSettings = () => {
    if (tripSettings) {
      setSettingsName(tripSettings.name);
      setSettingsVisibility(tripSettings.visibility);
      setSettingsSeedTripId(tripSettings.tripId);
    }
    settingsSheetRef.current?.snapToIndex(0);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (removingItemId) return;

    setRemovingItemId(itemId);
    try {
      await removeExperienceFromTripMutation({
        bookingId: itemId,
        travelerSlug,
      });
    } catch (error) {
      console.error('Failed to remove experience from trip', error);
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTripMutation({
        tripId,
        travelerSlug,
      });

      if (selectedTripId === tripId) {
        setSelectedTripId(undefined);
      }
    } catch (error) {
      console.error('Failed to delete trip', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedTripId) {
      return;
    }

    const trimmedName = settingsName.trim();
    if (!trimmedName) {
      return;
    }

    setIsSavingSettings(true);
    try {
      await updateTripSettingsMutation({
        tripId: selectedTripId,
        travelerSlug,
        name: trimmedName,
        visibility: settingsVisibility,
      });
      settingsSheetRef.current?.close();
    } catch (error) {
      console.error('Failed to update trip settings', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleInviteFriend = async (friendSlug: string) => {
    if (!selectedTripId || invitingFriendSlug) {
      return;
    }

    setInvitingFriendSlug(friendSlug);
    try {
      await inviteFriendsToTripMutation({
        tripId: selectedTripId,
        travelerSlug,
        friendSlugs: [friendSlug],
      });
    } catch (error) {
      console.error('Failed to invite friend to trip', error);
    } finally {
      setInvitingFriendSlug(null);
    }
  };

  const displayTrip = trip ?? lastResolvedTrip;
  const isInitialTripLoad = !displayTrip;

  if (isInitialTripLoad) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader
          config={{
            overlay: true,
            trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' }],
          }}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + 120 },
          ]}>
          <TripSwitcher
            isLoading
            trips={[]}
            onDeleteTrip={() => {}}
            onSelectTrip={() => {}}
            onNewTrip={() => {}}
          />
          <TripTimelineSection isLoading />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <>
      <TripScreenView
        insetsBottom={insetsBottom}
        insetsTop={insetsTop}
        isDark={isDark}
        router={router}
        trip={displayTrip}
        trips={orderedTrips}
        selectedTripId={selectedTripId}
        onDeleteTrip={handleDeleteTrip}
        onSelectTrip={setSelectedTripId}
        onCreateTripPress={handleOpenCreateTrip}
        isEditing={isEditing}
        onRemoveItem={handleRemoveItem}
        onOpenSettings={handleOpenSettings}
        onToggleEditing={() => setIsEditing((current) => !current)}
        removingItemId={removingItemId}
        useSkeletons={!trip}
      />

      <GlassBottomSheet
        ref={createSheetRef}
        index={-1}
        snapPoints={['40%']}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.sheetContent}>
          <ThemedText style={styles.sheetTitle}>Create New Trip</ThemedText>
          <BottomSheetTextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Trip Name (e.g. Namibia Road Trip)"
            placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
            value={newTripName}
            onChangeText={setNewTripName}
          />
          <Pressable 
            style={[styles.actionBtn, styles.actionBtnPrimary, isSavingTrip && { opacity: 0.6 }]}
            onPress={handleSaveTrip}
            disabled={isSavingTrip}
          >
            <ThemedText style={styles.actionBtnPrimaryText}>
              {isSavingTrip ? 'Creating...' : 'Create Trip'}
            </ThemedText>
          </Pressable>
        </BottomSheetView>
      </GlassBottomSheet>

      <GlassBottomSheet
        ref={settingsSheetRef}
        index={-1}
        snapPoints={['82%']}
        enablePanDownToClose
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: insetsBottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.sheetTitle}>Edit trip</ThemedText>

          {!tripSettings ? (
            <View style={styles.loadingState}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.fieldLabel}>Trip name</ThemedText>
                <BottomSheetTextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="Trip name"
                  placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                  value={settingsName}
                  onChangeText={setSettingsName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.fieldLabel}>Visibility</ThemedText>
                <View style={styles.visibilityRow}>
                  <Pressable
                    disabled={!tripSettings.canChangeVisibility}
                    onPress={() => setSettingsVisibility('private')}
                    style={[
                      styles.visibilityOption,
                      settingsVisibility === 'private' && styles.visibilityOptionActive,
                      !tripSettings.canChangeVisibility && styles.visibilityOptionDisabled,
                    ]}>
                    <LockSimple
                      size={18}
                      weight="bold"
                      color={settingsVisibility === 'private' ? designSystem.colors.darkGreen : designSystem.colors.gray}
                    />
                    <View style={styles.visibilityCopy}>
                      <ThemedText style={styles.visibilityTitle}>Private</ThemedText>
                      <ThemedText style={styles.visibilityBody}>Only you see it until you open it up.</ThemedText>
                    </View>
                  </Pressable>
                  <Pressable
                    disabled={!tripSettings.canChangeVisibility}
                    onPress={() => setSettingsVisibility('public')}
                    style={[
                      styles.visibilityOption,
                      settingsVisibility === 'public' && styles.visibilityOptionActive,
                      !tripSettings.canChangeVisibility && styles.visibilityOptionDisabled,
                    ]}>
                    <GlobeHemisphereWest
                      size={18}
                      weight="bold"
                      color={settingsVisibility === 'public' ? designSystem.colors.darkGreen : designSystem.colors.gray}
                    />
                    <View style={styles.visibilityCopy}>
                      <ThemedText style={styles.visibilityTitle}>Public</ThemedText>
                      <ThemedText style={styles.visibilityBody}>Lets you invite friends into this trip.</ThemedText>
                    </View>
                  </Pressable>
                </View>
                {!tripSettings.canChangeVisibility ? (
                  <ThemedText style={styles.helperText}>
                    This trip already has invited members, so it stays public.
                  </ThemedText>
                ) : null}
              </View>

              {settingsVisibility === 'public' ? (
                <View style={styles.fieldGroup}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderCopy}>
                      <ThemedText style={styles.fieldLabel}>Invite friends</ThemedText>
                      <ThemedText style={styles.helperText}>
                        Invite people already on your friends list into this trip.
                      </ThemedText>
                    </View>
                    <UsersThree size={18} color={designSystem.colors.darkGreen} weight="bold" />
                  </View>

                  {tripSettings.friends.length === 0 ? (
                    <View style={styles.emptyInviteState}>
                      <ThemedText style={styles.emptyInviteTitle}>No friends yet</ThemedText>
                      <ThemedText style={styles.emptyInviteBody}>
                        Add people in Friends first, then they can be invited here.
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.friendList}>
                      {tripSettings.friends.map((friend: any) => {
                        const isInvited = tripSettings.invitedFriendSlugs.includes(friend.slug);
                        const isBusy = invitingFriendSlug === friend.slug;

                        return (
                          <View key={friend.slug} style={styles.friendRow}>
                            <View style={styles.friendIdentity}>
                              <View style={styles.avatarWrap}>
                                <FaceHashAvatar name={friend.slug ?? friend.name} size={38} uri={friend.avatarUri} style={styles.avatarImage} />
                              </View>
                              <View style={styles.friendCopy}>
                                <ThemedText style={styles.friendName}>{friend.name}</ThemedText>
                                <ThemedText style={styles.friendMeta}>{friend.baseLabel}</ThemedText>
                              </View>
                            </View>

                            <GlassButton
                              accessibilityLabel={isInvited ? `${friend.name} already invited` : `Invite ${friend.name}`}
                              onPress={isInvited ? undefined : () => handleInviteFriend(friend.slug)}
                              width={96}
                              height={40}
                              radius={20}
                              variant={isInvited ? 'subtle' : 'primary'}
                              style={isInvited ? styles.invitedButton : null}
                            >
                              <ThemedText style={isInvited ? styles.invitedButtonText : styles.inviteButtonText}>
                                {isBusy ? 'Sending' : isInvited ? 'Invited' : 'Invite'}
                              </ThemedText>
                            </GlassButton>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnPrimary, isSavingSettings && styles.actionDisabled]}
                  onPress={handleSaveSettings}
                  disabled={isSavingSettings}
                >
                  <ThemedText style={styles.actionBtnPrimaryText}>
                    {isSavingSettings ? 'Saving...' : 'Save trip settings'}
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.actionBtn, styles.actionBtnDark]}
                  onPress={() => {
                    settingsSheetRef.current?.close();
                    setIsEditing(true);
                  }}
                >
                  <View style={styles.inlineActionRow}>
                    <PencilSimple size={18} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />
                    <ThemedText style={styles.inlineActionText}>Edit itinerary</ThemedText>
                  </View>
                </Pressable>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </GlassBottomSheet>
    </>
  );
}

function TripScreenView({
  insetsBottom,
  insetsTop,
  isDark,
  router,
  trip,
  trips,
  selectedTripId,
  onDeleteTrip,
  onSelectTrip,
  onCreateTripPress,
  isEditing,
  onRemoveItem,
  onOpenSettings,
  onToggleEditing,
  removingItemId,
  useSkeletons,
}: {
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
  router: ReturnType<typeof useRouter>;
  trip: TripDashboard;
  trips: TripListItem[];
  selectedTripId?: string;
  onDeleteTrip: (id: string) => void;
  onSelectTrip: (id: string) => void;
  onCreateTripPress: () => void;
  isEditing: boolean;
  onRemoveItem: (itemId: string) => void;
  onOpenSettings: () => void;
  onToggleEditing: () => void;
  removingItemId: string | null;
  useSkeletons: boolean;
}) {
  const { isLargeScreen, isTablet } = useResponsive();
  const [detailItem, setDetailItem] = useState<TripDashboardItem | null>(null);
  const items = trip.items;
  const mapMarkers = useMemo(() => buildTripMapMarkers(trip.items, 10), [trip.items]);
  const routeCoordinates = useMemo(() => buildTripRouteCoordinates(trip, { onlyRemaining: false }), [trip]);
  const canEditTrip = !trip.isGroupTrip || Boolean(trip.group?.isHost);
  const trailingActions: HeaderAction[] = [
    ...(canEditTrip
      ? [
          {
            kind: isEditing ? 'check' : 'pencil',
            accessibilityLabel: isEditing ? 'Done editing itinerary' : 'Edit trip',
            tone: 'surface',
            onPress: isEditing ? onToggleEditing : onOpenSettings,
          } satisfies HeaderAction,
        ]
      : []),
    {
      kind: 'map',
      accessibilityLabel: 'Start trip',
      tone: 'surface',
      onPress: () =>
        router.push({
          pathname: '/trip/map',
          params: selectedTripId ? { tripId: selectedTripId } : undefined,
        }),
    },
    { kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' },
  ];

  const mainContent = (
    <>
      {!isLargeScreen ? (
        <WandrHeader
          config={{
            overlay: true,
            trailingActions,
          }}
        />
      ) : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: isLargeScreen ? insetsTop + 24 : insetsTop + 72, paddingBottom: insetsBottom + 88 },
        ]}>
        
        {/* Trip Switcher Cards */}
        <TripSwitcher
          trips={trips}
          selectedTripId={selectedTripId}
          isEditing={false}
          onDeleteTrip={onDeleteTrip}
          onSelectTrip={onSelectTrip}
          onNewTrip={() => router.push('/explore/search')}
        />

        {trip.group ? (
          <TripGroupPanel
            group={trip.group}
            onOpenChat={() => router.push(`/friends/group/${trip.group?.circleId}` as never)}
          />
        ) : null}

        {useSkeletons || items.length > 0 ? (
          <TripTimelineSection
            items={items}
            isLoading={useSkeletons}
            isEditing={isEditing}
            onOpenItem={isLargeScreen ? setDetailItem : undefined}
            onRemoveItem={onRemoveItem}
            removingItemId={removingItemId}
          />
        ) : null}
      </ScrollView>
    </>
  );

  if (isLargeScreen) {
    return (
      <ThemedView style={styles.root}>
        <View style={styles.largeBody}>
          <View
            style={[
              styles.mainColumn,
              isTablet ? styles.mainColumnTablet : styles.mainColumnDesktop,
              {
                backgroundColor: isDark ? designSystem.colors.darkBackground : designSystem.colors.background,
                borderRightColor: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
              },
            ]}
          >
            {mainContent}
          </View>
          {detailItem ? (
            <View
              style={[
                styles.detailColumn,
                isTablet ? styles.detailColumnTablet : styles.detailColumnDesktop,
                {
                  backgroundColor: isDark ? designSystem.colors.darkBackground : designSystem.colors.background,
                  borderRightColor: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
                },
              ]}
            >
              {detailItem.kind === 'stay' ? (
                <StayDetailScreen onClose={() => setDetailItem(null)} slug={detailItem.experienceSlug} />
              ) : (
                <ExperienceDetailContent
                  onClose={() => setDetailItem(null)}
                  slug={detailItem.experience.slug}
                />
              )}
            </View>
          ) : null}
          <View style={styles.mapColumn}>
            <MapPreview
              centerCoordinate={trip.centerCoordinate ?? mapMarkers[0]?.coordinate ?? null}
              markers={mapMarkers}
              routeCoordinates={routeCoordinates}
              showRoutes={routeCoordinates.length > 1}
              zoomLevel={12}
            />
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.root}>
      {mainContent}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  largeBody: {
    flex: 1,
    flexDirection: 'row',
  },
  mainColumn: {
    flexShrink: 0,
    flexGrow: 0,
    minWidth: 340,
    borderRightWidth: 1,
  },
  mainColumnTablet: {
    width: 360,
  },
  mainColumnDesktop: {
    width: 420,
  },
  detailColumn: {
    flexShrink: 0,
    flexGrow: 0,
    borderRightWidth: 1,
  },
  detailColumnTablet: {
    width: 340,
  },
  detailColumnDesktop: {
    width: 430,
  },
  mapColumn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: designSystem.colors.mapFallback,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.lg,
  },
  actionBtn: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnPrimary: {
    backgroundColor: designSystem.colors.lime,
  },
  actionBtnDark: {
    borderColor: designSystem.colors.darkBorder,
    backgroundColor: 'transparent',
  },
  actionBtnPrimaryText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  sheetContent: {
    padding: 24,
    gap: 20,
  },
  sheetTitle: {
    ...designSystem.type.subtitle,
  },
  fieldGroup: {
    gap: 12,
  },
  fieldLabel: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  input: {
    height: 64,
    borderRadius: 32,
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: 24,
    ...designSystem.type.body,
    color: designSystem.colors.ink,
  },
  inputDark: {
    backgroundColor: designSystem.colors.darkSurface,
    color: designSystem.colors.darkText,
  },
  visibilityRow: {
    gap: 12,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: designSystem.colors.scrimFaint,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  visibilityOptionActive: {
    backgroundColor: designSystem.colors.limeSoft,
    borderColor: designSystem.colors.borderAccent,
  },
  visibilityOptionDisabled: {
    opacity: 0.75,
  },
  visibilityCopy: {
    flex: 1,
    gap: 2,
  },
  visibilityTitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  visibilityBody: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  emptyInviteState: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: designSystem.colors.scrimFaint,
    gap: 4,
  },
  emptyInviteTitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  emptyInviteBody: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  friendList: {
    gap: 12,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  friendIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surfaceMuted,
  },
  avatarFallbackText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  friendCopy: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  friendMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  inviteButtonText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  invitedButton: {
    opacity: 0.8,
  },
  invitedButtonText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineActionText: {
    ...designSystem.type.bodyStrong,
  },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
