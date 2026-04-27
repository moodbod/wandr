import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { WandrHeader } from '@/components/wandr/header';
import {
  TripSwitcherSkeleton,
  TripTimelineSkeleton,
} from '@/components/wandr/trip/trip-skeletons';
import { TripSwitcher } from '@/components/wandr/trip/trip-switcher';
import { TripTimelineSection } from '@/components/wandr/trip/trip-timeline-section';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { createTripRef, deleteTripRef, getTripDashboardRef, listUserTripsRef, removeExperienceFromTripRef } from '@/lib/convex';
import type { TripDashboard } from '@/types/trip';
import BottomSheet, { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
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
            title: 'Trip',
            trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' }],
          }}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 120 },
          ]}>
          <TripSwitcherSkeleton />
          <TripTimelineSkeleton />
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
  const trip = useQuery(getTripDashboardRef, { 
    travelerSlug,
    tripId: selectedTripId
  });

  const createTripMutation = useMutation(createTripRef);
  const deleteTripMutation = useMutation(deleteTripRef);
  const removeExperienceFromTripMutation = useMutation(removeExperienceFromTripRef);
  const sheetRef = useRef<BottomSheet>(null);
  const [newTripName, setNewTripName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!trips || trips.length === 0) {
      return;
    }

    const hasSelection = trips.some((candidate) => candidate._id === selectedTripId);
    if (!selectedTripId || !hasSelection) {
      setSelectedTripId(trips[0]._id);
    }
  }, [selectedTripId, trips]);

  const handleCreateTrip = async () => {
    if (!newTripName.trim()) return;
    setIsCreating(true);
    try {
      const tripId = await createTripMutation({
        name: newTripName.trim(),
        travelerSlug,
      });
      setSelectedTripId(tripId);
      setNewTripName('');
      sheetRef.current?.close();
    } catch (error) {
      console.error('Failed to create trip', error);
    } finally {
      setIsCreating(false);
    }
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

  if (!trip) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader
          config={{
            overlay: true,
            title: 'Trip',
            trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' }],
          }}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + 120 },
          ]}>
          <TripSwitcherSkeleton />
          <TripTimelineSkeleton />
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
        trip={trip}
        trips={trips || []}
        selectedTripId={selectedTripId}
        onDeleteTrip={handleDeleteTrip}
        onSelectTrip={setSelectedTripId}
        onCreateTripPress={() => sheetRef.current?.snapToIndex(0)}
        isEditing={isEditing}
        onRemoveItem={handleRemoveItem}
        onToggleEditing={() => setIsEditing((current) => !current)}
        removingItemId={removingItemId}
        useSkeletons={false}
      />

      <GlassBottomSheet
        ref={sheetRef}
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
            style={[styles.actionBtn, styles.actionBtnPrimary, isCreating && { opacity: 0.6 }]}
            onPress={handleCreateTrip}
            disabled={isCreating}
          >
            <ThemedText style={styles.actionBtnPrimaryText}>
              {isCreating ? 'Creating...' : 'Create Trip'}
            </ThemedText>
          </Pressable>
        </BottomSheetView>
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
  onToggleEditing,
  removingItemId,
  useSkeletons,
}: {
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
  router: ReturnType<typeof useRouter>;
  trip: TripDashboard;
  trips: any[];
  selectedTripId?: string;
  onDeleteTrip: (id: string) => void;
  onSelectTrip: (id: string) => void;
  onCreateTripPress: () => void;
  isEditing: boolean;
  onRemoveItem: (itemId: string) => void;
  onToggleEditing: () => void;
  removingItemId: string | null;
  useSkeletons: boolean;
}) {
  const items = trip.items;

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          title: 'Trip',
          trailingActions: [
            {
              kind: isEditing ? 'check' : 'pencil',
              accessibilityLabel: isEditing ? 'Done editing trip' : 'Edit trip',
              tone: 'surface',
              onPress: onToggleEditing,
            },
            { kind: 'map', accessibilityLabel: 'Start trip', tone: 'surface', href: '/trip/map' },
            { kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' },
          ],
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + 88 },
        ]}>
        
        {/* Trip Switcher Cards */}
        <TripSwitcher
          trips={trips}
          currentTrip={trip}
          selectedTripId={selectedTripId}
          onDeleteTrip={onDeleteTrip}
          onSelectTrip={onSelectTrip}
          onNewTrip={() => router.push('/explore/search')}
        />

        {useSkeletons ? (
          <TripTimelineSkeleton />
        ) : items.length > 0 ? (
          <TripTimelineSection
            items={items}
            isEditing={isEditing}
            onRemoveItem={onRemoveItem}
            removingItemId={removingItemId}
          />
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  },
  actionBtnPrimaryText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  sheetContent: {
    flex: 1,
    padding: 24,
    gap: 20,
  },
  sheetTitle: {
    ...designSystem.type.subtitle,
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
});
