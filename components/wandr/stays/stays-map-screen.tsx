import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type StyleProp,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowCounterClockwise,
  Bed,
  GlobeHemisphereWest,
  NavigationArrow,
} from 'phosphor-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WandrHeader } from '@/components/wandr/header';
import { HeaderLocationSelector } from '@/components/wandr/header-location-selector';
import { GlassButton } from '@/components/ui/glass-button';
import { LargeScreenPanel, LargeScreenWorkspace, largeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { PlanningLocationSheet } from '@/components/wandr/planning-country-sheet';
import { StaysDiscoveryControls } from '@/components/wandr/stays/stays-discovery-controls';
import { styles } from '@/components/wandr/stays/stays-map-screen.styles';
import { StaysRailCard } from '@/components/wandr/stays/stays-rail-card';
import { designSystem } from '@/constants/design-system';
import { GlassView } from '@/lib/glass-effect';
import {
  buildPlanningLocationsFromDestinations,
  coordinateIsInPlanningLocation,
  destinationMatchesPlanningLocation,
  getPlanningLocationCenterCoordinate,
  type PlanningLocation,
} from '@/constants/planning-countries';
import { rankStayProperties } from '@/constants/stays-content';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { useVisibleSharedLocations } from '@/hooks/use-visible-shared-locations';
import {
  usePlanningLocation,
  useSyncPlanningLocationWithAvailableLocations,
  useSyncPlanningLocationWithCurrentLocation,
} from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
import { getLiveCatalogRef, getTripDashboardRef, listAllStaysRef, listUserTripsRef } from '@/lib/convex';
import { formatUsdPriceParts } from '@/lib/currency';
import { buildTripRouteCoordinates } from '@/lib/trip-route';
import { orderTripsByPlanningCountry } from '@/lib/trip-ordering';
import {
  filterStaysByDiscoveryMode,
  getDistanceFromCurrent,
  getDistanceFromRoute,
  getStaySearchText,
} from '@/components/wandr/stays/stays-map-model';

import { StayDetailScreen } from './stay-detail-screen';

const USE_NATIVE_ANIMATED_DRIVER = Platform.OS !== 'web';
type EmptyActionKind = 'clearSearch' | 'location' | 'nearby' | 'route';
type EmptyStaysContent = {
  message: string;
  primaryAction: EmptyActionKind;
  primaryLabel: string;
  title: string;
};

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

function hasPlanningLocationSpatialFilter(location: PlanningLocation) {
  return Boolean(location.bounds || (location.centerCoordinate && location.radiusKm));
}

function getStayPriceDisplay(stay: any, preferredCurrency: string) {
  if (stay.source === 'bookingCom' && stay.priceDisplayLabel) {
    return { amountLabel: stay.priceDisplayLabel, rateLabel: 'Live rates at checkout' };
  }

  return formatUsdPriceParts(stay.pricePerNight, preferredCurrency);
}

export function StaysMapScreen({ showBack = false }: { showBack?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { isLargeScreen, isTablet } = useResponsive();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();
  const settings = useCurrentUserSettings();
  const preferredCurrency = settings?.preferredCurrency ?? 'USD';
  const trips = useQuery(listUserTripsRef, traveler?.slug ? { travelerSlug: traveler.slug } : 'skip');
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(undefined);
  const trip = useQuery(
    getTripDashboardRef,
    selectedTripId && traveler?.slug ? { travelerSlug: traveler.slug, tripId: selectedTripId } : 'skip'
  );
  const dbStays = useQuery(listAllStaysRef);
  const liveCatalog = useQuery(getLiveCatalogRef);
  const currentLocation = useCurrentLocation();
  const sharedUserLocations = useVisibleSharedLocations();
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveryMode, setDiscoveryMode] = useState<'route' | 'nearby'>('route');
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const { planningLocation, setPlanningLocation } = usePlanningLocation();
  const [sortMode, setSortMode] = useState<'best' | 'price'>('best');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedStaySlug, setSelectedStaySlug] = useState<string | null>(null);
  const [mapResetSignal, setMapResetSignal] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const [scrollX] = useState(() => new Animated.Value(0));

  const orderedTrips = useMemo(
    () => orderTripsByPlanningCountry(trips ?? [], planningLocation),
    [planningLocation, trips]
  );
  const planningLocationHasSpatialFilter = hasPlanningLocationSpatialFilter(planningLocation);

  const locationTrips = useMemo(
    () =>
      planningLocationHasSpatialFilter
        ? orderedTrips.filter((candidate) => coordinateIsInPlanningLocation(candidate.centerCoordinate, planningLocation))
        : [],
    [orderedTrips, planningLocation, planningLocationHasSpatialFilter]
  );
  const selectedTripMatchesPlanningLocation = selectedTripId
    ? locationTrips.some((candidate) => candidate._id === selectedTripId)
    : false;

  useEffect(() => {
    if (locationTrips.length === 0) {
      if (selectedTripId) {
        return deferStateSync(() => setSelectedTripId(undefined));
      }
      return;
    }

    if (!selectedTripMatchesPlanningLocation) {
      return deferStateSync(() => setSelectedTripId(locationTrips[0]._id));
    }
  }, [locationTrips, selectedTripId, selectedTripMatchesPlanningLocation]);

  const rankedStays = useMemo(
    () =>
      rankStayProperties({
        stays: (dbStays ?? []) as any,
        trip,
        currentCoordinate: currentLocation.coordinate,
      }),
    [dbStays, currentLocation.coordinate, trip]
  );
  const availablePlanningLocations = useMemo(
    () => buildPlanningLocationsFromDestinations(rankedStays),
    [rankedStays]
  );
  useSyncPlanningLocationWithAvailableLocations(availablePlanningLocations);
  useSyncPlanningLocationWithCurrentLocation(currentLocation.coordinate, availablePlanningLocations);
  const routeCoordinates = useMemo(() => {
    return buildTripRouteCoordinates(selectedTripMatchesPlanningLocation ? trip : null, { onlyRemaining: false });
  }, [selectedTripMatchesPlanningLocation, trip]);
  const locationRouteCoordinates = useMemo(() => {
    return planningLocationHasSpatialFilter
      ? routeCoordinates.filter((coordinate) => coordinateIsInPlanningLocation(coordinate, planningLocation))
      : routeCoordinates;
  }, [planningLocation, planningLocationHasSpatialFilter, routeCoordinates]);
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
    const locationSearchMatches = query
      ? locationBase.filter((stay) => getStaySearchText(stay).includes(query))
      : locationBase;

    const proximityFiltered = filterStaysByDiscoveryMode({
      stays: locationSearchMatches,
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

  const featuredStay = filteredStays[selectedIndex] ?? null;
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
  const catalogMarkers = useMemo(() => {
    return (liveCatalog?.markers ?? []).filter((marker: any) =>
      marker.itemKind === 'stay' && coordinateIsInPlanningLocation(marker.coordinate, planningLocation)
    );
  }, [liveCatalog?.markers, planningLocation]);
  const mapMarkers = useMemo(() => {
    const activeStayMarkers = mapStays.map((stay: any) => ({
      id: stay.id || stay._id,
      coordinate: stay.coordinate,
      experienceSlug: stay.slug,
      itemKind: 'stay' as const,
      imageUri: stay.imageUri,
      label: stay.name,
      tone: (stay.id || stay._id) === featuredStayKey ? ('accent' as const) : ('dark' as const),
      status: (stay.id || stay._id) === featuredStayKey ? ('active' as const) : ('upcoming' as const),
    }));
    const activeStaySlugs = new Set(activeStayMarkers.map((marker) => marker.experienceSlug));
    const supplementalMarkers = catalogMarkers.filter((marker: any) => {
      if (marker.itemKind === 'stay' && marker.experienceSlug && activeStaySlugs.has(marker.experienceSlug)) {
        return false;
      }
      return true;
    });

    return [...activeStayMarkers, ...supplementalMarkers];
  }, [catalogMarkers, featuredStayKey, mapStays]);

  const cardWidth = Math.min(windowWidth - 72, 316);
  const cardGap = 10;
  const snapInterval = cardWidth + cardGap;
  const railPadding = Math.max(16, (windowWidth - cardWidth) / 2);
  const snapOffsets = useMemo(
    () => filteredStays.map((_, index) => index * snapInterval),
    [filteredStays, snapInterval]
  );
  const discoveryControlsHeight = 188;
  const carouselBottomOffset = Platform.OS === 'ios' ? 104 : Platform.OS === 'web' ? 68 : 96;
  const emptyNoticeBottomOffset = carouselBottomOffset;
  const emptyStaysContent = getEmptyStaysContent(searchQuery, discoveryMode);

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
    return deferStateSync(() => {
      setSelectedStaySlug(null);
      resetToStart();
    });
  }, [planningLocation.id, resetToStart]);

  useEffect(() => {
    if (filteredStays.length === 0) {
      return;
    }

    if (selectedIndex >= filteredStays.length) {
      return deferStateSync(resetToStart);
    }
  }, [filteredStays.length, resetToStart, selectedIndex]);

  const handleSnap = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    if (nextIndex >= 0 && nextIndex < filteredStays.length) {
      setSelectedIndex(nextIndex);
      scrollToCard(nextIndex, false);
    }
  };

  const featuredStayInPlanningLocation =
    featuredStay &&
    destinationMatchesPlanningLocation({
      coordinate: featuredStay.coordinate,
      countryCode: featuredStay.countryCode,
      countryLabel: featuredStay.countryLabel,
      location: planningLocation,
      planningLocationId: featuredStay.planningLocationId,
      labels: [featuredStay.name, featuredStay.town, featuredStay.region, featuredStay.locationLabel],
    })
      ? featuredStay
      : null;
  const tripCenterInPlanningLocation = selectedTripMatchesPlanningLocation && coordinateIsInPlanningLocation(trip?.centerCoordinate, planningLocation)
    ? trip?.centerCoordinate
    : null;
  const planningCenterCoordinate = getPlanningLocationCenterCoordinate(planningLocation);
  const centerCoordinate =
    featuredStayInPlanningLocation?.coordinate ??
    tripCenterInPlanningLocation ??
    planningCenterCoordinate ??
    null;
  const currentCoordinateInPlanningLocation = coordinateIsInPlanningLocation(currentLocation.coordinate, planningLocation)
    ? currentLocation.coordinate
    : null;
  const userCoordinate = currentLocation.coordinate;
  const handleResetMapPosition = useCallback(() => {
    resetToStart();
    setMapResetSignal((current) => current + 1);
  }, [resetToStart]);
  const handleSelectStayIndex = useCallback((stayIndex: number, shouldScroll = true) => {
    if (stayIndex < 0 || stayIndex >= filteredStays.length) {
      return;
    }

    setSelectedIndex(stayIndex);
    setSelectedStaySlug(filteredStays[stayIndex].slug);
    if (shouldScroll) {
      scrollToCard(stayIndex);
    }
  }, [filteredStays, scrollToCard]);
  const mapContent = (
    <MapPreview
      key={`stays-map-${planningLocation.id}-${mapResetSignal}`}
      centerCoordinate={centerCoordinate}
      userCoordinate={userCoordinate}
      userAccuracy={currentLocation.accuracy}
      userAvatarPaletteKey={traveler?.slug}
      userAvatarUri={traveler?.avatarUri}
      userHeading={currentLocation.heading}
      userIsStale={currentLocation.isStale}
      userName={traveler?.name}
      userPuckVariant="navigation"
      userSpeed={currentLocation.speed}
      userUpdatedAt={currentLocation.updatedAt}
      markers={mapMarkers}
      sharedUserLocations={sharedUserLocations}
      followUserLocation={discoveryMode === 'nearby' && Boolean(currentCoordinateInPlanningLocation)}
      persistKey={isLargeScreen ? 'app-background' : undefined}
      routeCoordinates={locationRouteCoordinates}
      showRoutes={locationRouteCoordinates.length > 1}
      zoomLevel={12}
      onMarkerPress={(marker) => {
        if ((marker.itemKind === 'location' || marker.itemKind === 'hiddenGem') && marker.experienceSlug) {
          router.push({ pathname: '/explore/hidden-gems/[slug]', params: { slug: marker.experienceSlug } });
          return;
        }

        if (marker.itemKind === 'experience' && marker.experienceSlug) {
          router.push({ pathname: '/explore/[slug]', params: { slug: marker.experienceSlug } });
          return;
        }

        const stayIndex = filteredStays.findIndex((s: any) => s.slug === marker.experienceSlug || (s.id || s._id) === marker.id);
        if (stayIndex >= 0) {
          handleSelectStayIndex(stayIndex);
          return;
        }

        if (marker.itemKind === 'stay' && marker.experienceSlug) {
          router.push({ pathname: '/stays/details', params: { slug: marker.experienceSlug } });
        }
      }}
    />
  );
  const discoveryControls = (
    <StaysDiscoveryControls
      discoveryMode={discoveryMode}
      leadingSearchAccessory={
        isLargeScreen ? (
          <HeaderLocationSelector
            location={planningLocation}
            onPress={() => setLocationSheetVisible(true)}
            variant="desktopMap"
          />
        ) : undefined
      }
      showMapButtons={!isLargeScreen}
      searchQuery={searchQuery}
      selectedTripId={selectedTripId}
      sortMode={sortMode}
      trailingSearchAccessory={
        isLargeScreen ? (
          <View style={styles.desktopSearchActions}>
            <GlassButton
              accessibilityLabel="Reset map position"
              height={52}
              onPress={handleResetMapPosition}
              radius={designSystem.radii.pill}
              width={52}
            >
              <NavigationArrow
                color={isDark ? designSystem.colors.darkText : designSystem.colors.ink}
                size={20}
                weight="bold"
              />
            </GlassButton>
          </View>
        ) : undefined
      }
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
      planningLocation={planningLocation}
      onResetMap={handleResetMapPosition}
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
      variant={isLargeScreen ? 'desktopMap' : 'default'}
    />
  );

  if (isLargeScreen) {
    const hasDetailColumn = Boolean(selectedStaySlug);
    const mainColumnWidth = isTablet ? largeScreenWorkspace.mainColumnTabletWidth : largeScreenWorkspace.mainColumnWidth;
    const detailColumnWidth = isTablet ? largeScreenWorkspace.detailColumnTabletWidth : largeScreenWorkspace.detailColumnWidth;
    const controlsLeft =
      largeScreenWorkspace.inset +
      mainColumnWidth +
      largeScreenWorkspace.gap +
      (hasDetailColumn ? detailColumnWidth + largeScreenWorkspace.gap : 0);

    return (
      <ThemedView style={styles.root}>
        <LargeScreenWorkspace
          mapContent={mapContent}
          mapControls={discoveryControls}
          mapControlsStyle={{ left: controlsLeft }}
        >
          <LargeScreenPanel kind="main">
            <ScrollView
              contentContainerStyle={[styles.mainColumnContent, { paddingTop: insets.top + 24 }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.stayList}>
                {filteredStays.length === 0 ? (
                  <StaysEmptyNotice
                    content={emptyStaysContent}
                    isDark={isDark}
                    onClearSearch={() => {
                      setSearchQuery('');
                      resetToStart();
                    }}
                    onOpenLocationSheet={() => setLocationSheetVisible(true)}
                    onSelectDiscoveryMode={(mode) => {
                      setDiscoveryMode(mode);
                      resetToStart();
                    }}
                  />
                ) : null}
                {filteredStays.map((stay, index) => {
                  const stayKey = (stay as any).id ?? (stay as any)._id ?? `${stay.slug}-${index}`;
                  const isSelected = stay.slug === selectedStaySlug || index === selectedIndex;
                  const price = getStayPriceDisplay(stay, preferredCurrency);

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={stayKey}
                      onPress={() => handleSelectStayIndex(index, false)}
                    >
                      <StaysRailCard
                        imageUri={stay.imageUri}
                        isDark={isDark}
                        isSelected={isSelected}
                        locationLabel={discoveryMode === 'nearby' ? stay.town : stay.matchedStopLabel}
                        name={stay.name}
                        priceLabel={price.amountLabel}
                        priceRateLabel={price.rateLabel}
                        rating={stay.rating}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </LargeScreenPanel>
          {selectedStaySlug ? (
            <LargeScreenPanel kind="detail">
              <StayDetailScreen onClose={() => setSelectedStaySlug(null)} slug={selectedStaySlug} />
            </LargeScreenPanel>
          ) : null}
        </LargeScreenWorkspace>
        <PlanningLocationSheet
          availableLocations={availablePlanningLocations}
          currentCoordinate={currentLocation.coordinate}
          selectedLocation={planningLocation}
          visible={locationSheetVisible}
          onClose={() => setLocationSheetVisible(false)}
          onSelectLocation={(location) => {
            setPlanningLocation(location, { manual: true });
            setSelectedTripId(undefined);
            setSelectedStaySlug(null);
            resetToStart();
          }}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.root}>
      {mapContent}

      <WandrHeader
        config={{
          overlay: true,
          leadingAction: showBack ? { kind: 'back', accessibilityLabel: 'Go back' } : undefined,
        }}
        bottomContent={
          discoveryControls
        }
        bottomContentHeight={discoveryControlsHeight}
        bottomContentVisible
      />
      <PlanningLocationSheet
        availableLocations={availablePlanningLocations}
        currentCoordinate={currentLocation.coordinate}
        selectedLocation={planningLocation}
        visible={locationSheetVisible}
        onClose={() => setLocationSheetVisible(false)}
        onSelectLocation={(location) => {
          setPlanningLocation(location, { manual: true });
          setSelectedTripId(undefined);
          setSelectedStaySlug(null);
          resetToStart();
        }}
      />

      {filteredStays.length === 0 ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.emptyNoticeOverlay,
            {
              bottom: emptyNoticeBottomOffset,
            },
          ]}
        >
          <StaysEmptyNotice
            content={emptyStaysContent}
            isDark={isDark}
            onClearSearch={() => {
              setSearchQuery('');
              resetToStart();
            }}
            onOpenLocationSheet={() => setLocationSheetVisible(true)}
            onSelectDiscoveryMode={(mode) => {
              setDiscoveryMode(mode);
              resetToStart();
            }}
            style={{ width: cardWidth }}
            variant="floating"
          />
        </View>
      ) : null}

      {filteredStays.length > 0 ? (
      <View pointerEvents="box-none" style={[styles.carouselWrap, { bottom: carouselBottomOffset }]}>
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
            { useNativeDriver: USE_NATIVE_ANIMATED_DRIVER }
          )}
          onMomentumScrollEnd={handleSnap}
          contentContainerStyle={[
            styles.carouselContent,
            {
              paddingLeft: railPadding,
              paddingRight: railPadding,
            },
          ]}
          style={styles.carousel}
        >
          {filteredStays.map((stay, index) => {
            const stayKey = (stay as any).id ?? (stay as any)._id ?? `${stay.slug}-${index}`;
            const price = getStayPriceDisplay(stay, preferredCurrency);
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
                      presentation="floating"
                      priceLabel={price.amountLabel}
                      priceRateLabel={price.rateLabel}
                      rating={stay.rating}
                    />
                  </View>
                </Animated.View>
              </Pressable>
            );
          })}
        </Animated.ScrollView>
      </View>
      ) : null}
    </ThemedView>
  );
}

function getEmptyStaysContent(searchQuery: string, discoveryMode: 'route' | 'nearby'): EmptyStaysContent {
  if (searchQuery.trim()) {
    return {
      title: 'No hotel matches',
      message: 'Clear the search to see every stay in this planning location.',
      primaryLabel: 'Clear search',
      primaryAction: 'clearSearch',
    };
  }

  if (discoveryMode === 'nearby') {
    return {
      title: 'No nearby hotels',
      message: 'Route results may still have options for this trip.',
      primaryLabel: 'View route',
      primaryAction: 'route',
    };
  }

  return {
    title: 'No hotels here yet',
    message: 'Try another planning location with available stays.',
    primaryLabel: 'Change location',
    primaryAction: 'location',
  };
}

function StaysEmptyNotice({
  content,
  isDark,
  onClearSearch,
  onOpenLocationSheet,
  onSelectDiscoveryMode,
  style,
  variant = 'list',
}: {
  content: EmptyStaysContent;
  isDark: boolean;
  onClearSearch: () => void;
  onOpenLocationSheet: () => void;
  onSelectDiscoveryMode: (mode: 'route' | 'nearby') => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'list' | 'floating';
}) {
  const isFloating = variant === 'floating';
  const copyColor = isFloating
    ? designSystem.colors.darkText
    : isDark
      ? designSystem.colors.darkText
      : designSystem.colors.ink;
  const mutedCopyColor = isFloating
    ? designSystem.colors.darkTextSoft
    : isDark
      ? designSystem.colors.darkTextSoft
      : designSystem.colors.warmDark;
  const borderColor = isFloating
    ? designSystem.colors.whiteOverlayFaint
    : isDark
      ? designSystem.colors.darkBorderSoft
      : designSystem.colors.borderSoft;
  const handleAction = (action: EmptyActionKind) => {
    if (action === 'clearSearch') {
      onClearSearch();
      return;
    }

    if (action === 'location') {
      onOpenLocationSheet();
      return;
    }

    onSelectDiscoveryMode(action);
  };

  return (
    <View
      style={[
        styles.emptyNotice,
        isFloating ? styles.emptyNoticeFloating : styles.emptyNoticeList,
        { borderColor },
        style,
      ]}
    >
      <GlassView
        colorScheme={isFloating || isDark ? 'dark' : 'light'}
        glassEffectStyle={isFloating ? 'clear' : 'regular'}
        isInteractive={isFloating}
        pointerEvents="none"
        style={styles.emptyNoticeGlassFill}
      />
      <View style={styles.emptyNoticeContent}>
        <View style={styles.emptyNoticeTopRow}>
          <View
            style={[
              styles.emptyNoticeIcon,
              { backgroundColor: designSystem.colors.lime },
            ]}
          >
            <Bed color={designSystem.colors.darkGreen} size={22} weight="bold" />
          </View>

          <View style={styles.emptyNoticeCopy}>
            <ThemedText
              lightColor={copyColor}
              darkColor={copyColor}
              style={styles.emptyNoticeTitle}
              numberOfLines={2}
            >
              {content.title}
            </ThemedText>
            <ThemedText
              lightColor={mutedCopyColor}
              darkColor={mutedCopyColor}
              style={styles.emptyNoticeText}
              numberOfLines={2}
            >
              {content.message}
            </ThemedText>
          </View>
        </View>

        <View style={styles.emptyNoticeActions}>
          <Pressable
            accessibilityLabel={content.primaryLabel}
            accessibilityRole="button"
            onPress={() => handleAction(content.primaryAction)}
            style={styles.emptyNoticePrimaryAction}
          >
            {getEmptyActionIcon(content.primaryAction, designSystem.colors.darkGreen)}
            <ThemedText
              lightColor={designSystem.colors.darkGreen}
              darkColor={designSystem.colors.darkGreen}
              style={styles.emptyNoticePrimaryActionText}
              numberOfLines={1}
            >
              {content.primaryLabel}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function getEmptyActionIcon(action: EmptyActionKind, color: string) {
  if (action === 'clearSearch') {
    return <ArrowCounterClockwise color={color} size={16} weight="bold" />;
  }

  if (action === 'location') {
    return <GlobeHemisphereWest color={color} size={16} weight="bold" />;
  }

  return <NavigationArrow color={color} size={16} weight="bold" />;
}
