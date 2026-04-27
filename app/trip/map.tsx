import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useQuery } from 'convex/react';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import { WandrHeader } from '@/components/wandr/header';
import { TripTimelineSkeleton } from '@/components/wandr/trip/trip-skeletons';
import { TripTimelineSection } from '@/components/wandr/trip/trip-timeline-section';
import { designSystem } from '@/constants/design-system';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { getTripDashboardRef } from '@/lib/convex';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';
import type { TripDashboard } from '@/types/trip';

export default function TripMapScreen() {
  return <ConnectedTripMapScreen />;
}

function ConnectedTripMapScreen() {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['34%', '64%', '100%'], []);
  const animatedIndex = useSharedValue(0);
  const traveler = useCurrentTraveler();

  const trip = useQuery(getTripDashboardRef, { 
    travelerSlug: traveler?.slug ?? '',
    tripId: undefined // Map screen currently only supports default trip
  });
  const { coordinate: currentLocation, heading: currentHeading } = useCurrentLocation();

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingTop: interpolate(animatedIndex.value, [1, 2], [0, insets.top], 'clamp'),
    };
  });

  if (!traveler || !trip) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
            title: 'Trip Map',
          }}
        />
        <View style={styles.body} />
      </ThemedView>
    );
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
      trip={trip}
      useSkeletons={false}
    />
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
  useSkeletons: boolean;
}) {
  const [mapResetKey, setMapResetKey] = useState(0);
  const items = trip.items;
  const markers = buildTripMapMarkers(items, 10);
  const centerCoordinate = currentLocation ?? trip.centerCoordinate ?? markers[0]?.coordinate ?? null;

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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionTitle: {
    ...designSystem.type.title,
    color: designSystem.colors.ink,
  },
});
