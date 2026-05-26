import { ThemedText } from '@/components/themed-text';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassButton } from '@/components/ui/glass-button';
import { WandrAvatar } from '@/components/wandr/avatar';
import { styles } from '@/components/wandr/trip/trip-screen.styles';
import { TripLoadingScreen, TripScreenView } from '@/components/wandr/trip/trip-screen-view';
import { designSystem } from '@/constants/design-system';
import { getPlanningLocationCenterCoordinate } from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { usePlanningLocation, useSyncPlanningLocationWithCurrentLocation } from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
import { createTripRef, deleteTripRef, getTripDashboardRef, getTripSettingsRef, inviteFriendsToTripRef, listUserTripsRef, removeExperienceFromTripRef, updateTripSettingsRef } from '@/lib/convex';
import { orderTripsByPlanningCountry } from '@/lib/trip-ordering';
import type { TripDashboard } from '@/types/trip';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GlobeHemisphereWest, LockSimple, PencilSimple, UsersThree } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();
  const { isLargeScreen } = useResponsive();

  if (traveler === undefined || traveler === null) {
    return (
      <TripLoadingScreen
        insetsBottom={insets.bottom}
        insetsTop={insets.top}
        isDark={isDark}
        isLargeScreen={isLargeScreen}
      />
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
  const params = useLocalSearchParams<{ tripId?: string | string[] }>();
  const routeTripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const trips = useQuery(listUserTripsRef, { travelerSlug });
  const { coordinate: currentLocation } = useCurrentLocation();
  useSyncPlanningLocationWithCurrentLocation(currentLocation);
  const { planningLocation } = usePlanningLocation();
  const planningCenterCoordinate = getPlanningLocationCenterCoordinate(planningLocation);
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
  const [settingsLoadedTripId, setSettingsLoadedTripId] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [invitingFriendSlug, setInvitingFriendSlug] = useState<string | null>(null);
  const [lastResolvedTrip, setLastResolvedTrip] = useState<TripDashboard | null>(null);
  const { isLargeScreen } = useResponsive();

  useEffect(() => {
    if (orderedTrips.length === 0) {
      return;
    }

    if (routeTripId && orderedTrips.some((candidate) => candidate._id === routeTripId)) {
      setSelectedTripId(routeTripId);
      return;
    }

    const hasSelection = orderedTrips.some((candidate) => candidate._id === selectedTripId);
    if (!selectedTripId || !hasSelection) {
      setSelectedTripId(orderedTrips[0]._id);
    }
  }, [orderedTrips, routeTripId, selectedTripId]);

  useEffect(() => {
    if (!tripSettings || tripSettings.tripId === settingsLoadedTripId) {
      return;
    }

    setSettingsName(tripSettings.name);
    setSettingsVisibility(tripSettings.visibility);
    setSettingsLoadedTripId(tripSettings.tripId);
  }, [settingsLoadedTripId, tripSettings]);

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
      setSettingsLoadedTripId(tripSettings.tripId);
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
      <TripLoadingScreen
        insetsBottom={insetsBottom}
        insetsTop={insetsTop}
        isDark={isDark}
        isLargeScreen={isLargeScreen}
      />
    );
  }

  return (
    <>
      <TripScreenView
        insetsBottom={insetsBottom}
        insetsTop={insetsTop}
        isDark={isDark}
        router={router}
        planningCenterCoordinate={planningCenterCoordinate}
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
                                <WandrAvatar
                                  name={friend.name || friend.slug || 'Traveler'}
                                  paletteKey={friend.slug}
                                  size={38}
                                  uri={friend.avatarUri}
                                  style={styles.avatarImage}
                                />
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
