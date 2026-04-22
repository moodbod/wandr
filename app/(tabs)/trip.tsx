import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Id } from '@/convex/_generated/dataModel';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassButton } from '@/components/ui/glass-button';
import { WandrHeader } from '@/components/wandr/header';
import {
  TripTimelineSkeleton,
} from '@/components/wandr/trip/trip-skeletons';
import { TripSwitcher } from '@/components/wandr/trip/trip-switcher';
import { TripTimelineSection } from '@/components/wandr/trip/trip-timeline-section';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createTripRef, deleteTripRef, getTripDashboardRef, listUserTripsRef, recordTripArrivalRef, removeExperienceFromTripRef } from '@/lib/convex';
import { currentDemoTravelerSlug } from '@/lib/demo-session';
import { ensureNotificationSetupAsync, presentArrivalNotification, presentRatingNotification } from '@/lib/notifications';
import type { TripDashboard } from '@/types/trip';
import BottomSheet, { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { Link, useRouter } from 'expo-router';
import { BellRinging, MapTrifold, Star } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  return (
    <ConnectedTripScreen
      insetsBottom={insets.bottom}
      insetsTop={insets.top}
      isDark={isDark}
      router={router}
    />
  );
}

function ConnectedTripScreen({
  insetsBottom,
  insetsTop,
  isDark,
  router,
}: {
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(undefined);
  const trips = useQuery(listUserTripsRef, { travelerSlug: currentDemoTravelerSlug });
  const trip = useQuery(getTripDashboardRef, { 
    travelerSlug: currentDemoTravelerSlug,
    tripId: selectedTripId
  });

  const createTripMutation = useMutation(createTripRef);
  const deleteTripMutation = useMutation(deleteTripRef);
  const recordTripArrivalMutation = useMutation(recordTripArrivalRef);
  const removeExperienceFromTripMutation = useMutation(removeExperienceFromTripRef);
  const sheetRef = useRef<BottomSheet>(null);
  const [newTripName, setNewTripName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [notificationTestState, setNotificationTestState] = useState<string | null>(null);
  const [isTestingArrival, setIsTestingArrival] = useState(false);
  const [isTestingRating, setIsTestingRating] = useState(false);

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
        travelerSlug: currentDemoTravelerSlug,
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
        travelerSlug: currentDemoTravelerSlug,
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
        travelerSlug: currentDemoTravelerSlug,
      });

      if (selectedTripId === tripId) {
        setSelectedTripId(undefined);
      }
    } catch (error) {
      console.error('Failed to delete trip', error);
    }
  };

  const handleTestArrivalNotification = async () => {
    const activeItem = trip?.activeItem;
    if (!activeItem) {
      setNotificationTestState('Add a stop to this trip before testing notifications.');
      return;
    }

    setIsTestingArrival(true);
    setNotificationTestState(null);

    try {
      const permissionsGranted = await ensureNotificationSetupAsync();
      if (!permissionsGranted) {
        setNotificationTestState('Notification permission is required to test this flow.');
        return;
      }

      const result = await recordTripArrivalMutation({
        bookingId: activeItem._id as Id<'experienceBookings'>,
        travelerSlug: currentDemoTravelerSlug,
        source: 'manual',
      });

      await presentArrivalNotification({
        kind: 'arrival',
        bookingId: activeItem._id,
        experienceSlug: activeItem.experienceSlug,
        title: activeItem.experience.title,
        locationLabel: activeItem.experience.locationLabel,
        imageUri: activeItem.experience.imageUri,
      });

      setNotificationTestState(
        result.created
          ? 'Arrival saved to the backend and a notification was sent.'
          : 'Arrival was already saved before, but a fresh notification was still sent.'
      );
    } catch (error) {
      console.error('Failed to test arrival notification', error);
      setNotificationTestState('Arrival test failed. Check the console for details.');
    } finally {
      setIsTestingArrival(false);
    }
  };

  const handleTestRatingNotification = async () => {
    const activeItem = trip?.activeItem ?? trip?.items[0];
    if (!activeItem) {
      setNotificationTestState('Add a stop to this trip before testing notifications.');
      return;
    }

    setIsTestingRating(true);
    setNotificationTestState(null);

    try {
      const permissionsGranted = await ensureNotificationSetupAsync();
      if (!permissionsGranted) {
        setNotificationTestState('Notification permission is required to test this flow.');
        return;
      }

      await presentRatingNotification({
        kind: 'rating',
        bookingId: activeItem._id,
        experienceSlug: activeItem.experienceSlug,
        title: activeItem.experience.title,
        locationLabel: activeItem.experience.locationLabel,
        imageUri: activeItem.experience.imageUri,
      });

      setNotificationTestState('Rating notification sent. Tap it to reopen the app and show the rating sheet.');
    } catch (error) {
      console.error('Failed to test rating notification', error);
      setNotificationTestState('Rating test failed. Check the console for details.');
    } finally {
      setIsTestingRating(false);
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
        notificationTestState={notificationTestState}
        onTestArrivalNotification={handleTestArrivalNotification}
        onTestRatingNotification={handleTestRatingNotification}
        isTestingArrival={isTestingArrival}
        isTestingRating={isTestingRating}
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
  notificationTestState,
  onTestArrivalNotification,
  onTestRatingNotification,
  isTestingArrival,
  isTestingRating,
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
  notificationTestState: string | null;
  onTestArrivalNotification: () => void;
  onTestRatingNotification: () => void;
  isTestingArrival: boolean;
  isTestingRating: boolean;
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

        {items.length > 0 ? (
          <View style={[styles.notificationLab, isDark && styles.notificationLabDark]}>
            <View style={styles.notificationLabHeader}>
              <View style={styles.notificationLabCopy}>
                <ThemedText style={styles.notificationLabEyebrow}>Notification Lab</ThemedText>
                <ThemedText style={styles.notificationLabTitle}>Test arrival and rating prompts</ThemedText>
                <ThemedText style={[styles.notificationLabBody, isDark && styles.notificationLabBodyDark]}>
                  These buttons use the real backend and the same notification payloads as the live trip flow.
                </ThemedText>
              </View>
            </View>

            <View style={styles.notificationLabActions}>
              <Pressable
                style={[styles.labButton, styles.labButtonPrimary, isTestingArrival && styles.labButtonDisabled]}
                disabled={isTestingArrival}
                onPress={onTestArrivalNotification}>
                <BellRinging size={18} color={designSystem.colors.darkGreen} weight="bold" />
                <ThemedText style={styles.labButtonPrimaryText}>
                  {isTestingArrival ? 'Sending arrival...' : 'Test arrival notification'}
                </ThemedText>
              </Pressable>

              <Pressable
                style={[styles.labButton, styles.labButtonSecondary, isDark && styles.labButtonSecondaryDark, isTestingRating && styles.labButtonDisabled]}
                disabled={isTestingRating}
                onPress={onTestRatingNotification}>
                <Star size={18} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />
                <ThemedText style={[styles.labButtonSecondaryText, isDark && styles.labButtonSecondaryTextDark]}>
                  {isTestingRating ? 'Sending rating...' : 'Test rating notification'}
                </ThemedText>
              </Pressable>
            </View>

            {notificationTestState ? (
              <View style={[styles.notificationLabStatus, isDark && styles.notificationLabStatusDark]}>
                <ThemedText style={[styles.notificationLabStatusText, isDark && styles.notificationLabStatusTextDark]}>
                  {notificationTestState}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}

        {useSkeletons ? (
          <TripTimelineSkeleton />
        ) : items.length === 0 ? (
          <View style={[styles.emptyState, isDark && styles.emptyStateDark]}>
            <ThemedText style={styles.emptyTitle}>No plans yet</ThemedText>
            <ThemedText style={[styles.emptyDesc, isDark && styles.emptyDescDark]}>
              Head over to Explore to book experiences and add them to your trip.
            </ThemedText>
            <Link href="/explore/search" asChild>
              <GlassButton
                variant="primary"
                width={240}
                height={64}
                style={{ marginTop: 16 }}
              >
                <View style={styles.emptyActionBtnContent}>
                  <ThemedText style={styles.actionBtnPrimaryText}>Explore Experiences</ThemedText>
                  <MapTrifold size={20} color={designSystem.colors.darkGreen} weight="bold" />
                </View>
              </GlassButton>
            </Link>
          </View>
        ) : (
          <TripTimelineSection
            items={items}
            isEditing={isEditing}
            onRemoveItem={onRemoveItem}
            removingItemId={removingItemId}
          />
        )}
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
  emptyState: {
    padding: 40,
    borderRadius: 36,
    backgroundColor: designSystem.colors.surface,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorder,
    borderWidth: 1,
  },
  emptyTitle: {
    ...designSystem.type.title,
    color: designSystem.colors.ink,
  },
  emptyDesc: {
    ...designSystem.type.body,
    color: designSystem.colors.gray,
    textAlign: 'center',
  },
  emptyDescDark: {
    color: designSystem.colors.darkMutedText,
  },
  emptyActionBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationLab: {
    borderRadius: 32,
    backgroundColor: '#eef7e7',
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.08)',
    padding: 20,
    gap: 16,
  },
  notificationLabDark: {
    backgroundColor: '#182014',
    borderColor: designSystem.colors.darkBorder,
  },
  notificationLabHeader: {
    gap: 8,
  },
  notificationLabCopy: {
    gap: 6,
  },
  notificationLabEyebrow: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  notificationLabTitle: {
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  notificationLabBody: {
    ...designSystem.type.body,
    color: designSystem.colors.warmDark,
  },
  notificationLabBodyDark: {
    color: designSystem.colors.darkMutedText,
  },
  notificationLabActions: {
    gap: 12,
  },
  labButton: {
    minHeight: 56,
    borderRadius: designSystem.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  labButtonPrimary: {
    backgroundColor: designSystem.colors.lime,
  },
  labButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.08)',
  },
  labButtonSecondaryDark: {
    backgroundColor: 'rgba(249,249,246,0.06)',
    borderColor: designSystem.colors.darkBorder,
  },
  labButtonDisabled: {
    opacity: 0.6,
  },
  labButtonPrimaryText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  labButtonSecondaryText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  labButtonSecondaryTextDark: {
    color: designSystem.colors.darkText,
  },
  notificationLabStatus: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notificationLabStatusDark: {
    backgroundColor: 'rgba(249,249,246,0.06)',
  },
  notificationLabStatusText: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.warmDark,
  },
  notificationLabStatusTextDark: {
    color: designSystem.colors.darkMutedText,
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
