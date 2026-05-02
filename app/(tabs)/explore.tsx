import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { Link } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassButton } from '@/components/ui/glass-button';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import {
  ExploreActivityCardSkeleton,
  ExploreSheetHeaderSkeleton,
  ExploreTripFilterSkeleton,
} from '@/components/wandr/explore/card-skeletons';
import { ExploreGroupTripCard } from '@/components/wandr/explore/group-trip-card';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import { PlanningLocationSheet } from '@/components/wandr/planning-country-sheet';
import { TripFilterTabs } from '@/components/wandr/trip/trip-filter-tabs';
import { designSystem } from '@/constants/design-system';
import {
  coordinateIsInPlanningLocation,
  destinationMatchesPlanningLocation,
} from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { usePlanningLocation, useSyncPlanningLocationWithCurrentLocation } from '@/hooks/use-planning-location';
import { ensureExploreCommunitySeedRef, getExploreJoinableTripCardsRef, getExplorePageContentRef, getTripDashboardRef, listUserTripsRef, seedDefaultPageContentRef } from '@/lib/convex';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';
import { buildTripRouteCoordinates } from '@/lib/trip-route';
import type { ExploreJoinableTripCard, ExplorePageContent } from '@/types/explore';
import type { TripDashboard, TripListItem } from '@/types/trip';
import { MagnifyingGlass } from 'phosphor-react-native';

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
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['34%', '64%', '100%'], []);
  const traveler = useCurrentTraveler();
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(undefined);
  const trips = useQuery(listUserTripsRef, { travelerSlug: traveler?.slug ?? '' });
  const trip = useQuery(getTripDashboardRef, { travelerSlug: traveler?.slug ?? '', tripId: selectedTripId });
  const joinableTripCards = useQuery(
    getExploreJoinableTripCardsRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : 'skip'
  );
  const seedExplorePageContent = useMutation(seedDefaultPageContentRef);
  const ensureExploreCommunitySeed = useMutation(ensureExploreCommunitySeedRef);
  const [isSeeding, setIsSeeding] = useState(false);
  const [didEnsureCommunitySeed, setDidEnsureCommunitySeed] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [loadingMapResetKey, setLoadingMapResetKey] = useState(0);
  const { planningLocation } = usePlanningLocation();
  const animatedIndex = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingTop: interpolate(animatedIndex.value, [1, 2], [0, mapTopInset], 'clamp'),
    };
  });

  useEffect(() => {
    if (page !== null || isSeeding) {
      return;
    }

    let isMounted = true;

    const seed = async () => {
      setIsSeeding(true);
      setSeedError(null);

      try {
        await seedExplorePageContent({});
      } catch (error) {
        if (isMounted) {
          setSeedError(error instanceof Error ? error.message : 'Unable to load Explore content from Convex.');
        }
      } finally {
        if (isMounted) {
          setIsSeeding(false);
        }
      }
    };

    void seed();

    return () => {
      isMounted = false;
    };
  }, [isSeeding, page, seedExplorePageContent]);

  useEffect(() => {
    if (!page || didEnsureCommunitySeed) {
      return;
    }

    let isMounted = true;

    const ensureCommunity = async () => {
      try {
        await ensureExploreCommunitySeed({});
      } catch (error) {
        if (isMounted) {
          setSeedError(error instanceof Error ? error.message : 'Unable to load public trips from Convex.');
        }
      } finally {
        if (isMounted) {
          setDidEnsureCommunitySeed(true);
        }
      }
    };

    void ensureCommunity();

    return () => {
      isMounted = false;
    };
  }, [didEnsureCommunitySeed, ensureExploreCommunitySeed, page]);

  useEffect(() => {
    if (!trips || trips.length === 0) {
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
      currentLocationInPlanningLocation ??
      planningLocation.centerCoordinate ??
      [17.0832, -22.5609];

    return (
      <ThemedView style={styles.root}>
        <View style={styles.body}>
          <View style={styles.mapLayer}>
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
            />
          </View>
          <GlassBottomSheet
            index={0}
            ref={sheetRef}
            snapPoints={snapPoints}
            animatedIndex={animatedIndex}>
            <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <ExploreSheetHeaderSkeleton />
              <ExploreTripFilterSkeleton />
              <View style={styles.cardList}>
                {Array.from({ length: 3 }).map((_, index) => <ExploreActivityCardSkeleton key={`activity-skeleton-${index}`} />)}
              </View>
            </BottomSheetScrollView>
          </GlassBottomSheet>
        </View>
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
      notice={seedError}
      pageContent={page}
      joinableTripCards={joinableTripCards ?? []}
      sheetRef={sheetRef}
      snapPoints={snapPoints}
      trip={trip ?? null}
      trips={trips ?? []}
      selectedTripId={selectedTripId}
      onSelectTrip={setSelectedTripId}
      animatedIndex={animatedIndex}
    />
  );
}

function ExploreScreenView({
  animatedIndex,
  currentHeading,
  currentLocation,
  headerAnimatedStyle,
  isCardLoading,
  isDark,
  mapTopInset,
  notice,
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
  notice: string | null;
  pageContent: ExplorePageContent;
  joinableTripCards: readonly ExploreJoinableTripCard[];
  sheetRef?: React.RefObject<BottomSheet | null>;
  snapPoints?: (string | number)[];
  trip: TripDashboard | null;
  trips: readonly TripListItem[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
}) {
  const [mapResetKey, setMapResetKey] = useState(0);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const { planningLocation, setPlanningLocation } = usePlanningLocation();
  const content = pageContent.home;
  useSyncPlanningLocationWithCurrentLocation(currentLocation);
  const planningCopy = getPlanningLocationCopy(planningLocation.id);
  const locationTrips = useMemo(
    () => trips.filter((candidate) => coordinateIsInPlanningLocation(candidate.centerCoordinate, planningLocation)),
    [planningLocation, trips]
  );
  const tripMarkers = trip ? buildTripMapMarkers(trip.items, 10) : [];
  const tripRouteCoordinates = buildTripRouteCoordinates(trip, {
    currentCoordinate: currentLocation,
    onlyRemaining: true,
  });
  const locationRouteCoordinates = tripRouteCoordinates.filter((coordinate) =>
    coordinateIsInPlanningLocation(coordinate, planningLocation)
  );
  const exploreMarkers = content.hero.markers;
  const experienceBySlug = useMemo(() => {
    return new Map(pageContent.experiences.map((experience) => [experience.slug, experience]));
  }, [pageContent.experiences]);
  const locationTripMarkers = tripMarkers.filter((marker) =>
    destinationMatchesPlanningLocation({
      coordinate: marker.coordinate,
      location: planningLocation,
      labels: [marker.label],
    })
  );
  const locationExploreMarkers = exploreMarkers.filter((marker) => {
    const experience = marker.experienceSlug ? experienceBySlug.get(marker.experienceSlug) : undefined;

    return destinationMatchesPlanningLocation({
      coordinate: marker.coordinate,
      countryCode: experience?.countryCode,
      countryLabel: experience?.countryLabel,
      location: planningLocation,
      planningLocationId: experience?.planningLocationId,
      labels: [marker.label, marker.experienceSlug],
    });
  });
  const mapMarkers = [...locationTripMarkers, ...locationExploreMarkers];
  const locationActivities = content.activities.filter((activity) => {
    const experience = experienceBySlug.get(activity.experienceSlug);

    return destinationMatchesPlanningLocation({
      coordinate: experience?.coordinate,
      countryCode: experience?.countryCode,
      countryLabel: experience?.countryLabel,
      location: planningLocation,
      planningLocationId: experience?.planningLocationId,
      labels: [
        experience?.locationLabel,
        experience?.geography?.region,
        experience?.geography?.town,
        experience?.title,
        activity.title,
        activity.subtitle,
      ],
    });
  });
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
  const currentLocationInPlanningLocation = coordinateIsInPlanningLocation(currentLocation, planningLocation)
    ? currentLocation
    : null;
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
    planningLocation.centerCoordinate ??
    content.hero.centerCoordinate;
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

  const handleMapInteract = () => {
    sheetRef?.current?.snapToIndex(0);
  };

  return (
    <ThemedView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.mapLayer}>
          <ExploreMapHero
            key={mapResetKey}
            centerCoordinate={mapCenterCoordinate}
            locationLabel={mapLocationLabel}
            userCoordinate={currentLocationInPlanningLocation}
            userHeading={currentHeading}
            markers={mapMarkers}
            routeCoordinates={locationRouteCoordinates}
            showRoutes={locationRouteCoordinates.length > 1}
            topInset={mapTopInset}
            onInteract={handleMapInteract}
            onLocateMe={() => setMapResetKey((current) => current + 1)}
            onOpenLocationSheet={() => setLocationSheetVisible(true)}
            planningLocation={planningLocation}
          />
        </View>

        <GlassBottomSheet
          index={0}
          ref={sheetRef}
          snapPoints={snapPoints ?? ['34%', '64%', '100%']}
          animatedIndex={animatedIndex}>
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={headerAnimatedStyle ? [styles.sectionHeader, headerAnimatedStyle] : styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText style={styles.sectionTitle}>{planningCopy.exploreTitle}</ThemedText>
              </View>
              <Link href="/explore/search" asChild>
                <GlassButton accessibilityLabel="Search experiences" width={48} height={48}>
                  <MagnifyingGlass color={isDark ? designSystem.colors.white : designSystem.colors.warmDark} size={20} weight="bold" />
                </GlassButton>
              </Link>
            </Animated.View>

            <View style={styles.tripFilterRail}>
              {locationTrips.length > 0 ? (
                <TripFilterTabs
                  trips={locationTrips}
                  selectedTripId={selectedTripId}
                  onSelectTrip={(tripId) => {
                    onSelectTrip(tripId);
                    setMapResetKey((current) => current + 1);
                  }}
                />
              ) : null}
            </View>

            <View style={styles.cardList}>
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
              {isCardLoading
                ? Array.from({ length: 3 }).map((_, index) => <ExploreActivityCardSkeleton key={`activity-skeleton-${index}`} />)
                : locationActivities.map((activity, index) => (
                    <ExploreActivityCard
                      card={activity}
                      href={{ pathname: '/explore/[slug]', params: { slug: activity.experienceSlug } }}
                      key={`activity-${activity.experienceSlug}-${index}`}
                    />
                  ))}
              {!isCardLoading && locationActivities.length === 0 ? (
                <View
                  style={[
                    styles.emptyLocationCard,
                    { borderColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft },
                  ]}
                >
                  <ThemedText style={styles.emptyLocationTitle}>No {planningLocation.label} picks yet</ThemedText>
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
        <PlanningLocationSheet
          currentCoordinate={currentLocation}
          selectedLocation={planningLocation}
          visible={locationSheetVisible}
          onClose={() => setLocationSheetVisible(false)}
          onSelectLocation={(location) => {
            setPlanningLocation(location, { manual: true });
            setMapResetKey((current) => current + 1);
          }}
        />
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
  sheetContent: {
    paddingTop: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    paddingBottom: 132,
    gap: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '600',
  },
  tripFilterRail: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cardList: {
    gap: 16,
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
    fontWeight: '700',
  },
  openTripsSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyLocationCard: {
    borderWidth: 1,
    borderRadius: designSystem.radii.card,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 6,
    backgroundColor: designSystem.colors.whiteOverlayFaint,
  },
  emptyLocationTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  emptyLocationText: {
    ...designSystem.type.body,
  },
  noticeCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
});

function getPlanningLocationCopy(locationId: string) {
  if (locationId === 'south-africa') {
    return {
      exploreTitle: 'Start with Cape Town, then branch out',
    };
  }

  return {
    exploreTitle: 'Start with a popular place, then branch out',
  };
}
