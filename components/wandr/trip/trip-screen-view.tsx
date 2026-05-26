import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { ExperienceDetailContent } from '@/components/wandr/explore/experience-detail-content';
import { WandrHeader, type HeaderAction } from '@/components/wandr/header';
import { LargeScreenPanel, LargeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { OfflineMapHeaderButton } from '@/components/wandr/offline/offline-map-download-button';
import { StayDetailScreen } from '@/components/wandr/stays/stay-detail-screen';
import { TripGroupPanel } from '@/components/wandr/trip/trip-group-panel';
import { styles } from '@/components/wandr/trip/trip-screen.styles';
import { TripSwitcher } from '@/components/wandr/trip/trip-switcher';
import { TripTimelineSection } from '@/components/wandr/trip/trip-timeline-section';
import { getPlanningLocationCenterCoordinate } from '@/constants/planning-countries';
import { usePlanningLocation } from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';
import { createTripOfflineMapRegion } from '@/lib/offline-map-regions';
import { buildTripRouteCoordinates } from '@/lib/trip-route';
import type { TripDashboard, TripDashboardItem, TripListItem } from '@/types/trip';

export function TripLoadingScreen({
  insetsBottom,
  insetsTop,
  isDark,
  isLargeScreen,
}: {
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
  isLargeScreen: boolean;
}) {
  const { planningLocation } = usePlanningLocation();
  const planningCenterCoordinate = getPlanningLocationCenterCoordinate(planningLocation);
  const loadingContent = (
    <>
      {!isLargeScreen ? (
        <WandrHeader
          config={{
            overlay: true,
            trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' }],
          }}
        />
      ) : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: isLargeScreen ? insetsTop + 24 : insetsTop + 72, paddingBottom: insetsBottom + 88 },
        ]}>
        <TripSwitcher
          isLoading
          trips={[]}
          onDeleteTrip={() => {}}
          onSelectTrip={() => {}}
          onNewTrip={() => {}}
        />
        <TripTimelineSection isLoading />
      </ScrollView>
    </>
  );

  if (isLargeScreen) {
    return (
      <ThemedView style={[styles.root, isDark && styles.rootDark]}>
        <LargeScreenWorkspace
          mapContent={
            <MapPreview
              centerCoordinate={planningCenterCoordinate}
              markers={[]}
              persistKey="app-background"
              routeCoordinates={[]}
              showRoutes={false}
              zoomLevel={12}
            />
          }
        >
          <LargeScreenPanel kind="main" style={isDark ? styles.largePanelDark : null}>
            {loadingContent}
          </LargeScreenPanel>
        </LargeScreenWorkspace>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.root, isDark && styles.rootDark]}>
      {loadingContent}
    </ThemedView>
  );
}

export function TripScreenView({
  insetsBottom,
  insetsTop,
  isDark,
  router,
  trip,
  trips,
  selectedTripId,
  onDeleteTrip,
  onSelectTrip,
  isEditing,
  onRemoveItem,
  onOpenSettings,
  onToggleEditing,
  planningCenterCoordinate,
  removingItemId,
  useSkeletons,
}: {
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
  router: ReturnType<typeof useRouter>;
  trip: TripDashboard;
  trips: TripListItem[];
  selectedTripId?: string;
  onDeleteTrip: (id: string) => void;
  onSelectTrip: (id: string) => void;
  onCreateTripPress: () => void;
  isEditing: boolean;
  onRemoveItem: (itemId: string) => void;
  onOpenSettings: () => void;
  onToggleEditing: () => void;
  planningCenterCoordinate: readonly [number, number] | null;
  removingItemId: string | null;
  useSkeletons: boolean;
}) {
  const { isLargeScreen } = useResponsive();
  const [detailItem, setDetailItem] = useState<TripDashboardItem | null>(null);
  const items = trip.items;
  const mapMarkers = useMemo(() => buildTripMapMarkers(trip.items, 10), [trip.items]);
  const routeCoordinates = useMemo(() => buildTripRouteCoordinates(trip, { onlyRemaining: false }), [trip]);
  const offlineRegion = useMemo(
    () =>
      createTripOfflineMapRegion({
        centerCoordinate: trip.centerCoordinate ?? mapMarkers[0]?.coordinate ?? planningCenterCoordinate,
        coordinates: routeCoordinates.length > 0 ? routeCoordinates : mapMarkers.map((marker) => marker.coordinate),
        tripId: trip.tripId,
        tripName: trip.tripName,
      }),
    [mapMarkers, planningCenterCoordinate, routeCoordinates, trip]
  );
  const canEditTrip = !trip.isGroupTrip || Boolean(trip.group?.isHost);
  const trailingActions: HeaderAction[] = [
    ...(offlineRegion
      ? [
          {
            kind: 'map',
            accessibilityLabel: `Download ${offlineRegion.label}`,
            render: <OfflineMapHeaderButton region={offlineRegion} />,
          } satisfies HeaderAction,
        ]
      : []),
    ...(canEditTrip
      ? [
          {
            kind: isEditing ? 'check' : 'pencil',
            accessibilityLabel: isEditing ? 'Done editing itinerary' : 'Edit trip',
            tone: 'surface',
            onPress: isEditing ? onToggleEditing : onOpenSettings,
          } satisfies HeaderAction,
        ]
      : []),
    {
      kind: 'map',
      accessibilityLabel: 'Start trip',
      tone: 'surface',
      onPress: () =>
        router.push({
          pathname: '/trip/map',
          params: selectedTripId ? { tripId: selectedTripId } : undefined,
        }),
    },
    { kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' },
  ];

  const mainContent = (
    <>
      {!isLargeScreen ? (
        <WandrHeader
          config={{
            overlay: true,
            trailingActions,
          }}
        />
      ) : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: isLargeScreen ? insetsTop + 24 : insetsTop + 72, paddingBottom: insetsBottom + 88 },
        ]}>
        <TripSwitcher
          trips={trips}
          selectedTripId={selectedTripId}
          isEditing={false}
          onDeleteTrip={onDeleteTrip}
          onSelectTrip={onSelectTrip}
          onNewTrip={() => router.push('/explore/search')}
        />

        {trip.group ? (
          <TripGroupPanel
            group={trip.group}
            onOpenChat={() => router.push(`/friends/group/${trip.group?.circleId}` as never)}
          />
        ) : null}

        {useSkeletons || items.length > 0 ? (
          <TripTimelineSection
            items={items}
            isLoading={useSkeletons}
            isEditing={isEditing}
            onOpenItem={isLargeScreen ? setDetailItem : undefined}
            onRemoveItem={onRemoveItem}
            removingItemId={removingItemId}
          />
        ) : null}
      </ScrollView>
    </>
  );

  if (isLargeScreen) {
    return (
      <ThemedView style={[styles.root, isDark && styles.rootDark]}>
        <LargeScreenWorkspace
          mapContent={
            <MapPreview
              centerCoordinate={trip.centerCoordinate ?? mapMarkers[0]?.coordinate ?? planningCenterCoordinate}
              markers={mapMarkers}
              persistKey="app-background"
              routeCoordinates={routeCoordinates}
              showRoutes={routeCoordinates.length > 1}
              zoomLevel={12}
            />
          }
          mapControls={offlineRegion ? <OfflineMapHeaderButton region={offlineRegion} /> : undefined}
        >
          <LargeScreenPanel kind="main" style={isDark ? styles.largePanelDark : null}>
            {mainContent}
          </LargeScreenPanel>
          {detailItem ? (
            <LargeScreenPanel kind="detail" style={isDark ? styles.largePanelDark : null}>
              {detailItem.kind === 'stay' ? (
                <StayDetailScreen onClose={() => setDetailItem(null)} slug={detailItem.experienceSlug} />
              ) : (
                <ExperienceDetailContent
                  onClose={() => setDetailItem(null)}
                  slug={detailItem.experience.slug}
                />
              )}
            </LargeScreenPanel>
          ) : null}
        </LargeScreenWorkspace>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.root, isDark && styles.rootDark]}>
      {mainContent}
    </ThemedView>
  );
}
