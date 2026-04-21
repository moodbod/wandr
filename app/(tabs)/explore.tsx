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
import { ExploreActivityCardSkeleton } from '@/components/wandr/explore/card-skeletons';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { getExplorePageContentRef, getTripDashboardRef, seedDefaultPageContentRef } from '@/lib/convex';
import { currentDemoTravelerSlug } from '@/lib/demo-session';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';
import type { ExplorePageContent } from '@/types/explore';
import type { TripDashboard } from '@/types/trip';
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
  const page = useQuery(getExplorePageContentRef, { slug: 'default' });
  const trip = useQuery(getTripDashboardRef, { travelerSlug: currentDemoTravelerSlug });
  const seedDefaultPageContent = useMutation(seedDefaultPageContentRef);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
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
        await seedDefaultPageContent({});
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
  }, [isSeeding, page, seedDefaultPageContent]);

  if (!page) {
    return (
      <ThemedView style={styles.root}>
        <View style={styles.body}>
          <GlassBottomSheet
            index={0}
            ref={sheetRef}
            snapPoints={snapPoints}
            animatedIndex={animatedIndex}>
            <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
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
      sheetRef={sheetRef}
      snapPoints={snapPoints}
      trip={trip ?? null}
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
  sheetRef,
  snapPoints,
  trip,
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
  sheetRef?: React.RefObject<BottomSheet | null>;
  snapPoints?: (string | number)[];
  trip: TripDashboard | null;
}) {
  const [mapResetKey, setMapResetKey] = useState(0);
  const content = pageContent.home;
  const tripMarkers = trip ? buildTripMapMarkers(trip.items, 10) : [];
  const mapMarkers = tripMarkers.length > 0 ? tripMarkers : content.hero.markers;
  const mapCenterCoordinate = currentLocation ?? trip?.centerCoordinate ?? content.hero.centerCoordinate;
  const mapLocationLabel = trip?.dayTitle ?? content.hero.locationLabel;

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
            userCoordinate={currentLocation}
            userHeading={currentHeading}
            markers={mapMarkers}
            topInset={mapTopInset}
            onInteract={handleMapInteract}
            onLocateMe={() => setMapResetKey((current) => current + 1)}
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
                <ThemedText
                  style={styles.locationEyebrow}
                  lightColor={designSystem.colors.darkGreen}
                  darkColor={designSystem.colors.lime}>
                  {content.hero.locationLabel}
                </ThemedText>
                <ThemedText style={styles.sectionTitle}>{content.section.title}</ThemedText>
              </View>
              <Link href="/explore/search" asChild>
                <GlassButton accessibilityLabel="Search experiences" width={48} height={48}>
                  <MagnifyingGlass color={isDark ? '#fff' : designSystem.colors.warmDark} size={20} weight="bold" />
                </GlassButton>
              </Link>
            </Animated.View>

            <View style={styles.cardList}>
              {isCardLoading
                ? Array.from({ length: 3 }).map((_, index) => <ExploreActivityCardSkeleton key={`activity-skeleton-${index}`} />)
                : content.activities.map((activity, index) => (
                    <ExploreActivityCard
                      card={activity}
                      href={{ pathname: '/explore/[slug]', params: { slug: activity.experienceSlug } }}
                      key={`${activity.experienceSlug}-${index}`}
                    />
                  ))}
            </View>
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
  sheetContent: {
    paddingTop: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    paddingBottom: 132,
    gap: 20,
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
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  cardList: {
    gap: 16,
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
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
});
