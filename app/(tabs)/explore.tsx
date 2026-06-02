import { useQuery } from 'convex/react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { GlassButton } from '@/components/ui/glass-button';
import { ExploreActivityCardList } from '@/components/wandr/explore/activity-card-list';
import {
  ExploreMobileSheetHeaderSkeleton,
  ExploreMobileTripRailSkeleton,
  ExploreSheetHeaderSkeleton,
  ExploreTripFilterSkeleton,
} from '@/components/wandr/explore/card-skeletons';
import { DiscoveryFilters } from '@/components/wandr/explore/discovery-filters';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import { ExploreContent, ExploreLoadedSheet } from '@/components/wandr/explore/explore-screen-content';
import { styles } from '@/components/wandr/explore/explore-screen.styles';
import { HeaderLocationSelector } from '@/components/wandr/header-location-selector';
import { LargeScreenPanel, LargeScreenWorkspace, largeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';
import {
  buildPlanningLocationsFromDestinations,
  coordinateIsInPlanningLocation,
  destinationMatchesPlanningLocation,
  getDataBackedPlanningLocation,
  getPlanningLocationCenterCoordinate,
  getPlanningLocationForCoordinate,
} from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import {
  usePlanningLocation,
  useSyncPlanningLocationWithAvailableLocations,
  useSyncPlanningLocationWithCurrentLocation,
} from '@/hooks/use-planning-location';
import { useRetainedQueryValue } from '@/hooks/use-retained-query-value';
import { useResponsive } from '@/hooks/use-responsive';
import { getExploreJoinableTripCardsRef, getExplorePageContentRef, getTripDashboardRef, listUserTripsRef } from '@/lib/convex';
import {
  buildRegionOptions,
  matchesExperienceFilters,
  matchesHiddenGemFilters,
  matchesIntent,
} from '@/lib/explore-filters';
import {
  compareExperiencesByPopularity,
  getPlanningLocationCopy,
  INTENT_OPTIONS,
  toTrendingActivityCard,
  TRENDING_PLACE_LIMIT,
} from '@/lib/explore-screen-model';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';
import { buildTripRouteCoordinates } from '@/lib/trip-route';
import { orderTripsByPlanningCountry } from '@/lib/trip-ordering';
import { GlassView } from '@/lib/glass-effect';
import type { ExploreJoinableTripCard, ExplorePageContent } from '@/types/explore';
import type { TripDashboard, TripListItem } from '@/types/trip';
import { NavigationArrow } from 'phosphor-react-native';
import { Sheet, SheetScrollView, SheetRef } from '@/components/ui/sheet';

const EMPTY_TRIPS: readonly TripListItem[] = [];
const EMPTY_JOINABLE_TRIP_CARDS: readonly ExploreJoinableTripCard[] = [];
const ExploreGroupTripDetailScreen = lazy(() => import('@/components/wandr/explore/explore-group-trip-detail-screen'));
const HiddenGemDetailScreen = lazy(() => import('@/components/wandr/explore/hidden-gem-detail-screen'));
const ExperienceDetailContent = lazy(() =>
  import('@/components/wandr/explore/experience-detail-content').then((module) => ({
    default: module.ExperienceDetailContent,
  }))
);
const StayDetailScreen = lazy(() =>
  import('@/components/wandr/stays/stay-detail-screen').then((module) => ({
    default: module.StayDetailScreen,
  }))
);

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const currentLocationState = useCurrentLocation();
  const {
    accuracy: currentAccuracy,
    coordinate: currentLocation,
    heading: currentHeading,
    isStale: currentIsStale,
    speed: currentSpeed,
    updatedAt: currentUpdatedAt,
  } = currentLocationState;

  return (
    <ConnectedExploreScreen
      currentAccuracy={currentAccuracy}
      currentHeading={currentHeading}
      currentIsStale={currentIsStale}
      currentLocation={currentLocation}
      currentSpeed={currentSpeed}
      currentUpdatedAt={currentUpdatedAt}
      isDark={isDark}
      mapTopInset={insets.top}
      mobileSheetBottomInset={getMobileTabBarInset(insets.bottom)}
    />
  );
}

function getMobileTabBarInset(safeAreaBottom: number) {
  if (Platform.OS === 'ios') {
    return 0;
  }

  return Math.max(72, safeAreaBottom + 56);
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

function hasPlanningLocationSpatialFilter(location: { bounds?: unknown; centerCoordinate?: unknown; radiusKm?: unknown }) {
  return Boolean(location.bounds || (location.centerCoordinate && location.radiusKm));
}

function ConnectedExploreScreen({
  currentAccuracy,
  currentHeading,
  currentIsStale,
  currentLocation,
  currentSpeed,
  currentUpdatedAt,
  isDark,
  mapTopInset,
  mobileSheetBottomInset,
}: {
  currentAccuracy?: number | null;
  currentHeading?: number | null;
  currentIsStale?: boolean;
  currentLocation?: readonly [number, number] | null;
  currentSpeed?: number | null;
  currentUpdatedAt?: number | null;
  isDark: boolean;
  mapTopInset: number;
  mobileSheetBottomInset: number;
}) {
  const { isLargeScreen } = useResponsive();
  const sheetRef = useRef<SheetRef>(null);
  const snapPoints = useMemo(() => [390, '78%'], []);
  const [isExploreFocused, setIsExploreFocused] = useState(false);
  const traveler = useCurrentTraveler();
  const pageQuery = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });
  const page = useRetainedQueryValue(pageQuery);
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(undefined);
  const tripsQuery = useQuery(
    listUserTripsRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : 'skip'
  );
  const trips = useRetainedQueryValue(tripsQuery) ?? EMPTY_TRIPS;
  const tripQuery = useQuery(
    getTripDashboardRef,
    traveler?.slug && selectedTripId
      ? { travelerSlug: traveler.slug, tripId: selectedTripId }
      : 'skip'
  );
  const trip = useRetainedQueryValue(tripQuery);
  const joinableTripCardsQuery = useQuery(
    getExploreJoinableTripCardsRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : {}
  );
  const joinableTripCards = useRetainedQueryValue(joinableTripCardsQuery) ?? EMPTY_JOINABLE_TRIP_CARDS;
  const [loadingMapRecenterSignal, setLoadingMapRecenterSignal] = useState(0);
  const { planningLocation } = usePlanningLocation();
  const animatedIndex = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingTop: interpolate(animatedIndex.value, [1, 2], [0, mapTopInset], 'clamp'),
    };
  });

  useFocusEffect(
    useCallback(() => {
      setIsExploreFocused(true);

      return () => {
        setIsExploreFocused(false);
        sheetRef.current?.close();
      };
    }, [])
  );

  useEffect(() => {
    if (!selectedTripId) {
      return;
    }

    const hasSelectedTrip = trips.some((candidate) => candidate._id === selectedTripId);
    if (!hasSelectedTrip) {
      return deferStateSync(() => setSelectedTripId(undefined));
    }
  }, [selectedTripId, trips]);

  if (!page) {
    const currentLocationInPlanningLocation = coordinateIsInPlanningLocation(currentLocation, planningLocation)
      ? currentLocation
      : null;
    const loadingMapCenterCoordinate = getPlanningLocationCenterCoordinate(planningLocation);
    const loadingMapContent = (
      loadingMapCenterCoordinate ? (
        <ExploreMapHero
          centerCoordinate={loadingMapCenterCoordinate}
          locationLabel={planningLocation.label}
          userCoordinate={currentLocationInPlanningLocation}
          userAccuracy={currentAccuracy}
          userHeading={currentHeading}
          userIsStale={currentIsStale}
          userSpeed={currentSpeed}
          userUpdatedAt={currentUpdatedAt}
          markers={[]}
          followUserLocation={Boolean(currentLocationInPlanningLocation)}
          mapPersistKey={isLargeScreen ? 'app-background' : undefined}
          recenterToUserSignal={loadingMapRecenterSignal}
          routeCoordinates={[]}
          showRoutes={false}
          topInset={mapTopInset}
          mapTopBleed={isLargeScreen ? 0 : mapTopInset}
          onLocateMe={() => setLoadingMapRecenterSignal((current) => current + 1)}
          planningLocation={planningLocation}
          hideHeader={isLargeScreen}
          shellStyle={StyleSheet.absoluteFill}
        />
      ) : null
    );

    return (
      <ThemedView style={styles.root}>
        {isLargeScreen ? (
          <LargeScreenWorkspace mapContent={loadingMapContent}>
            {Platform.OS === 'web' ? null : (
              <LargeScreenPanel kind="main">
                <ScrollView
                  contentContainerStyle={[styles.sheetContent, styles.columnScroll]}
                  showsVerticalScrollIndicator={false}
                >
                  <ExploreSheetHeaderSkeleton />
                  <ExploreTripFilterSkeleton />
                  <View style={styles.cardList}>
                    <ExploreActivityCardList activities={[]} getHref={() => '/explore/search'} isLoading />
                  </View>
                </ScrollView>
              </LargeScreenPanel>
            )}
          </LargeScreenWorkspace>
        ) : (
          <View style={styles.body}>
            <View style={styles.mapLayer}>
              {loadingMapContent}
            </View>

            <Sheet
              animatedIndex={animatedIndex}
              backgroundInteraction="enabled"
              bottomInset={mobileSheetBottomInset}
              enablePanDownToClose={false}
              index={isExploreFocused ? 0 : -1}
              isOpen={isExploreFocused}
              presentation="inline"
              ref={sheetRef}
              showDragIndicator={false}
              snapPoints={snapPoints}
              style={[styles.mobileSheetPanel, Platform.OS !== 'ios' ? styles.mobileSheetPanelFallback : null]}>
              {Platform.OS === 'ios' ? (
                <GlassView glassEffectStyle="regular" style={[StyleSheet.absoluteFill, styles.mobileSheetGlass]} />
              ) : null}
              <SheetScrollView
                contentContainerStyle={[
                  styles.mobileSheetContent,
                  Platform.OS === 'ios' ? styles.nativeMobileSheetContent : null,
                ]}
                showsVerticalScrollIndicator={false}>
                <ExploreMobileSheetHeaderSkeleton />
                <ExploreMobileTripRailSkeleton />
                <View style={styles.mobileCardList}>
                  <ExploreActivityCardList activities={[]} getHref={() => '/explore/search'} isLoading />
                </View>
              </SheetScrollView>
            </Sheet>
          </View>
        )}
      </ThemedView>
    );
  }

  return (
    <ExploreScreenView
      currentHeading={currentHeading}
      currentIsStale={currentIsStale}
      currentLocation={currentLocation}
      currentAccuracy={currentAccuracy}
      currentSpeed={currentSpeed}
      currentUpdatedAt={currentUpdatedAt}
      headerAnimatedStyle={headerAnimatedStyle}
      isCardLoading={false}
      isDark={isDark}
      isExploreFocused={isExploreFocused}
      mapTopInset={mapTopInset}
      mobileSheetBottomInset={mobileSheetBottomInset}
      pageContent={page}
      joinableTripCards={joinableTripCards}
      sheetRef={sheetRef}
      snapPoints={snapPoints}
      trip={trip ?? null}
      trips={trips}
      selectedTripId={selectedTripId}
      onSelectTrip={setSelectedTripId}
      animatedIndex={animatedIndex}
    />
  );
}

function ExploreScreenView({
  animatedIndex,
  currentAccuracy,
  currentHeading,
  currentIsStale,
  currentLocation,
  currentSpeed,
  currentUpdatedAt,
  headerAnimatedStyle,
  isCardLoading,
  isDark,
  isExploreFocused,
  mapTopInset,
  mobileSheetBottomInset,
  pageContent,
  joinableTripCards,
  sheetRef,
  snapPoints,
  trip,
  trips,
  selectedTripId,
  onSelectTrip,
}: {
  animatedIndex?: ReturnType<typeof useSharedValue<number>>;
  currentAccuracy?: number | null;
  currentHeading?: number | null;
  currentIsStale?: boolean;
  currentLocation?: readonly [number, number] | null;
  currentSpeed?: number | null;
  currentUpdatedAt?: number | null;
  headerAnimatedStyle?: object;
  isCardLoading: boolean;
  isDark: boolean;
  isExploreFocused: boolean;
  mapTopInset: number;
  mobileSheetBottomInset: number;
  pageContent: ExplorePageContent;
  joinableTripCards: readonly ExploreJoinableTripCard[];
  sheetRef?: React.RefObject<SheetRef | null>;
  snapPoints?: (string | number)[];
  trip: TripDashboard | null;
  trips: readonly TripListItem[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string | undefined) => void;
}) {
  const params = useLocalSearchParams<{
    experienceSlug?: string | string[];
    groupCircleId?: string | string[];
    hiddenGemSlug?: string | string[];
  }>();
  const router = useRouter();
  const { isLargeScreen, isTablet, width: viewportWidth } = useResponsive();
  const settings = useCurrentUserSettings();
  const preferredCurrency = settings?.preferredCurrency ?? 'USD';
  const [recenterToUserSignal, setRecenterToUserSignal] = useState(0);
  const [selectedExperienceSlug, setSelectedExperienceSlug] = useState<string | null>(null);
  const [selectedGroupCircleId, setSelectedGroupCircleId] = useState<string | null>(null);
  const [selectedHiddenGemSlug, setSelectedHiddenGemSlug] = useState<string | null>(null);
  const [selectedStaySlug, setSelectedStaySlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDiscoveryRegion, setActiveDiscoveryRegion] = useState('');
  const [activeDiscoveryIntent, setActiveDiscoveryIntent] = useState('all');
  const { openPlanningLocationSheet, planningLocation } = usePlanningLocation();
  const content = pageContent.home;
  const availablePlanningLocations = useMemo(
    () =>
      buildPlanningLocationsFromDestinations([
        ...pageContent.experiences,
        ...pageContent.search.gems.items,
        ...trips.map((candidate) => ({ coordinate: candidate.centerCoordinate })),
      ]),
    [pageContent.experiences, pageContent.search.gems.items, trips]
  );
  const selectedTripListItem = useMemo(
    () => (selectedTripId ? trips.find((candidate) => candidate._id === selectedTripId) ?? null : null),
    [selectedTripId, trips]
  );
  const selectedTripContentLocations = useMemo(
    () =>
      selectedTripId && trip
        ? buildPlanningLocationsFromDestinations(
            trip.items.map((item) => ({
              coordinate: item.experience.coordinate,
              countryCode: item.experience.countryCode,
              countryLabel: item.experience.countryLabel,
              planningLocationId: item.experience.planningLocationId,
            }))
          )
        : [],
    [selectedTripId, trip]
  );
  const selectedTripPlanningLocation = useMemo(() => {
    if (!selectedTripId) {
      return null;
    }

    const tripContentLocation = selectedTripContentLocations[0] ?? null;
    const tripCoordinateLocation = getPlanningLocationForCoordinate(
      selectedTripListItem?.centerCoordinate ?? trip?.centerCoordinate
    );
    const tripLocation = tripContentLocation ?? tripCoordinateLocation;

    return getDataBackedPlanningLocation(tripLocation, availablePlanningLocations) ?? tripLocation;
  }, [
    availablePlanningLocations,
    selectedTripContentLocations,
    selectedTripId,
    selectedTripListItem?.centerCoordinate,
    trip?.centerCoordinate,
  ]);
  const activePlanningLocation = selectedTripPlanningLocation ?? planningLocation;
  const routeExperienceSlug = Array.isArray(params.experienceSlug)
    ? params.experienceSlug[0]
    : params.experienceSlug;
  const routeGroupCircleId = Array.isArray(params.groupCircleId)
    ? params.groupCircleId[0]
    : params.groupCircleId;
  const routeHiddenGemSlug = Array.isArray(params.hiddenGemSlug)
    ? params.hiddenGemSlug[0]
    : params.hiddenGemSlug;
  useSyncPlanningLocationWithAvailableLocations(availablePlanningLocations);
  useSyncPlanningLocationWithCurrentLocation(currentLocation, availablePlanningLocations);
  const planningCopy = useMemo(
    () => getPlanningLocationCopy(activePlanningLocation.id, activePlanningLocation.label),
    [activePlanningLocation.id, activePlanningLocation.label]
  );
  const exploreSheetTrips = useMemo(
    () => orderTripsByPlanningCountry(trips, activePlanningLocation),
    [activePlanningLocation, trips]
  );
  const activePlanningLocationHasSpatialFilter = hasPlanningLocationSpatialFilter(activePlanningLocation);
  const currentLocationInPlanningLocation = coordinateIsInPlanningLocation(currentLocation, activePlanningLocation)
    ? currentLocation
    : null;
  const tripMarkers = useMemo(() => (trip ? buildTripMapMarkers(trip.items, 10, preferredCurrency) : []), [preferredCurrency, trip]);
  const tripRouteCoordinates = useMemo(
    () =>
      buildTripRouteCoordinates(trip, {
        currentCoordinate: currentLocationInPlanningLocation,
        onlyRemaining: true,
      }),
    [currentLocationInPlanningLocation, trip]
  );
  const locationRouteCoordinates = useMemo(
    () =>
      activePlanningLocationHasSpatialFilter
        ? tripRouteCoordinates.filter((coordinate) => coordinateIsInPlanningLocation(coordinate, activePlanningLocation))
        : tripRouteCoordinates,
    [activePlanningLocation, activePlanningLocationHasSpatialFilter, tripRouteCoordinates]
  );
  const exploreMarkers = useMemo<ExploreMapMarker[]>(
    () =>
      pageContent.home.hero.markers.filter((marker) => marker.itemKind !== 'stay'),
    [pageContent.home.hero.markers]
  );
  const experienceBySlug = useMemo(() => {
    return new Map(pageContent.experiences.map((experience) => [experience.slug, experience]));
  }, [pageContent.experiences]);
  const locationTripMarkers = useMemo(
    () => {
      if (selectedTripId && !activePlanningLocationHasSpatialFilter) {
        return tripMarkers;
      }

      return tripMarkers.filter((marker) =>
        destinationMatchesPlanningLocation({
          coordinate: marker.coordinate,
          location: activePlanningLocation,
          labels: [marker.label],
        })
      );
    },
    [activePlanningLocation, activePlanningLocationHasSpatialFilter, selectedTripId, tripMarkers]
  );
  const locationExploreMarkers = useMemo(
    () =>
      exploreMarkers.filter((marker) => {
        const experience = marker.experienceSlug ? experienceBySlug.get(marker.experienceSlug) : undefined;

        return destinationMatchesPlanningLocation({
          coordinate: marker.coordinate,
          countryCode: experience?.countryCode,
          countryLabel: experience?.countryLabel,
          location: activePlanningLocation,
          planningLocationId: experience?.planningLocationId,
          labels: [marker.label, marker.experienceSlug],
        });
      }),
    [activePlanningLocation, experienceBySlug, exploreMarkers]
  );
  const mapMarkers = useMemo(() => {
    return [...locationTripMarkers, ...locationExploreMarkers];
  }, [locationExploreMarkers, locationTripMarkers]);
  const locationExperienceBySlug = useMemo(() => {
    const locationExperiences = pageContent.experiences.filter((experience) =>
      destinationMatchesPlanningLocation({
        coordinate: experience.coordinate,
        countryCode: experience.countryCode,
        countryLabel: experience.countryLabel,
        location: activePlanningLocation,
        planningLocationId: experience.planningLocationId,
        labels: [
          experience.locationLabel,
          experience.geography?.region,
          experience.geography?.town,
          experience.title,
          experience.subtitle,
        ],
      })
    );

    return new Map(locationExperiences.map((experience) => [experience.slug, experience]));
  }, [activePlanningLocation, pageContent.experiences]);
  const locationActivities = useMemo(
    () =>
      Array.from(locationExperienceBySlug.values())
        .sort(compareExperiencesByPopularity)
        .slice(0, TRENDING_PLACE_LIMIT)
        .map(toTrendingActivityCard),
    [locationExperienceBySlug]
  );
  const locationJoinableTripCards = useMemo(
    () =>
      joinableTripCards.filter((card) => {
        const experience = locationExperienceBySlug.get(card.experienceSlug);

        return (
          Boolean(experience) ||
          destinationMatchesPlanningLocation({
            countryCode: card.countryCode,
            countryLabel: card.countryLabel,
            location: activePlanningLocation,
            planningLocationId: card.planningLocationId,
            labels: [card.locationLabel, card.destinationLabel, card.experienceTitle, card.groupName],
          })
        );
      }),
    [activePlanningLocation, joinableTripCards, locationExperienceBySlug]
  );
  const locationHiddenGems = useMemo(
    () =>
      pageContent.search.gems.items.filter((item) =>
        destinationMatchesPlanningLocation({
          countryCode: item.countryCode,
          countryLabel: item.countryLabel,
          location: activePlanningLocation,
          planningLocationId: item.planningLocationId,
          labels: [item.title, item.description, item.geography?.region, item.geography?.town],
        })
      ),
    [activePlanningLocation, pageContent.search.gems.items]
  );
  const searchMatchedExperiences = useMemo(
    () =>
      Array.from(locationExperienceBySlug.values()).filter((experience) =>
        matchesExperienceFilters(experience, 'all', 'all', searchQuery)
      ),
    [locationExperienceBySlug, searchQuery]
  );
  const searchMatchedGems = useMemo(
    () => locationHiddenGems.filter((item) => matchesHiddenGemFilters(item, 'all', searchQuery)),
    [locationHiddenGems, searchQuery]
  );
  const discoveryRegionOptions = useMemo(
    () =>
      buildRegionOptions(
        searchMatchedExperiences,
        searchMatchedGems,
        currentLocationInPlanningLocation ?? content.hero.centerCoordinate
      ),
    [content.hero.centerCoordinate, currentLocationInPlanningLocation, searchMatchedExperiences, searchMatchedGems]
  );
  const regionMatchedExperiences = useMemo(
    () =>
      Array.from(locationExperienceBySlug.values()).filter((experience) =>
        matchesExperienceFilters(experience, activeDiscoveryRegion || 'all', 'all', searchQuery)
      ),
    [activeDiscoveryRegion, locationExperienceBySlug, searchQuery]
  );
  const discoveryIntentOptions = useMemo(
    () =>
      INTENT_OPTIONS.filter(
        (option) =>
          option.key === 'all' ||
          regionMatchedExperiences.some((experience) =>
            matchesIntent(experience.category, experience.travelerMomentum?.visitorCount, option.key)
          )
      ),
    [regionMatchedExperiences]
  );

  useEffect(() => {
    if (discoveryRegionOptions.length === 0) {
      return;
    }

    const hasActiveRegion = discoveryRegionOptions.some((option) => option.key === activeDiscoveryRegion);
    if (!activeDiscoveryRegion || !hasActiveRegion) {
      return deferStateSync(() => setActiveDiscoveryRegion(discoveryRegionOptions[0].key));
    }
  }, [activeDiscoveryRegion, discoveryRegionOptions]);

  useEffect(() => {
    if (discoveryIntentOptions.some((option) => option.key === activeDiscoveryIntent)) {
      return;
    }

    return deferStateSync(() => setActiveDiscoveryIntent('all'));
  }, [activeDiscoveryIntent, discoveryIntentOptions]);

  useEffect(() => {
    if (!isLargeScreen) {
      return;
    }

    if (routeExperienceSlug) {
      return deferStateSync(() => {
        setSelectedGroupCircleId(null);
        setSelectedHiddenGemSlug(null);
        setSelectedStaySlug(null);
        setSelectedExperienceSlug(routeExperienceSlug);
      });
    }

    if (routeGroupCircleId) {
      return deferStateSync(() => {
        setSelectedExperienceSlug(null);
        setSelectedHiddenGemSlug(null);
        setSelectedStaySlug(null);
        setSelectedGroupCircleId(routeGroupCircleId);
      });
    }

    if (routeHiddenGemSlug) {
      return deferStateSync(() => {
        setSelectedExperienceSlug(null);
        setSelectedGroupCircleId(null);
        setSelectedStaySlug(null);
        setSelectedHiddenGemSlug(routeHiddenGemSlug);
      });
    }
  }, [isLargeScreen, routeExperienceSlug, routeGroupCircleId, routeHiddenGemSlug]);

  const handleOpenExperienceDetail = useCallback((slug: string) => {
    setSelectedGroupCircleId(null);
    setSelectedHiddenGemSlug(null);
    setSelectedStaySlug(null);
    setSelectedExperienceSlug(slug);
  }, []);

  const handleOpenGroupTripDetail = useCallback((circleId: string) => {
    setSelectedExperienceSlug(null);
    setSelectedHiddenGemSlug(null);
    setSelectedStaySlug(null);
    setSelectedGroupCircleId(circleId);
  }, []);

  const handleOpenHiddenGemDetail = useCallback((slug: string) => {
    setSelectedExperienceSlug(null);
    setSelectedGroupCircleId(null);
    setSelectedStaySlug(null);
    setSelectedHiddenGemSlug(slug);
  }, []);

  const handleOpenStayDetail = useCallback((slug: string) => {
    setSelectedExperienceSlug(null);
    setSelectedGroupCircleId(null);
    setSelectedHiddenGemSlug(null);
    setSelectedStaySlug(slug);
  }, []);

  const resolvedDiscoveryRegion = activeDiscoveryRegion || 'all';
  const discoveryActivities = useMemo(
    () =>
      Array.from(locationExperienceBySlug.values())
        .filter((experience) =>
          matchesExperienceFilters(experience, resolvedDiscoveryRegion, activeDiscoveryIntent, searchQuery)
        )
        .sort(compareExperiencesByPopularity)
        .slice(0, TRENDING_PLACE_LIMIT)
        .map(toTrendingActivityCard),
    [activeDiscoveryIntent, locationExperienceBySlug, resolvedDiscoveryRegion, searchQuery]
  );
  const discoveryHiddenGems = useMemo(
    () =>
      locationHiddenGems.filter((item) =>
        matchesHiddenGemFilters(item, resolvedDiscoveryRegion, searchQuery)
      ),
    [locationHiddenGems, resolvedDiscoveryRegion, searchQuery]
  );
  const discoveryJoinableTripCards = useMemo(
    () =>
      locationJoinableTripCards.filter((card) => {
        const experience = locationExperienceBySlug.get(card.experienceSlug);

        return experience
          ? matchesExperienceFilters(experience, 'all', 'all', searchQuery)
          : [card.experienceTitle, card.locationLabel, card.destinationLabel, card.groupName].some((value) =>
              value.toLowerCase().includes(searchQuery.trim().toLowerCase())
            );
      }),
    [locationExperienceBySlug, locationJoinableTripCards, searchQuery]
  );
  const tripCenterInPlanningLocation =
    trip?.centerCoordinate && (!activePlanningLocationHasSpatialFilter || coordinateIsInPlanningLocation(trip.centerCoordinate, activePlanningLocation))
      ? trip.centerCoordinate
      : null;
  const heroCenterInPlanningLocation = coordinateIsInPlanningLocation(content.hero.centerCoordinate, activePlanningLocation)
    ? content.hero.centerCoordinate
    : null;
  const mapCenterCoordinate =
    tripCenterInPlanningLocation ??
    mapMarkers[0]?.coordinate ??
    heroCenterInPlanningLocation ??
    getPlanningLocationCenterCoordinate(activePlanningLocation) ??
    null;
  const mapLocationLabel = currentLocationInPlanningLocation
    ? trip?.dayTitle ?? content.hero.locationLabel
    : activePlanningLocation.label;

  const handleMapInteract = useCallback(() => {
    if (!isLargeScreen) {
      sheetRef?.current?.snapToIndex(0);
    }
  }, [isLargeScreen, sheetRef]);
  const handleSelectTrip = useCallback(
    (tripId: string) => {
      onSelectTrip(tripId);
    },
    [onSelectTrip]
  );
  const handleLocateMe = useCallback(() => {
    setRecenterToUserSignal((current) => current + 1);
  }, []);
  const handleOpenLocationSheet = useCallback(() => {
    openPlanningLocationSheet({
      availableLocations: availablePlanningLocations,
      currentCoordinate: currentLocation,
      onSelectLocation: () => onSelectTrip(undefined),
    });
  }, [availablePlanningLocations, currentLocation, onSelectTrip, openPlanningLocationSheet]);
  const handlePressMapMarker = useCallback(
    (marker: ExploreMapMarker) => {
      if (marker.itemKind === 'stay' && marker.experienceSlug) {
        if (isLargeScreen) {
          handleOpenStayDetail(marker.experienceSlug);
          return;
        }

        router.push({ pathname: '/stays/details', params: { slug: marker.experienceSlug } });
        return;
      }

      if ((marker.itemKind === 'location' || marker.itemKind === 'hiddenGem') && marker.experienceSlug) {
        if (isLargeScreen) {
          handleOpenHiddenGemDetail(marker.experienceSlug);
          return;
        }

        router.push({ pathname: '/explore/hidden-gems/[slug]', params: { slug: marker.experienceSlug } });
        return;
      }

      if (!marker.experienceSlug) {
        return;
      }

      if (isLargeScreen) {
        handleOpenExperienceDetail(marker.experienceSlug);
        return;
      }

      router.push({ pathname: '/explore/[slug]', params: { slug: marker.experienceSlug } });
    },
    [handleOpenExperienceDetail, handleOpenHiddenGemDetail, handleOpenStayDetail, isLargeScreen, router]
  );

  const hasLargeDetailColumn = Boolean(selectedGroupCircleId || selectedHiddenGemSlug || selectedExperienceSlug || selectedStaySlug);
  const showLargeExplorePanel = Platform.OS !== 'web';
  const largeContentColumnWidth = showLargeExplorePanel
    ? isTablet
      ? largeScreenWorkspace.mainColumnTabletWidth
      : largeScreenWorkspace.mainColumnWidth
    : 0;
  const largeDetailColumnWidth = isTablet ? largeScreenWorkspace.detailColumnTabletWidth : largeScreenWorkspace.detailColumnWidth;
  const mapControlsInsetLeft =
    largeScreenWorkspace.inset +
    (showLargeExplorePanel ? largeContentColumnWidth + largeScreenWorkspace.gap : 0) +
    (hasLargeDetailColumn ? largeDetailColumnWidth + largeScreenWorkspace.gap : 0);
  const mapViewportPaddingLeft = Math.min(mapControlsInsetLeft, Math.max(24, viewportWidth - 360));
  const mapControlsAvailableWidth = Math.max(
    0,
    viewportWidth - mapControlsInsetLeft - largeScreenWorkspace.inset
  );
  const mapControlsWidth = Math.max(
    320,
    Math.min(mapControlsAvailableWidth - 24, isTablet ? 700 : 980)
  );

  const mapLayerContent = (
    <ExploreMapHero
        centerCoordinate={mapCenterCoordinate}
        locationLabel={mapLocationLabel}
        userCoordinate={currentLocationInPlanningLocation}
        userAccuracy={currentAccuracy}
        userHeading={currentHeading}
        userIsStale={currentIsStale}
        userSpeed={currentSpeed}
        userUpdatedAt={currentUpdatedAt}
        viewportPadding={
          isLargeScreen
            ? {
                paddingBottom: 24,
                paddingLeft: mapViewportPaddingLeft,
                paddingRight: largeScreenWorkspace.inset,
                paddingTop: 112,
              }
            : undefined
        }
        markers={mapMarkers}
        followUserLocation={Boolean(currentLocationInPlanningLocation)}
        routeCoordinates={locationRouteCoordinates}
        showRoutes={locationRouteCoordinates.length > 1}
        mapPersistKey={isLargeScreen ? 'app-background' : undefined}
        recenterToUserSignal={recenterToUserSignal}
        topInset={mapTopInset}
        mapTopBleed={isLargeScreen ? 0 : mapTopInset}
        onInteract={handleMapInteract}
        onLocateMe={handleLocateMe}
        onMarkerPress={handlePressMapMarker}
        onOpenLocationSheet={handleOpenLocationSheet}
        planningLocation={activePlanningLocation}
        hideHeader={isLargeScreen}
        shellStyle={StyleSheet.absoluteFill}
    />
  );
  const largeMapControls = (
    <View pointerEvents="box-none" style={styles.largeMapControlsLayer}>
      <View style={[styles.largeMapControlsFrame, { width: mapControlsWidth }]}>
        <DiscoveryFilters
          activeIntent={activeDiscoveryIntent}
          activeRegion={resolvedDiscoveryRegion}
          intents={discoveryIntentOptions}
          leadingSearchAccessory={
              <HeaderLocationSelector
              location={activePlanningLocation}
              onPress={handleOpenLocationSheet}
              variant="desktopMap"
            />
          }
          regions={discoveryRegionOptions}
          searchPlaceholder={pageContent.search.intro.searchPlaceholder}
          searchQuery={searchQuery}
          onIntentChange={setActiveDiscoveryIntent}
          onRegionChange={setActiveDiscoveryRegion}
          onSearchQueryChange={setSearchQuery}
          fullBleed={false}
          variant="desktopMap"
        />
      </View>
      <GlassButton
        accessibilityLabel="Locate me"
        height={58}
        onPress={handleLocateMe}
        radius={designSystem.radii.pill}
        style={[
          styles.desktopMapLocateButton,
          styles.desktopMapLocateFloating,
        ]}
        width={58}>
        <NavigationArrow color={designSystem.colors.darkTextWarm} size={28} weight="fill" />
      </GlassButton>
    </View>
  );

  if (isLargeScreen) {
    return (
      <ThemedView style={styles.root}>
        <LargeScreenWorkspace
          mapContent={mapLayerContent}
          mapControls={largeMapControls}
          mapControlsStyle={{ left: mapControlsInsetLeft, bottom: largeScreenWorkspace.inset }}
        >
          {showLargeExplorePanel ? (
            <LargeScreenPanel kind="main" style={styles.exploreMainPanel}>
              <ExploreContent
                discoveryActivities={discoveryActivities}
                discoveryHiddenGems={discoveryHiddenGems}
                discoveryJoinableTripCards={discoveryJoinableTripCards}
                isDark={isDark}
                locationActivities={locationActivities}
                locationJoinableTripCards={locationJoinableTripCards}
                locationLabel={activePlanningLocation.label}
                locationTrips={exploreSheetTrips}
                planningCopy={planningCopy}
                searchQuery={searchQuery}
                selectedTripId={selectedTripId}
                showInlineFilters={false}
                onSelectGroupTrip={handleOpenGroupTripDetail}
                onSelectHiddenGem={handleOpenHiddenGemDetail}
                onSelectTrip={handleSelectTrip}
                onSelectActivity={handleOpenExperienceDetail}
                scrollContainerStyle={styles.columnScroll}
              />
            </LargeScreenPanel>
          ) : null}
          {selectedGroupCircleId ? (
            <LargeScreenPanel kind="detail">
              <Suspense fallback={null}>
                <ExploreGroupTripDetailScreen
                  circleId={selectedGroupCircleId}
                  onClose={() => setSelectedGroupCircleId(null)}
                />
              </Suspense>
            </LargeScreenPanel>
          ) : selectedHiddenGemSlug ? (
            <LargeScreenPanel kind="detail">
              <Suspense fallback={null}>
                <HiddenGemDetailScreen
                  onClose={() => setSelectedHiddenGemSlug(null)}
                  slug={selectedHiddenGemSlug}
                />
              </Suspense>
            </LargeScreenPanel>
          ) : selectedExperienceSlug ? (
            <LargeScreenPanel kind="detail">
              <Suspense fallback={null}>
                <ExperienceDetailContent
                  hideHeader={false}
                  onClose={() => setSelectedExperienceSlug(null)}
                  slug={selectedExperienceSlug}
                />
              </Suspense>
            </LargeScreenPanel>
          ) : selectedStaySlug ? (
            <LargeScreenPanel kind="detail">
              <Suspense fallback={null}>
                <StayDetailScreen
                  onClose={() => setSelectedStaySlug(null)}
                  slug={selectedStaySlug}
                />
              </Suspense>
            </LargeScreenPanel>
          ) : null}
        </LargeScreenWorkspace>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.mapLayer}>
            {mapLayerContent}
        </View>

        <ExploreLoadedSheet
          animatedIndex={animatedIndex}
          headerAnimatedStyle={headerAnimatedStyle}
          isCardLoading={isCardLoading}
          isDark={isDark}
          locationActivities={locationActivities}
          locationHiddenGems={locationHiddenGems}
          locationJoinableTripCards={locationJoinableTripCards}
          locationLabel={activePlanningLocation.label}
          locationTrips={exploreSheetTrips}
          bottomInset={mobileSheetBottomInset}
          planningCopy={planningCopy}
          selectedTripId={selectedTripId}
          sheetRef={sheetRef}
          isOpen={isExploreFocused}
          snapPoints={snapPoints}
          onSelectTrip={handleSelectTrip}
        />
      </View>
    </ThemedView>
  );
}
