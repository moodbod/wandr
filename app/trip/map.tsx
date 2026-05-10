import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import { TripFilterTabs } from '@/components/wandr/trip/trip-filter-tabs';
import { TripTimelineSection } from '@/components/wandr/trip/trip-timeline-section';
import { designSystem } from '@/constants/design-system';
import { getPlanningLocationCenterCoordinate } from '@/constants/planning-countries';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { usePlanningLocation, useSyncPlanningLocationWithCurrentLocation } from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
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
  const router = useRouter();
  const { isLargeScreen } = useResponsive();
  const snapPoints = useMemo(() => ['34%', '64%', '100%'], []);
  const animatedIndex = useSharedValue(0);
  const traveler = useCurrentTraveler();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const routeTripId = typeof params.tripId === 'string' ? params.tripId : undefined;
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(
    routeTripId
  );
  const [lastResolvedTrip, setLastResolvedTrip] = useState<TripDashboard | null>(null);
  const trips = useQuery(listUserTripsRef, traveler?.slug ? { travelerSlug: traveler.slug } : 'skip');
  const { coordinate: currentLocation, heading: currentHeading } = useCurrentLocation();
  useSyncPlanningLocationWithCurrentLocation(currentLocation);
  const { planningLocation } = usePlanningLocation();
  const orderedTrips = useMemo(
    () => orderTripsByPlanningCountry(trips ?? [], planningLocation),
    [planningLocation, trips]
  );

  useEffect(() => {
    if (!isLargeScreen) {
      return;
    }

    router.replace({
      pathname: '/(tabs)/trip',
      params: routeTripId ? { tripId: routeTripId } : undefined,
    });
  }, [isLargeScreen, routeTripId, router]);

  const trip = useQuery(
    getTripDashboardRef,
    traveler?.slug
      ? selectedTripId
        ? { travelerSlug: traveler.slug, tripId: selectedTripId }
        : { travelerSlug: traveler.slug }
      : 'skip'
  );
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
  const isLoading = !traveler || !displayTrip;

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
      fallbackCenterCoordinate={getPlanningLocationCenterCoordinate(planningLocation)}
      fallbackLocationLabel={planningLocation.label}
      useSkeletons={isLoading}
    />
  );
}

function TripMapScreenView({
  animatedIndex,
  currentHeading,
  currentLocation,
  fallbackCenterCoordinate,
  fallbackLocationLabel,
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
  fallbackCenterCoordinate?: readonly [number, number] | null;
  fallbackLocationLabel: string;
  headerAnimatedStyle?: object;
  insetsTop: number;
  sheetRef?: React.RefObject<BottomSheet | null>;
  snapPoints?: (string | number)[];
  trip: TripDashboard | null;
  trips: readonly TripListItem[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
  useSkeletons: boolean;
}) {
  const [recenterToUserSignal, setRecenterToUserSignal] = useState(0);
  const items = useMemo(() => trip?.items ?? [], [trip?.items]);
  const markers = useMemo(() => (trip ? buildTripMapMarkers(items, 10) : []), [items, trip]);
  const routeCoordinates = useMemo(
    () =>
      trip
        ? buildTripRouteCoordinates(trip, {
            onlyRemaining: true,
          })
        : [],
    [trip]
  );
  const centerCoordinate = trip?.centerCoordinate ?? markers[0]?.coordinate ?? currentLocation ?? fallbackCenterCoordinate ?? null;

  const handleMapInteract = () => {
    sheetRef?.current?.snapToIndex(0);
  };

  return (
    <ThemedView style={styles.root}>
      <View style={styles.body}>
        {centerCoordinate ? (
          <View style={styles.mapLayer}>
            <ExploreMapHero
              centerCoordinate={centerCoordinate}
              userCoordinate={currentLocation}
              userHeading={currentHeading}
              locationLabel={trip?.dayTitle ?? fallbackLocationLabel}
              markers={markers}
              routeCoordinates={routeCoordinates}
              showRoutes={routeCoordinates.length > 1}
              topInset={insetsTop}
              onInteract={handleMapInteract}
              recenterToUserSignal={recenterToUserSignal}
              onLocateMe={() => setRecenterToUserSignal((prev) => prev + 1)}
              showBackButton
            />
          </View>
        ) : null}

        <GlassBottomSheet
          index={useSkeletons ? 0 : 1}
          ref={sheetRef}
          snapPoints={snapPoints ?? ['34%', '64%', '100%']}
          animatedIndex={animatedIndex}
          style={styles.sheet}>
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={headerAnimatedStyle ? [styles.sectionHeader, headerAnimatedStyle] : styles.sectionHeader}>
              {useSkeletons ? <TripMapSheetHeaderSkeleton /> : (
                <View style={styles.sectionCopy}>
                  <ThemedText
                    style={styles.locationEyebrow}
                    lightColor={designSystem.colors.darkGreen}
                    darkColor={designSystem.colors.lime}>
                    {trip?.stopCount ?? 0} stop itinerary
                  </ThemedText>
                  <ThemedText style={styles.sectionTitle}>{trip?.locationLabel ?? fallbackLocationLabel}</ThemedText>
                </View>
              )}
            </Animated.View>

            {useSkeletons && trips.length === 0 ? (
              <TripMapFilterTabsSkeleton />
            ) : (
              <TripFilterTabs
                trips={trips}
                selectedTripId={selectedTripId}
                onSelectTrip={(tripId) => {
                  onSelectTrip(tripId);
                }}
              />
            )}

            <TripTimelineSection items={items} isLoading={useSkeletons} variant="sheet" />
          </BottomSheetScrollView>
        </GlassBottomSheet>
      </View>
    </ThemedView>
  );
}

function TripMapSheetHeaderSkeleton() {
  return (
    <View style={styles.sectionCopy}>
      <SkeletonBlock style={styles.headerMetaSkeleton} />
      <SkeletonBlock style={styles.headerTitleSkeleton} />
    </View>
  );
}

function TripMapFilterTabsSkeleton() {
  return (
    <View style={styles.filterSkeletonRow}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={`trip-map-filter-skeleton-${index}`} style={styles.filterSkeletonPill}>
          <SkeletonBlock style={styles.filterSkeletonImage} />
          <SkeletonBlock style={styles.filterSkeletonLabel} />
        </View>
      ))}
    </View>
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
  headerMetaSkeleton: {
    width: 126,
    height: 16,
    borderRadius: 8,
  },
  headerTitleSkeleton: {
    width: '72%',
    height: 34,
    borderRadius: 10,
  },
  filterSkeletonRow: {
    minHeight: 44,
    marginHorizontal: -designSystem.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.xs,
    paddingHorizontal: designSystem.spacing.lg,
  },
  filterSkeletonPill: {
    minHeight: 44,
    width: 146,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    backgroundColor: designSystem.colors.surface,
    paddingLeft: 5,
    paddingRight: 14,
  },
  filterSkeletonImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  filterSkeletonLabel: {
    flex: 1,
    height: 14,
    borderRadius: 7,
  },
});
