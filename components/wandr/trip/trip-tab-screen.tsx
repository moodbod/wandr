import { ThemedText } from '@/components/themed-text';
import { Sheet, SheetTextInput, SheetView, SheetRef } from '@/components/ui/sheet';
import { styles } from '@/components/wandr/trip/trip-screen.styles';
import { TripLoadingScreen, TripScreenView } from '@/components/wandr/trip/trip-screen-view';
import { TripSettingsSheet } from '@/components/wandr/trip/trip-settings-sheet';
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
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable } from 'react-native';
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
  const currentLocationState = useCurrentLocation();
  const { coordinate: currentLocation } = currentLocationState;
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
  const createSheetRef = useRef<SheetRef>(null);
  const settingsSheetRef = useRef<SheetRef>(null);
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
      if (routeTripId !== selectedTripId) {
        return deferStateSync(() => setSelectedTripId(routeTripId));
      }
      return;
    }

    const hasSelection = orderedTrips.some((candidate) => candidate._id === selectedTripId);
    if (!selectedTripId || !hasSelection) {
      return deferStateSync(() => setSelectedTripId(orderedTrips[0]._id));
    }
  }, [orderedTrips, routeTripId, selectedTripId]);

  useEffect(() => {
    if (!tripSettings || tripSettings.tripId === settingsLoadedTripId) {
      return;
    }

    return deferStateSync(() => {
      setSettingsName(tripSettings.name);
      setSettingsVisibility(tripSettings.visibility);
      setSettingsLoadedTripId(tripSettings.tripId);
    });
  }, [settingsLoadedTripId, tripSettings]);

  useEffect(() => {
    if (trip) {
      return deferStateSync(() => setLastResolvedTrip(trip));
    }

    if (!selectedTripId) {
      return deferStateSync(() => setLastResolvedTrip(null));
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
        currentLocation={currentLocationState}
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

      <Sheet
        ref={createSheetRef}
        index={-1}
        snapPoints={['40%']}
        enablePanDownToClose
      >
        <SheetView style={styles.sheetContent}>
          <ThemedText style={styles.sheetTitle}>Create New Trip</ThemedText>
          <SheetTextInput
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
        </SheetView>
      </Sheet>

      <TripSettingsSheet
        ref={settingsSheetRef}
        insetsBottom={insetsBottom}
        invitingFriendSlug={invitingFriendSlug}
        isDark={isDark}
        isSaving={isSavingSettings}
        name={settingsName}
        tripSettings={tripSettings}
        visibility={settingsVisibility}
        onChangeName={setSettingsName}
        onChangeVisibility={setSettingsVisibility}
        onEditItinerary={() => {
          settingsSheetRef.current?.close();
          setIsEditing(true);
        }}
        onInviteFriend={handleInviteFriend}
        onSave={handleSaveSettings}
      />
    </>
  );
}
