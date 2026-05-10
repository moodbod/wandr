import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useQuery } from 'convex/react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ExploreGroupTripDetailScreen from '@/app/explore/group/[circleId]';
import HiddenGemDetailScreen from '@/app/explore/hidden-gems/[slug]';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassButton } from '@/components/ui/glass-button';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import { ExploreActivityCardList } from '@/components/wandr/explore/activity-card-list';
import {
  ExploreMobileSheetHeaderSkeleton,
  ExploreMobileTripRailSkeleton,
  ExploreSheetHeaderSkeleton,
  ExploreTripFilterSkeleton,
} from '@/components/wandr/explore/card-skeletons';
import { DiscoveryFilters } from '@/components/wandr/explore/discovery-filters';
import { ExperienceDetailContent } from '@/components/wandr/explore/experience-detail-content';
import { ExploreGroupTripCard } from '@/components/wandr/explore/group-trip-card';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import { HeaderLocationSelector } from '@/components/wandr/header-location-selector';
import { LargeScreenPanel, LargeScreenWorkspace, largeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { StayDetailScreen } from '@/components/wandr/stays/stay-detail-screen';
import { TripFilterTabs } from '@/components/wandr/trip/trip-filter-tabs';
import { designSystem } from '@/constants/design-system';
import type {
  ExploreActivityCard as ExploreActivityCardContent,
  ExploreExperience,
  ExploreHiddenGem,
  ExploreMapMarker,
} from '@/constants/explore-content';
import { getHiddenGemSlug } from '@/constants/hidden-gems-content';
import {
  buildPlanningLocationsFromDestinations,
  coordinateIsInPlanningLocation,
  destinationMatchesPlanningLocation,
  getPlanningLocationCenterCoordinate,
} from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { usePlanningLocation, useSyncPlanningLocationWithCurrentLocation } from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
import { getExploreJoinableTripCardsRef, getExplorePageContentRef, getTripDashboardRef, listUserTripsRef } from '@/lib/convex';
import {
  buildRegionOptions,
  matchesExperienceFilters,
  matchesHiddenGemFilters,
  matchesIntent,
  type DiscoveryOption,
} from '@/lib/explore-filters';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';
import { buildTripRouteCoordinates } from '@/lib/trip-route';
import type { ExploreJoinableTripCard, ExplorePageContent } from '@/types/explore';
import type { TripDashboard, TripListItem } from '@/types/trip';
import { MagnifyingGlass, NavigationArrow, Plus } from 'phosphor-react-native';

const EMPTY_TRIPS: readonly TripListItem[] = [];
const EMPTY_JOINABLE_TRIP_CARDS: readonly ExploreJoinableTripCard[] = [];
const TRENDING_PLACE_LIMIT = 10;
const INTENT_OPTIONS: readonly DiscoveryOption[] = [
  { key: 'all', label: 'Everything' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'food', label: 'Food & Drink' },
  { key: 'popular', label: 'Popular with Travelers' },
];

type ExploreDiscoveryItem =
  | {
      kind: 'experience';
      card: ExploreActivityCardContent;
      key: string;
    }
  | {
      kind: 'hiddenGem';
      card: ExploreActivityCardContent;
      key: string;
      slug: string;
    };

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { coordinate: currentLocation, heading: currentHeading } = useCurrentLocation();

  return (
    <ConnectedExploreScreen
      currentHeading={currentHeading}
      currentLocation={currentLocation}
      isDark={isDark}
      mapTopInset={insets.top}
    />
  );
}

function ConnectedExploreScreen({
  currentHeading,
  currentLocation,
  isDark,
  mapTopInset,
}: {
  currentHeading?: number | null;
  currentLocation?: readonly [number, number] | null;
  isDark: boolean;
  mapTopInset: number;
}) {
  const { isLargeScreen } = useResponsive();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['34%', '64%', '100%'], []);
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
    traveler?.slug
      ? selectedTripId
        ? { travelerSlug: traveler.slug, tripId: selectedTripId }
        : { travelerSlug: traveler.slug }
      : 'skip'
  );
  const trip = useRetainedQueryValue(tripQuery);
  const joinableTripCardsQuery = useQuery(
    getExploreJoinableTripCardsRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : {}
  );
  const joinableTripCards = useRetainedQueryValue(joinableTripCardsQuery) ?? EMPTY_JOINABLE_TRIP_CARDS;
  const [loadingMapResetKey, setLoadingMapResetKey] = useState(0);
  const { planningLocation } = usePlanningLocation();
  const animatedIndex = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingTop: interpolate(animatedIndex.value, [1, 2], [0, mapTopInset], 'clamp'),
    };
  });

  useEffect(() => {
    if (trips.length === 0) {
      return;
    }

    const hasSelectedTrip = trips.some((candidate) => candidate._id === selectedTripId);
    if (!selectedTripId || !hasSelectedTrip) {
      setSelectedTripId(trips[0]._id);
    }
  }, [selectedTripId, trips]);

  if (!page) {
    const currentLocationInPlanningLocation = coordinateIsInPlanningLocation(currentLocation, planningLocation)
      ? currentLocation
      : null;
    const loadingMapCenterCoordinate =
      currentLocationInPlanningLocation ?? getPlanningLocationCenterCoordinate(planningLocation);
    const loadingMapContent = (
      loadingMapCenterCoordinate ? (
        <ExploreMapHero
          key={loadingMapResetKey}
          centerCoordinate={loadingMapCenterCoordinate}
          locationLabel={planningLocation.label}
          userCoordinate={currentLocationInPlanningLocation}
          userHeading={currentHeading}
          markers={[]}
          routeCoordinates={[]}
          showRoutes={false}
          topInset={mapTopInset}
          onLocateMe={() => setLoadingMapResetKey((current) => current + 1)}
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
          </LargeScreenWorkspace>
        ) : (
          <View style={styles.body}>
            <View style={styles.mapLayer}>
              {loadingMapContent}
            </View>

            <GlassBottomSheet index={0} ref={sheetRef} snapPoints={snapPoints} animatedIndex={animatedIndex}>
              <BottomSheetScrollView contentContainerStyle={styles.mobileSheetContent} showsVerticalScrollIndicator={false}>
                <ExploreMobileSheetHeaderSkeleton />
                <ExploreMobileTripRailSkeleton />
                <View style={styles.mobileCardList}>
                  <ExploreActivityCardList activities={[]} getHref={() => '/explore/search'} isLoading />
                </View>
              </BottomSheetScrollView>
            </GlassBottomSheet>
          </View>
        )}
      </ThemedView>
    );
  }

  return (
    <ExploreScreenView
      currentHeading={currentHeading}
      currentLocation={currentLocation}
      headerAnimatedStyle={headerAnimatedStyle}
      isCardLoading={false}
      isDark={isDark}
      mapTopInset={mapTopInset}
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

function useRetainedQueryValue<T>(value: T | null | undefined) {
  const [retainedValue, setRetainedValue] = useState<T | null>(null);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setRetainedValue(value);
    }
  }, [value]);

  return value ?? retainedValue;
}


function ExploreScreenView({
  animatedIndex,
  currentHeading,
  currentLocation,
  headerAnimatedStyle,
  isCardLoading,
  isDark,
  mapTopInset,
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
  currentHeading?: number | null;
  currentLocation?: readonly [number, number] | null;
  headerAnimatedStyle?: object;
  isCardLoading: boolean;
  isDark: boolean;
  mapTopInset: number;
  pageContent: ExplorePageContent;
  joinableTripCards: readonly ExploreJoinableTripCard[];
  sheetRef?: React.RefObject<BottomSheet | null>;
  snapPoints?: (string | number)[];
  trip: TripDashboard | null;
  trips: readonly TripListItem[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
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
        ...pageContent.search.hiddenGems.items,
      ]),
    [pageContent.experiences, pageContent.search.hiddenGems.items]
  );
  const routeExperienceSlug = Array.isArray(params.experienceSlug)
    ? params.experienceSlug[0]
    : params.experienceSlug;
  const routeGroupCircleId = Array.isArray(params.groupCircleId)
    ? params.groupCircleId[0]
    : params.groupCircleId;
  const routeHiddenGemSlug = Array.isArray(params.hiddenGemSlug)
    ? params.hiddenGemSlug[0]
    : params.hiddenGemSlug;
  useSyncPlanningLocationWithCurrentLocation(currentLocation);
  const planningCopy = useMemo(
    () => getPlanningLocationCopy(planningLocation.id, planningLocation.label),
    [planningLocation.id, planningLocation.label]
  );
  const locationTrips = useMemo(
    () => trips.filter((candidate) => coordinateIsInPlanningLocation(candidate.centerCoordinate, planningLocation)),
    [planningLocation, trips]
  );
  const currentLocationInPlanningLocation = coordinateIsInPlanningLocation(currentLocation, planningLocation)
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
    () => tripRouteCoordinates.filter((coordinate) => coordinateIsInPlanningLocation(coordinate, planningLocation)),
    [planningLocation, tripRouteCoordinates]
  );
  const exploreMarkers = useMemo<ExploreMapMarker[]>(
    () =>
      pageContent.experiences
        .filter(
          (experience): experience is ExploreExperience & { coordinate: readonly [number, number] } =>
            Boolean(experience.coordinate)
        )
        .map((experience, index) => ({
          id: experience.slug,
          coordinate: experience.coordinate,
          experienceSlug: experience.slug,
          imageUri: experience.imageUri,
          itemKind: experience.itemKind ?? 'experience',
          label: experience.title,
          popularityScore: experience.travelerMomentum?.visitorCount ?? 0,
          tone: index % 2 === 0 ? 'accent' : 'dark',
        })),
    [pageContent.experiences]
  );
  const experienceBySlug = useMemo(() => {
    return new Map(pageContent.experiences.map((experience) => [experience.slug, experience]));
  }, [pageContent.experiences]);
  const locationTripMarkers = useMemo(
    () =>
      tripMarkers.filter((marker) =>
        destinationMatchesPlanningLocation({
          coordinate: marker.coordinate,
          location: planningLocation,
          labels: [marker.label],
        })
      ),
    [planningLocation, tripMarkers]
  );
  const locationExploreMarkers = useMemo(
    () =>
      exploreMarkers.filter((marker) => {
        const experience = marker.experienceSlug ? experienceBySlug.get(marker.experienceSlug) : undefined;

        return destinationMatchesPlanningLocation({
          coordinate: marker.coordinate,
          countryCode: experience?.countryCode,
          countryLabel: experience?.countryLabel,
          location: planningLocation,
          planningLocationId: experience?.planningLocationId,
          labels: [marker.label, marker.experienceSlug],
        });
      }),
    [experienceBySlug, exploreMarkers, planningLocation]
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
        location: planningLocation,
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
  }, [pageContent.experiences, planningLocation]);
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
            location: planningLocation,
            planningLocationId: card.planningLocationId,
            labels: [card.locationLabel, card.destinationLabel, card.experienceTitle, card.groupName],
          })
        );
      }),
    [joinableTripCards, locationExperienceBySlug, planningLocation]
  );
  const locationHiddenGems = useMemo(
    () =>
      pageContent.search.hiddenGems.items.filter((item) =>
        destinationMatchesPlanningLocation({
          countryCode: item.countryCode,
          countryLabel: item.countryLabel,
          location: planningLocation,
          planningLocationId: item.planningLocationId,
          labels: [item.title, item.description, item.geography?.region, item.geography?.town],
        })
      ),
    [pageContent.search.hiddenGems.items, planningLocation]
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
      setActiveDiscoveryRegion(discoveryRegionOptions[0].key);
    }
  }, [activeDiscoveryRegion, discoveryRegionOptions]);

  useEffect(() => {
    if (discoveryIntentOptions.some((option) => option.key === activeDiscoveryIntent)) {
      return;
    }

    setActiveDiscoveryIntent('all');
  }, [activeDiscoveryIntent, discoveryIntentOptions]);

  useEffect(() => {
    if (!isLargeScreen) {
      return;
    }

    if (routeExperienceSlug) {
      setSelectedGroupCircleId(null);
      setSelectedHiddenGemSlug(null);
      setSelectedStaySlug(null);
      setSelectedExperienceSlug(routeExperienceSlug);
      return;
    }

    if (routeGroupCircleId) {
      setSelectedExperienceSlug(null);
      setSelectedHiddenGemSlug(null);
      setSelectedStaySlug(null);
      setSelectedGroupCircleId(routeGroupCircleId);
      return;
    }

    if (routeHiddenGemSlug) {
      setSelectedExperienceSlug(null);
      setSelectedGroupCircleId(null);
      setSelectedStaySlug(null);
      setSelectedHiddenGemSlug(routeHiddenGemSlug);
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
  const tripCenterInPlanningLocation = coordinateIsInPlanningLocation(trip?.centerCoordinate, planningLocation)
    ? trip?.centerCoordinate
    : null;
  const heroCenterInPlanningLocation = coordinateIsInPlanningLocation(content.hero.centerCoordinate, planningLocation)
    ? content.hero.centerCoordinate
    : null;
  const mapCenterCoordinate =
    currentLocationInPlanningLocation ??
    tripCenterInPlanningLocation ??
    mapMarkers[0]?.coordinate ??
    heroCenterInPlanningLocation ??
    getPlanningLocationCenterCoordinate(planningLocation) ??
    null;
  const mapLocationLabel = currentLocationInPlanningLocation
    ? trip?.dayTitle ?? content.hero.locationLabel
    : planningLocation.label;

  useEffect(() => {
    if (locationTrips.length === 0) {
      return;
    }

    const selectedTripMatchesLocation = locationTrips.some((candidate) => candidate._id === selectedTripId);
    if (!selectedTripMatchesLocation) {
      onSelectTrip(locationTrips[0]._id);
    }
  }, [locationTrips, onSelectTrip, selectedTripId]);

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
    });
  }, [availablePlanningLocations, currentLocation, openPlanningLocationSheet]);
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

      if (marker.itemKind === 'hiddenGem' && marker.experienceSlug) {
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
  const largeContentColumnWidth = isTablet ? largeScreenWorkspace.mainColumnTabletWidth : largeScreenWorkspace.mainColumnWidth;
  const largeDetailColumnWidth = isTablet ? largeScreenWorkspace.detailColumnTabletWidth : largeScreenWorkspace.detailColumnWidth;
  const mapControlsInsetLeft =
    largeScreenWorkspace.inset +
    largeContentColumnWidth +
    largeScreenWorkspace.gap +
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
        userHeading={currentHeading}
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
        routeCoordinates={locationRouteCoordinates}
        showRoutes={locationRouteCoordinates.length > 1}
        recenterToUserSignal={recenterToUserSignal}
        topInset={mapTopInset}
        onInteract={handleMapInteract}
        onLocateMe={handleLocateMe}
        onMarkerPress={handlePressMapMarker}
        onOpenLocationSheet={handleOpenLocationSheet}
        planningLocation={planningLocation}
        hideHeader={isLargeScreen}
        shellStyle={StyleSheet.absoluteFill}
    />
  );
  const largeMapControls = (
    <View style={[styles.largeMapControlsFrame, { width: mapControlsWidth }]}>
      <DiscoveryFilters
        activeIntent={activeDiscoveryIntent}
        activeRegion={resolvedDiscoveryRegion}
        intents={discoveryIntentOptions}
        leadingSearchAccessory={
          <HeaderLocationSelector
            location={planningLocation}
            onPress={handleOpenLocationSheet}
            variant="desktopMap"
          />
        }
        regions={discoveryRegionOptions}
        searchPlaceholder={pageContent.search.intro.searchPlaceholder}
        searchQuery={searchQuery}
        trailingSearchAccessory={
          <GlassButton
            accessibilityLabel="Locate me"
            height={52}
            onPress={handleLocateMe}
            radius={designSystem.radii.pill}
            width={52}
          >
            <NavigationArrow
              color={isDark ? designSystem.colors.darkText : designSystem.colors.ink}
              size={20}
              weight="bold"
            />
          </GlassButton>
        }
        onIntentChange={setActiveDiscoveryIntent}
        onRegionChange={setActiveDiscoveryRegion}
        onSearchQueryChange={setSearchQuery}
        fullBleed={false}
        variant="desktopMap"
      />
    </View>
  );

  if (isLargeScreen) {
    return (
      <ThemedView style={styles.root}>
        <LargeScreenWorkspace
          mapContent={mapLayerContent}
          mapControls={largeMapControls}
          mapControlsStyle={{ left: mapControlsInsetLeft }}
        >
          <LargeScreenPanel kind="main"
          >
            <ExploreContent
              discoveryActivities={discoveryActivities}
              discoveryHiddenGems={discoveryHiddenGems}
              discoveryJoinableTripCards={discoveryJoinableTripCards}
              isDark={isDark}
              locationActivities={locationActivities}
              locationJoinableTripCards={locationJoinableTripCards}
              locationLabel={planningLocation.label}
              locationTrips={locationTrips}
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
          {selectedGroupCircleId ? (
            <LargeScreenPanel kind="detail">
              <ExploreGroupTripDetailScreen
                circleId={selectedGroupCircleId}
                onClose={() => setSelectedGroupCircleId(null)}
              />
            </LargeScreenPanel>
          ) : selectedHiddenGemSlug ? (
            <LargeScreenPanel kind="detail">
              <HiddenGemDetailScreen
                onClose={() => setSelectedHiddenGemSlug(null)}
                slug={selectedHiddenGemSlug}
              />
            </LargeScreenPanel>
          ) : selectedExperienceSlug ? (
            <LargeScreenPanel kind="detail">
              <ExperienceDetailContent
                hideHeader={false}
                onClose={() => setSelectedExperienceSlug(null)}
                slug={selectedExperienceSlug}
              />
            </LargeScreenPanel>
          ) : selectedStaySlug ? (
            <LargeScreenPanel kind="detail">
              <StayDetailScreen
                onClose={() => setSelectedStaySlug(null)}
                slug={selectedStaySlug}
              />
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
          locationLabel={planningLocation.label}
          locationTrips={locationTrips}
          planningCopy={planningCopy}
          selectedTripId={selectedTripId}
          sheetRef={sheetRef}
          snapPoints={snapPoints}
          onSelectTrip={handleSelectTrip}
        />
      </View>
    </ThemedView>
  );
}

const ExploreContent = memo(function ExploreContent({
  isDark,
  discoveryActivities,
  discoveryHiddenGems,
  discoveryJoinableTripCards,
  locationActivities,
  locationJoinableTripCards,
  locationLabel,
  locationTrips,
  planningCopy,
  searchQuery,
  selectedTripId,
  showInlineFilters = true,
  onSelectTrip,
  scrollContainerStyle,
  headerAnimatedStyle,
  onSelectActivity,
  onSelectGroupTrip,
  onSelectHiddenGem,
}: {
  discoveryActivities?: ExplorePageContent['home']['activities'];
  discoveryHiddenGems?: ExplorePageContent['search']['hiddenGems']['items'];
  discoveryJoinableTripCards?: readonly ExploreJoinableTripCard[];
  isDark: boolean;
  locationActivities: ExplorePageContent['home']['activities'];
  locationJoinableTripCards: readonly ExploreJoinableTripCard[];
  locationLabel: string;
  locationTrips: readonly TripListItem[];
  planningCopy: ReturnType<typeof getPlanningLocationCopy>;
  searchQuery: string;
  selectedTripId?: string;
  showInlineFilters?: boolean;
  onSelectTrip: (tripId: string) => void;
  scrollContainerStyle?: object;
  headerAnimatedStyle?: object;
  onSelectActivity?: (slug: string) => void;
  onSelectGroupTrip?: (circleId: string) => void;
  onSelectHiddenGem?: (slug: string) => void;
}) {
  const router = useRouter();
  const getActivityHref = useCallback(
    (activity: ExploreActivityCardContent) => {
        return {
            pathname: '/explore/[slug]' as const,
            params: { slug: activity.experienceSlug },
        };
    },
    []
  );

  const handlePressActivity = useCallback(
    (activity: ExploreActivityCardContent) => {
      if (onSelectActivity) {
        onSelectActivity(activity.experienceSlug);
        return;
      }

      router.push({
        pathname: '/explore/[slug]' as const,
        params: { slug: activity.experienceSlug },
      });
    },
    [onSelectActivity, router]
  );
  const handlePressHiddenGem = useCallback(
    (slug: string) => {
      if (onSelectHiddenGem) {
        onSelectHiddenGem(slug);
        return;
      }

      router.push({
        pathname: '/explore/hidden-gems/[slug]' as const,
        params: { slug },
      });
    },
    [onSelectHiddenGem, router]
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const contentActivities = discoveryActivities ?? locationActivities;
  const contentJoinableTripCards = discoveryJoinableTripCards ?? locationJoinableTripCards;
  const searchedActivities = useMemo(() => {
    if (discoveryActivities || !normalizedSearchQuery) {
      return contentActivities;
    }

    return contentActivities.filter((activity) => {
      const experience = activity.experienceSlug;
      return [
        activity.title,
        activity.subtitle,
        activity.countryLabel,
        experience,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearchQuery));
    });
  }, [contentActivities, discoveryActivities, normalizedSearchQuery]);
  const hiddenGemItems = useMemo(
    () => (discoveryHiddenGems ?? []).map(toHiddenGemDiscoveryItem),
    [discoveryHiddenGems]
  );
  const discoveryItems = useMemo<ExploreDiscoveryItem[]>(
    () => [
      ...searchedActivities.map((activity) => ({
        kind: 'experience' as const,
        card: activity,
        key: `experience-${activity.experienceSlug}`,
      })),
      ...hiddenGemItems,
    ],
    [hiddenGemItems, searchedActivities]
  );
  const { isLargeScreen } = useResponsive();
  const ScrollComponent = isLargeScreen ? ScrollView : BottomSheetScrollView;

  return (
    <ScrollComponent contentContainerStyle={[styles.sheetContent, scrollContainerStyle]} showsVerticalScrollIndicator={false}>
      <Animated.View style={headerAnimatedStyle ? [styles.sectionHeader, headerAnimatedStyle] : styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <ThemedText
            darkColor={designSystem.colors.darkText}
            lightColor={designSystem.colors.ink}
            numberOfLines={2}
            style={styles.sectionTitle}
          >
            {planningCopy.exploreTitle}
          </ThemedText>
        </View>
      </Animated.View>

      {showInlineFilters ? (
      <View style={styles.searchRail}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/explore/search')}
          style={[
            styles.searchPrimaryAction,
            {
              backgroundColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised,
              borderColor: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
            },
          ]}
        >
          <MagnifyingGlass
            color={isDark ? designSystem.colors.darkText : designSystem.colors.warmDark}
            size={20}
            weight="bold"
          />
          <ThemedText
            numberOfLines={1}
            style={[
              styles.searchPrimaryText,
              { color: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText },
            ]}
          >
            {searchQuery || `Search ${locationLabel} places`}
          </ThemedText>
        </Pressable>
      </View>
      ) : null}

      {showInlineFilters ? (
      <View style={styles.tripFilterRail}>
        {locationTrips.length > 0 ? (
          <TripFilterTabs
            trips={locationTrips}
            selectedTripId={selectedTripId}
            onSelectTrip={onSelectTrip}
          />
        ) : (
          null
        )}
      </View>
      ) : null}

      <View style={styles.cardList}>
        {contentJoinableTripCards.length > 0 ? (
          <View style={styles.groupTripSection}>
            <ThemedText style={styles.groupTripTitle}>Open groups to join</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupTripRail}
              decelerationRate="fast"
              snapToInterval={272}
            >
              {contentJoinableTripCards.map((card) => (
                <ExploreGroupTripCard
                  card={card}
                  href={{ pathname: '/explore/group/[circleId]', params: { circleId: card.circleId } }}
                  onOpen={onSelectGroupTrip ? () => onSelectGroupTrip(card.circleId) : undefined}
                  key={card.circleId}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
        {discoveryItems.map((item) => {
          if (item.kind === 'hiddenGem') {
            return (
              <ExploreActivityCard
                card={item.card}
                href={{ pathname: '/explore/hidden-gems/[slug]', params: { slug: item.slug } }}
                key={item.key}
                marker="gem"
                onPress={() => handlePressHiddenGem(item.slug)}
              />
            );
          }

          return (
              <ExploreActivityCard
                card={item.card}
                href={getActivityHref(item.card)}
                key={item.key}
                onPress={() => handlePressActivity(item.card)}
              />
            );
        })}
        {discoveryItems.length === 0 ? (
          <View
            style={[
              styles.emptyLocationCard,
              { borderColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft },
            ]}
          >
            <ThemedText style={styles.emptyLocationTitle}>
              {normalizedSearchQuery ? 'No matches yet' : `No ${locationLabel} picks yet`}
            </ThemedText>
            <ThemedText
              style={[
                styles.emptyLocationText,
                { color: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText },
              ]}
            >
              {normalizedSearchQuery
                ? 'Try another place, activity, or region name.'
                : 'Keep this location selected while you plan ahead. New stays and experiences will appear here when they are added.'}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </ScrollComponent>
  );
});

const ExploreLoadedSheet = memo(function ExploreLoadedSheet({
  animatedIndex,
  headerAnimatedStyle,
  isCardLoading,
  isDark,
  locationActivities,
  locationHiddenGems,
  locationJoinableTripCards,
  locationLabel,
  locationTrips,
  planningCopy,
  selectedTripId,
  sheetRef,
  snapPoints,
  onSelectTrip,
}: {
  animatedIndex?: ReturnType<typeof useSharedValue<number>>;
  headerAnimatedStyle?: object;
  isCardLoading: boolean;
  isDark: boolean;
  locationActivities: ExplorePageContent['home']['activities'];
  locationHiddenGems: ExplorePageContent['search']['hiddenGems']['items'];
  locationJoinableTripCards: readonly ExploreJoinableTripCard[];
  locationLabel: string;
  locationTrips: readonly TripListItem[];
  planningCopy: ReturnType<typeof getPlanningLocationCopy>;
  selectedTripId?: string;
  sheetRef?: React.RefObject<BottomSheet | null>;
  snapPoints?: (string | number)[];
  onSelectTrip: (tripId: string) => void;
}) {
  const getActivityHref = useCallback(
    (activity: ExploreActivityCardContent) => ({
      pathname: '/explore/[slug]' as const,
      params: { slug: activity.experienceSlug },
    }),
    []
  );
  const hiddenGemItems = useMemo(
    () => locationHiddenGems.map(toHiddenGemDiscoveryItem),
    [locationHiddenGems]
  );
  const discoveryItems = useMemo<ExploreDiscoveryItem[]>(
    () => [
      ...locationActivities.map((activity) => ({
        kind: 'experience' as const,
        card: activity,
        key: `experience-${activity.experienceSlug}`,
      })),
      ...hiddenGemItems,
    ],
    [hiddenGemItems, locationActivities]
  );

  return (
    <GlassBottomSheet
      index={0}
      ref={sheetRef}
      snapPoints={snapPoints ?? ['34%', '64%', '100%']}
      animatedIndex={animatedIndex}>
      <BottomSheetScrollView contentContainerStyle={styles.mobileSheetContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={headerAnimatedStyle ? [styles.mobileSectionHeader, headerAnimatedStyle] : styles.mobileSectionHeader}>
          <View style={styles.sectionCopy}>
            <ThemedText
              darkColor={designSystem.colors.darkText}
              lightColor={designSystem.colors.ink}
              style={styles.mobileSectionTitle}
            >
              {planningCopy.exploreTitle}
            </ThemedText>
            <ThemedText
              style={[
                styles.mobileSectionSubtitle,
                { color: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText },
              ]}
            >
              Nearby plans, open groups, and places worth saving.
            </ThemedText>
          </View>
          <Link href="/explore/search" asChild>
            <GlassButton accessibilityLabel="Search experiences" width={48} height={48}>
              <MagnifyingGlass color={isDark ? designSystem.colors.white : designSystem.colors.warmDark} size={20} weight="bold" />
            </GlassButton>
          </Link>
        </Animated.View>

        <View style={styles.mobileTripFilterRail}>
          {locationTrips.length > 0 ? (
            <TripFilterTabs
              trips={locationTrips}
              selectedTripId={selectedTripId}
              onSelectTrip={onSelectTrip}
            />
          ) : (
            <Link href="/explore/search" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create new trip"
                style={styles.tripFilterEmptyAction}
              >
                <View style={styles.createTripButtonContent}>
                  <Plus
                    color={isDark ? designSystem.colors.darkText : designSystem.colors.warmDark}
                    size={16}
                    weight="bold"
                  />
                  <ThemedText style={[styles.createTripButtonText, isDark && styles.createTripButtonTextDark]}>
                    Create new trip
                  </ThemedText>
                </View>
              </Pressable>
            </Link>
          )}
        </View>

        <View style={styles.mobileCardList}>
          {locationJoinableTripCards.length > 0 ? (
            <View style={styles.openTripsSection}>
              <View style={styles.openTripsHeader}>
                <ThemedText style={styles.openTripsTitle}>Public trips people are planning</ThemedText>
                <ThemedText
                  style={[
                    styles.openTripsSubtitle,
                    { color: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText },
                  ]}
                >
                  Join a route someone opened up, or make your own trip public for others to request in.
                </ThemedText>
              </View>
              {locationJoinableTripCards.map((card) => (
                <ExploreGroupTripCard
                  key={card.circleId}
                  card={card}
                  href={{ pathname: '/explore/group/[circleId]', params: { circleId: card.circleId } }}
                />
              ))}
            </View>
          ) : null}
          {isCardLoading ? (
            <ExploreActivityCardList
              activities={[]}
              getHref={getActivityHref}
              isLoading
            />
          ) : (
            discoveryItems.map((item) => {
              if (item.kind === 'hiddenGem') {
                return (
                  <ExploreActivityCard
                    card={item.card}
                    href={{ pathname: '/explore/hidden-gems/[slug]', params: { slug: item.slug } }}
                    key={item.key}
                    marker="gem"
                  />
                );
              }

              return (
                <ExploreActivityCard
                  card={item.card}
                  href={getActivityHref(item.card)}
                  key={item.key}
                />
              );
            })
          )}
          {!isCardLoading && discoveryItems.length === 0 ? (
            <View
              style={[
                styles.emptyLocationCard,
                { borderColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft },
              ]}
            >
              <ThemedText style={styles.emptyLocationTitle}>No {locationLabel} picks yet</ThemedText>
              <ThemedText
                style={[
                  styles.emptyLocationText,
                  { color: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText },
                ]}
              >
                Keep this location selected while you plan ahead. New stays and experiences will appear here when they are added.
              </ThemedText>
            </View>
          ) : null}
        </View>
      </BottomSheetScrollView>
    </GlassBottomSheet>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  bodyLarge: {
    flex: 1,
    flexDirection: 'row',
    gap: largeScreenWorkspace.gap,
    padding: largeScreenWorkspace.inset,
  },
  mapLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  mapLayerLarge: {
    ...StyleSheet.absoluteFillObject,
  },
  contentColumn: {
    flexShrink: 0,
    flexGrow: 0,
    minWidth: 340,
    zIndex: 10,
  },
  contentColumnTablet: {
    width: largeScreenWorkspace.mainColumnTabletWidth,
  },
  contentColumnDesktop: {
    width: largeScreenWorkspace.mainColumnWidth,
  },
  detailColumn: {
    flexShrink: 0,
    flexGrow: 0,
    zIndex: 11,
  },
  largeSheetColumn: {
    height: '100%',
    borderWidth: 1,
    borderRadius: largeScreenWorkspace.panelRadius,
    overflow: 'hidden',
  },
  detailColumnTablet: {
    width: largeScreenWorkspace.detailColumnTabletWidth,
  },
  detailColumnDesktop: {
    width: largeScreenWorkspace.detailColumnWidth,
  },
  detailEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  detailEmptyText: {
    fontSize: 16,
    color: designSystem.colors.gray,
    textAlign: 'center',
  },
  mapColumn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: designSystem.colors.mapFallback,
    position: 'relative',
  },
  mapColumnLarge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: designSystem.colors.mapFallback,
    zIndex: 0,
  },
  mapControlsOverlay: {
    position: 'absolute',
    top: largeScreenWorkspace.inset,
    right: largeScreenWorkspace.inset,
    alignItems: 'stretch',
    zIndex: 5,
  },
  largeMapControlsFrame: {
    maxWidth: '100%',
  },
  columnScroll: {
    paddingTop: 18,
    paddingBottom: 48,
  },
  sheetContent: {
    paddingBottom: 32,
  },
  mobileSheetContent: {
    paddingTop: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    paddingBottom: 132,
    gap: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 14,
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
  },
  mobileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  mobileSectionTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '600',
  },
  mobileSectionSubtitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    maxWidth: 260,
  },
  createTripButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createTripButtonText: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  createTripButtonTextDark: {
    color: designSystem.colors.darkText,
  },
  searchRail: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchPrimaryAction: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  searchPrimaryText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    padding: 0,
  },
  tripFilterRail: {
    paddingBottom: 8,
  },
  mobileTripFilterRail: {
    minHeight: 44,
    justifyContent: 'center',
  },
  tripFilterEmptyAction: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  cardList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  mobileCardList: {
    gap: 16,
  },
  groupTripSection: {
    marginTop: 6,
    marginBottom: 12,
    gap: 12,
  },
  groupTripTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
  groupTripRail: {
    gap: 12,
    paddingBottom: 4,
  },
  openTripsSection: {
    gap: 12,
  },
  openTripsHeader: {
    gap: 4,
  },
  openTripsTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
  openTripsSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyLocationCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
  },
  emptyLocationTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyLocationText: {
    fontSize: 15,
    lineHeight: 22,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
});

function getExperiencePopularityCount(experience: ExplorePageContent['experiences'][number]) {
  return Math.max(
    experience.travelerMomentum?.visitorCount ?? 0,
    experience.reviewCount ?? 0
  );
}

function compareExperiencesByPopularity(
  a: ExplorePageContent['experiences'][number],
  b: ExplorePageContent['experiences'][number]
) {
  const popularityDelta = getExperiencePopularityCount(b) - getExperiencePopularityCount(a);

  if (popularityDelta !== 0) {
    return popularityDelta;
  }

  return a.title.localeCompare(b.title);
}

function toTrendingActivityCard(
  experience: ExplorePageContent['experiences'][number]
): ExplorePageContent['home']['activities'][number] {
  return {
    badge: experience.badge,
    badgeTone: experience.badgeTone,
    ctaLabel: experience.ctaLabel,
    experienceSlug: experience.slug,
    imageUri: experience.imageUri,
    price: experience.price,
    priceSuffix: experience.priceSuffix,
    subtitle: experience.locationLabel ?? experience.subtitle,
    title: experience.title,
    visitorCount: getExperiencePopularityCount(experience),
    countryLabel: experience.countryLabel ?? experience.locationLabel,
    ...(experience.travelerMomentum?.avatarUris
      ? { avatarUris: [...experience.travelerMomentum.avatarUris] }
      : {}),
  };
}

function toHiddenGemDiscoveryItem(item: ExploreHiddenGem): ExploreDiscoveryItem {
  const slug = getHiddenGemSlug(item.title);

  return {
    kind: 'hiddenGem',
    key: `hidden-gem-${slug}`,
    slug,
    card: {
      badge: item.badge ?? 'Hidden gem',
      badgeTone: 'soft',
      ctaLabel: item.primaryLabel ?? 'Open gem',
      experienceSlug: slug,
      imageUri: item.imageUri,
      price: '',
      priceSuffix: '',
      subtitle: item.locationLabel ?? item.summary ?? item.description,
      title: item.title,
      countryLabel: item.countryLabel,
    },
  };
}

function getPlanningLocationCopy(_locationId: string, locationLabel: string) {
  return {
    exploreTitle: `Top 10 places in ${locationLabel}`,
  };
}
