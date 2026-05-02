import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import { WandrHeader } from '@/components/wandr/header';
import { TripFilterTabs } from '@/components/wandr/trip/trip-filter-tabs';
import { TripTimelineSkeleton } from '@/components/wandr/trip/trip-skeletons';
import { TripTimelineSection } from '@/components/wandr/trip/trip-timeline-section';
import { designSystem } from '@/constants/design-system';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { usePlanningLocation, useSyncPlanningLocationWithCurrentLocation } from '@/hooks/use-planning-location';
import { getTripDashboardRef, listUserTripsRef } from '@/lib/convex';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';
import { orderTripsByPlanningCountry } from '@/lib/trip-ordering';
import { buildTripRouteCoordinates } from '@/lib/trip-route';
import type { TripDashboard, TripListItem } from '@/types/trip';

export default function TripMapScreen() {
  return <ConnectedTripMapScreen />;
}

function ConnectedTripMapScreen() {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['34%', '64%', '100%'], []);
  const animatedIndex = useSharedValue(0);
  const traveler = useCurrentTraveler();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(
    typeof params.tripId === 'string' ? params.tripId : undefined
  );
  const [lastResolvedTrip, setLastResolvedTrip] = useState<TripDashboard | null>(null);
  const trips = useQuery(listUserTripsRef, { travelerSlug: traveler?.slug ?? '' });
  const { coordinate: currentLocation, heading: currentHeading } = useCurrentLocation();
  useSyncPlanningLocationWithCurrentLocation(currentLocation);
  const { planningLocation } = usePlanningLocation();
  const orderedTrips = useMemo(
    () => orderTripsByPlanningCountry(trips ?? [], planningLocation),
    [planningLocation, trips]
  );

  const trip = useQuery(getTripDashboardRef, { 
    travelerSlug: traveler?.slug ?? '',
    tripId: selectedTripId,
  });
  useEffect(() => {
    if (orderedTrips.length === 0) {
      return;
    }

    const hasSelectedTrip = orderedTrips.some((candidate) => candidate._id === selectedTripId);
    if (!selectedTripId || !hasSelectedTrip) {
      setSelectedTripId(orderedTrips[0]._id);
    }
  }, [orderedTrips, selectedTripId]);

  useEffect(() => {
    if (trip) {
      setLastResolvedTrip(trip);
      return;
    }

    if (!selectedTripId) {
      setLastResolvedTrip(null);
    }
  }, [selectedTripId, trip]);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingTop: interpolate(animatedIndex.value, [1, 2], [0, insets.top], 'clamp'),
    };
  });

  const displayTrip = trip ?? lastResolvedTrip;

  if (!traveler || !displayTrip) {
    return <TripMapLoadingScreen insetsTop={insets.top} />;
  }

  return (
    <TripMapScreenView
      animatedIndex={animatedIndex}
      currentHeading={currentHeading}
      currentLocation={currentLocation}
      headerAnimatedStyle={headerAnimatedStyle}
      insetsTop={insets.top}
      sheetRef={sheetRef}
      snapPoints={snapPoints}
      trip={displayTrip}
      trips={orderedTrips}
      selectedTripId={selectedTripId}
      onSelectTrip={setSelectedTripId}
      useSkeletons={false}
    />
  );
}

function TripMapLoadingScreen({ insetsTop }: { insetsTop: number }) {
  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          title: 'Trip Map',
        }}
      />
      <View style={styles.body}>
        <View style={styles.mapLayer}>
          <SkeletonBlock style={styles.mapSkeleton} />
        </View>
        <View style={[styles.loadingSheet, { paddingTop: insetsTop + 12 }]}>
          <TripTimelineSkeleton />
        </View>
      </View>
    </ThemedView>
  );
}

function TripMapScreenView({
  animatedIndex,
  currentHeading,
  currentLocation,
  headerAnimatedStyle,
  insetsTop,
  sheetRef,
  snapPoints,
  trip,
  trips,
  selectedTripId,
  onSelectTrip,
  useSkeletons,
}: {
  animatedIndex?: ReturnType<typeof useSharedValue<number>>;
  currentHeading?: number | null;
  currentLocation?: readonly [number, number] | null;
  headerAnimatedStyle?: object;
  insetsTop: number;
  sheetRef?: React.RefObject<BottomSheet | null>;
  snapPoints?: (string | number)[];
  trip: TripDashboard;
  trips: readonly TripListItem[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
  useSkeletons: boolean;
}) {
  const [mapResetKey, setMapResetKey] = useState(0);
  const items = trip.items;
  const markers = buildTripMapMarkers(items, 10);
  const routeCoordinates = buildTripRouteCoordinates(trip, {
    onlyRemaining: true,
  });
  const centerCoordinate = trip.centerCoordinate ?? markers[0]?.coordinate ?? currentLocation ?? null;

  const handleMapInteract = () => {
    sheetRef?.current?.snapToIndex(0);
  };

  return (
    <ThemedView style={styles.root}>
      <View style={styles.body}>
        {centerCoordinate ? (
          <View style={styles.mapLayer}>
            <ExploreMapHero
              key={mapResetKey}
              centerCoordinate={centerCoordinate}
              userCoordinate={currentLocation}
              userHeading={currentHeading}
              locationLabel={trip.dayTitle}
              markers={markers}
              routeCoordinates={routeCoordinates}
              showRoutes={routeCoordinates.length > 1}
              topInset={insetsTop}
              onInteract={handleMapInteract}
              onLocateMe={() => setMapResetKey((prev) => prev + 1)}
              showBackButton
            />
          </View>
        ) : null}

        <GlassBottomSheet
          index={1}
          ref={sheetRef}
          snapPoints={snapPoints ?? ['34%', '64%', '100%']}
          animatedIndex={animatedIndex}
          style={styles.sheet}>
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={headerAnimatedStyle ? [styles.sectionHeader, headerAnimatedStyle] : styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText
                  style={styles.locationEyebrow}
                  lightColor={designSystem.colors.darkGreen}
                  darkColor={designSystem.colors.lime}>
                  {trip.stopCount} stop itinerary
                </ThemedText>
                <ThemedText style={styles.sectionTitle}>{trip.locationLabel}</ThemedText>
              </View>
            </Animated.View>

            <TripFilterTabs
              trips={trips}
              selectedTripId={selectedTripId}
              onSelectTrip={(tripId) => {
                onSelectTrip(tripId);
                setMapResetKey((prev) => prev + 1);
              }}
            />

            {useSkeletons ? <TripTimelineSkeleton /> : <TripTimelineSection items={items} variant="sheet" />}
          </BottomSheetScrollView>
        </GlassBottomSheet>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    position: 'relative',
  },
  mapLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapSkeleton: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  loadingSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '62%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: designSystem.colors.lightGlassStrong,
    paddingHorizontal: designSystem.spacing.lg,
    paddingBottom: 132,
  },
  sheet: {
    zIndex: 30,
    elevation: 30,
  },
  sheetContent: {
    paddingTop: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    paddingBottom: 132,
    gap: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  locationEyebrow: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    ...designSystem.type.title,
    color: designSystem.colors.ink,
  },
});
