import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WandrHeader } from '@/components/wandr/header';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { PlanningLocationSheet } from '@/components/wandr/planning-country-sheet';
import { StaysDiscoveryControls } from '@/components/wandr/stays/stays-discovery-controls';
import { StaysRailCard } from '@/components/wandr/stays/stays-rail-card';
import { designSystem } from '@/constants/design-system';
import {
  coordinateIsInPlanningLocation,
  destinationMatchesPlanningLocation,
} from '@/constants/planning-countries';
import { rankStayProperties } from '@/constants/stays-content';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { usePlanningLocation, useSyncPlanningLocationWithCurrentLocation } from '@/hooks/use-planning-location';
import { getTripDashboardRef, listAllStaysRef, listUserTripsRef } from '@/lib/convex';
import { buildTripRouteCoordinates } from '@/lib/trip-route';
import { orderTripsByPlanningCountry } from '@/lib/trip-ordering';
import type { RankedStayProperty } from '@/types/stays';

const NEAR_ROUTE_RADIUS_KM = 90;
const NEAR_ME_RADIUS_KM = 60;

export function StaysMapScreen({ showBack = false }: { showBack?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();
  const trips = useQuery(listUserTripsRef, { travelerSlug: traveler?.slug ?? '' });
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(undefined);
  const trip = useQuery(
    getTripDashboardRef,
    selectedTripId ? { travelerSlug: traveler?.slug ?? '', tripId: selectedTripId } : 'skip'
  );
  const dbStays = useQuery(listAllStaysRef);
  const currentLocation = useCurrentLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveryMode, setDiscoveryMode] = useState<'route' | 'nearby'>('route');
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const { planningLocation, setPlanningLocation } = usePlanningLocation();
  const [sortMode, setSortMode] = useState<'best' | 'price'>('best');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  useSyncPlanningLocationWithCurrentLocation(currentLocation.coordinate);

  const orderedTrips = useMemo(
    () => orderTripsByPlanningCountry(trips ?? [], planningLocation),
    [planningLocation, trips]
  );

  const locationTrips = useMemo(
    () => orderedTrips.filter((candidate) => coordinateIsInPlanningLocation(candidate.centerCoordinate, planningLocation)),
    [orderedTrips, planningLocation]
  );

  useEffect(() => {
    if (locationTrips.length === 0) {
      if (selectedTripId) {
        setSelectedTripId(undefined);
      }
      return;
    }

    const selectedTripMatchesLocation = locationTrips.some((candidate) => candidate._id === selectedTripId);
    if (!selectedTripMatchesLocation) {
      setSelectedTripId(locationTrips[0]._id);
    }
  }, [locationTrips, selectedTripId]);

  const rankedStays = useMemo(
    () =>
      rankStayProperties({
        stays: (dbStays || []) as any,
        trip,
        currentCoordinate: currentLocation.coordinate,
      }),
    [dbStays, currentLocation.coordinate, trip]
  );
  const routeCoordinates = useMemo(() => {
    return buildTripRouteCoordinates(trip, { onlyRemaining: false });
  }, [trip]);
  const locationRouteCoordinates = useMemo(() => {
    return routeCoordinates.filter((coordinate) => coordinateIsInPlanningLocation(coordinate, planningLocation));
  }, [planningLocation, routeCoordinates]);
  const filteredStays = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const locationBase = rankedStays.filter((stay) =>
      destinationMatchesPlanningLocation({
        coordinate: stay.coordinate,
        countryCode: stay.countryCode,
        countryLabel: stay.countryLabel,
        location: planningLocation,
        planningLocationId: stay.planningLocationId,
        labels: [stay.name, stay.town, stay.region, stay.locationLabel],
      })
    );
    const base = query
      ? locationBase.filter((stay) =>
          [stay.name, stay.town, stay.region, stay.locationLabel].some((value) =>
            value.toLowerCase().includes(query)
          )
        )
      : locationBase;

    const proximityFiltered = filterStaysByDiscoveryMode({
      stays: base,
      discoveryMode,
      routeCoordinates: locationRouteCoordinates,
      currentCoordinate: coordinateIsInPlanningLocation(currentLocation.coordinate, planningLocation)
        ? currentLocation.coordinate
        : null,
    });
    const ordered = [...proximityFiltered].sort((a, b) => {
      if (sortMode === 'price') {
        return a.pricePerNight - b.pricePerNight;
      }

      if (discoveryMode === 'nearby') {
        const currentCoordinate = coordinateIsInPlanningLocation(currentLocation.coordinate, planningLocation)
          ? currentLocation.coordinate
          : null;
        const aDistance = getDistanceFromCurrent(a, currentCoordinate);
        const bDistance = getDistanceFromCurrent(b, currentCoordinate);
        return aDistance - bDistance;
      }

      return getDistanceFromRoute(a, locationRouteCoordinates) - getDistanceFromRoute(b, locationRouteCoordinates);
    });

    return ordered;
  }, [locationRouteCoordinates, currentLocation.coordinate, discoveryMode, planningLocation, rankedStays, searchQuery, sortMode]);

  const featuredStay = filteredStays[selectedIndex] ?? filteredStays[0] ?? null;
  const featuredStayKey = featuredStay ? ((featuredStay as any).id || (featuredStay as any)._id) : null;
  const mapStays = useMemo(() => {
    if (!featuredStay) {
      return [];
    }

    // Show more stays on the map for better density
    const base = filteredStays.slice(0, 30);
    const ordered = [featuredStay, ...base];

    return ordered.filter(
      (stay, index, all) => all.findIndex((candidate) => candidate.id === stay.id) === index
    );
  }, [featuredStay, filteredStays]);
  const mapMarkers = useMemo(() => {
    return mapStays.map((stay: any) => ({
      id: stay.id || stay._id,
      coordinate: stay.coordinate,
      experienceSlug: stay.slug,
      itemKind: 'stay' as const,
      imageUri: stay.imageUri,
      label: stay.name,
      tone: (stay.id || stay._id) === featuredStayKey ? ('accent' as const) : ('dark' as const),
      status: (stay.id || stay._id) === featuredStayKey ? ('active' as const) : ('upcoming' as const),
    }));
  }, [featuredStayKey, mapStays]);

  const cardWidth = Math.min(windowWidth - 72, 316);
  const cardGap = 10;
  const snapInterval = cardWidth + cardGap;
  const railPadding = Math.max(16, (windowWidth - cardWidth) / 2);
  const snapOffsets = useMemo(
    () => filteredStays.map((_, index) => index * snapInterval),
    [filteredStays, snapInterval]
  );
  const discoveryControlsHeight = 188;

  const scrollToCard = useCallback((index: number, animated = true) => {
    scrollRef.current?.scrollTo({
      x: index * snapInterval,
      animated,
    });
  }, [snapInterval]);

  const resetToStart = useCallback(() => {
    setSelectedIndex(0);
    requestAnimationFrame(() => {
      scrollX.setValue(0);
      scrollToCard(0, true);
    });
  }, [scrollToCard, scrollX]);

  useEffect(() => {
    resetToStart();
  }, [planningLocation.id, resetToStart]);

  useEffect(() => {
    if (filteredStays.length === 0) {
      return;
    }

    if (selectedIndex >= filteredStays.length) {
      resetToStart();
    }
  }, [filteredStays.length, resetToStart, selectedIndex]);

  const handleSnap = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    if (nextIndex >= 0 && nextIndex < filteredStays.length) {
      setSelectedIndex(nextIndex);
      scrollToCard(nextIndex, false);
    }
  };

  const tripCenterInPlanningLocation = coordinateIsInPlanningLocation(trip?.centerCoordinate, planningLocation)
    ? trip?.centerCoordinate
    : null;
  const centerCoordinate =
    featuredStay?.coordinate ??
    (discoveryMode === 'nearby' && coordinateIsInPlanningLocation(currentLocation.coordinate, planningLocation)
      ? currentLocation.coordinate
      : tripCenterInPlanningLocation) ??
    mapMarkers[0]?.coordinate ??
    planningLocation.centerCoordinate ??
    null;
  const userCoordinate = coordinateIsInPlanningLocation(currentLocation.coordinate, planningLocation)
    ? currentLocation.coordinate
    : null;

  return (
    <ThemedView style={styles.root}>
      <MapPreview
        centerCoordinate={centerCoordinate}
        userCoordinate={userCoordinate}
        markers={mapMarkers}
        routeCoordinates={locationRouteCoordinates}
        showRoutes={locationRouteCoordinates.length > 1}
        zoomLevel={12}
        onMarkerPress={(marker) => {
          const stayIndex = filteredStays.findIndex((s: any) => (s.id || s._id) === marker.id);
          if (stayIndex !== -1) {
            setSelectedIndex(stayIndex);
            scrollToCard(stayIndex);
          }
        }}
      />

      <WandrHeader
        config={{
          overlay: true,
          leadingAction: showBack ? { kind: 'back', accessibilityLabel: 'Go back' } : undefined,
        }}
        bottomContent={
          <StaysDiscoveryControls
            discoveryMode={discoveryMode}
            searchQuery={searchQuery}
            selectedTripId={selectedTripId}
            sortMode={sortMode}
            trips={locationTrips}
            onChangeDiscoveryMode={(mode) => {
              setDiscoveryMode(mode);
              resetToStart();
            }}
            onChangeSearchQuery={(value) => {
              setSearchQuery(value);
              resetToStart();
            }}
            onOpenLocationSheet={() => setLocationSheetVisible(true)}
            onResetMap={() => {
              scrollX.setValue(0);
            }}
            onSelectTrip={(tripId) => {
              setSelectedTripId(tripId);
              setDiscoveryMode('route');
              setSortMode('best');
              resetToStart();
            }}
            onTogglePriceSort={() => {
              setSortMode((current) => (current === 'price' ? 'best' : 'price'));
              resetToStart();
            }}
          />
        }
        bottomContentHeight={discoveryControlsHeight}
        bottomContentVisible
      />
      <PlanningLocationSheet
        currentCoordinate={currentLocation.coordinate}
        selectedLocation={planningLocation}
        visible={locationSheetVisible}
        onClose={() => setLocationSheetVisible(false)}
        onSelectLocation={(location) => {
          setPlanningLocation(location, { manual: true });
          resetToStart();
        }}
      />

      <View pointerEvents="box-none" style={styles.carouselWrap}>
        <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        snapToAlignment="center"
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={handleSnap}
        contentContainerStyle={[
          styles.carouselContent,
          {
            paddingLeft: railPadding,
            paddingRight: railPadding,
              paddingBottom: insets.bottom + 54,
            },
          ]}
          style={styles.carousel}
        >
          {filteredStays.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  width: cardWidth,
                  borderColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft,
                  backgroundColor: isDark ? designSystem.colors.darkGlassStrong : designSystem.colors.whiteGlassStrong,
                },
              ]}
            >
              <ThemedText style={styles.emptyTitle}>No {planningLocation.label} stays yet</ThemedText>
              <ThemedText
                style={[
                  styles.emptyText,
                  { color: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText },
                ]}
              >
                Keep planning in this location and new places will appear here when inventory is added.
              </ThemedText>
            </View>
          ) : null}
          {filteredStays.map((stay, index) => {
            const stayKey = (stay as any).id ?? (stay as any)._id ?? `${stay.slug}-${index}`;
            const inputRange = [
              (index - 1) * snapInterval,
              index * snapInterval,
              (index + 1) * snapInterval,
            ];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1.04, 0.9],
              extrapolate: 'clamp',
            });
            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [16, 0, 16],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.84, 1, 0.84],
              extrapolate: 'clamp',
            });

            return (
            <Pressable
              key={stayKey}
              accessibilityRole="button"
              style={[
                styles.cardShell,
                { width: cardWidth },
                index !== filteredStays.length - 1 ? { marginRight: cardGap } : null,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/stays/details',
                  params: { slug: stay.slug },
                })
              }
              >
                <Animated.View
                  style={[
                    styles.cardMotion,
                    {
                      opacity,
                      transform: [{ translateY }, { scale }],
                    },
                  ]}
                >
                  <View style={styles.cardInner}>
                    <StaysRailCard
                      imageUri={stay.imageUri}
                      isDark={isDark}
                      isSelected={index === selectedIndex}
                      locationLabel={discoveryMode === 'nearby' ? stay.town : stay.matchedStopLabel}
                      name={stay.name}
                      priceLabel={stay.priceLabel || `$${stay.pricePerNight}`}
                      rating={stay.rating}
                    />
                  </View>
                </Animated.View>
              </Pressable>
            );
          })}
        </Animated.ScrollView>
      </View>
    </ThemedView>
  );
}

function filterStaysByDiscoveryMode(
  {
    currentCoordinate,
    discoveryMode,
    routeCoordinates,
    stays,
  }: {
    currentCoordinate?: readonly [number, number] | null;
    discoveryMode: 'route' | 'nearby';
    routeCoordinates: readonly (readonly [number, number])[];
    stays: readonly RankedStayProperty[];
  }
) {
  const radius = discoveryMode === 'nearby' ? NEAR_ME_RADIUS_KM : NEAR_ROUTE_RADIUS_KM;
  const getDistance =
    discoveryMode === 'nearby'
      ? (stay: RankedStayProperty) => getDistanceFromCurrent(stay, currentCoordinate)
      : (stay: RankedStayProperty) => getDistanceFromRoute(stay, routeCoordinates);
  const hasUsableDistance = stays.some((stay) => Number.isFinite(getDistance(stay)));

  if (!hasUsableDistance) {
    return [...stays];
  }

  const rankedByDistance = [...stays].sort((a, b) => {
    return getDistance(a) - getDistance(b);
  });

  return rankedByDistance.filter((stay) => getDistance(stay) <= radius);
}

function getDistanceFromCurrent(
  stay: RankedStayProperty,
  currentCoordinate?: readonly [number, number] | null
) {
  return currentCoordinate ? getDistanceInKm(stay.coordinate, currentCoordinate) : Number.POSITIVE_INFINITY;
}

function getDistanceFromRoute(
  stay: RankedStayProperty,
  routeCoordinates: readonly (readonly [number, number])[]
) {
  if (routeCoordinates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (routeCoordinates.length === 1) {
    return getDistanceInKm(stay.coordinate, routeCoordinates[0]);
  }

  return routeCoordinates.slice(0, -1).reduce((bestDistance, start, index) => {
    const end = routeCoordinates[index + 1];
    return Math.min(bestDistance, getDistanceToRouteSegmentKm(stay.coordinate, start, end));
  }, Number.POSITIVE_INFINITY);
}

function getDistanceToRouteSegmentKm(
  coordinate: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number]
) {
  const latitudeScale = 111.32;
  const referenceLatitude = toRadians((coordinate[1] + start[1] + end[1]) / 3);
  const longitudeScale = Math.max(Math.cos(referenceLatitude) * latitudeScale, 0.0001);
  const point = toXY(coordinate, longitudeScale, latitudeScale);
  const segmentStart = toXY(start, longitudeScale, latitudeScale);
  const segmentEnd = toXY(end, longitudeScale, latitudeScale);
  const segmentX = segmentEnd.x - segmentStart.x;
  const segmentY = segmentEnd.y - segmentStart.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return getDistanceInKm(coordinate, start);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - segmentStart.x) * segmentX + (point.y - segmentStart.y) * segmentY) / segmentLengthSquared
    )
  );
  const projection = {
    x: segmentStart.x + t * segmentX,
    y: segmentStart.y + t * segmentY,
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

function toXY(coordinate: readonly [number, number], longitudeScale: number, latitudeScale: number) {
  return {
    x: coordinate[0] * longitudeScale,
    y: coordinate[1] * latitudeScale,
  };
}

function getDistanceInKm(from: readonly [number, number], to: readonly [number, number]) {
  const earthRadiusKm = 6371;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: designSystem.colors.mapSurface,
  },
  carouselWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    height: 214,
    overflow: 'visible',
  },
  carousel: {
    flex: 1,
    overflow: 'visible',
  },
  carouselContent: {
    alignItems: 'flex-end',
    overflow: 'visible',
  },
  cardShell: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
  },
  cardMotion: {
    width: '100%',
    overflow: 'visible',
  },
  cardInner: {
    width: '100%',
    overflow: 'visible',
  },
  emptyCard: {
    minHeight: 164,
    borderRadius: designSystem.radii.card,
    borderWidth: 1,
    padding: designSystem.spacing.lg,
    justifyContent: 'center',
    gap: designSystem.spacing.xs,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  emptyText: {
    ...designSystem.type.body,
  },
});
