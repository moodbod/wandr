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

import { ThemedView } from '@/components/themed-view';
import { WandrHeader } from '@/components/wandr/header';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { StaysDiscoveryControls } from '@/components/wandr/stays/stays-discovery-controls';
import { StaysRailCard } from '@/components/wandr/stays/stays-rail-card';
import { rankStayProperties } from '@/constants/stays-content';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { getTripDashboardRef, listAllStaysRef, listUserTripsRef } from '@/lib/convex';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';

export function StaysMapScreen({ showBack = false }: { showBack?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();
  const trips = useQuery(listUserTripsRef, { travelerSlug: traveler?.slug ?? '' });
  const selectedTripId = trips?.[0]?._id;
  const trip = useQuery(getTripDashboardRef, {
    travelerSlug: traveler?.slug ?? '',
    tripId: selectedTripId,
  });
  const dbStays = useQuery(listAllStaysRef);
  const currentLocation = useCurrentLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveryMode, setDiscoveryMode] = useState<'route' | 'nearby'>('route');
  const [sortMode, setSortMode] = useState<'best' | 'price'>('best');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const rankedStays = useMemo(
    () =>
      rankStayProperties({
        stays: (dbStays || []) as any,
        trip,
        currentCoordinate: currentLocation.coordinate,
    }),
    [dbStays, currentLocation.coordinate, trip]
  );
  const filteredStays = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const base = query
      ? rankedStays.filter((stay) =>
          [stay.name, stay.town, stay.region, stay.locationLabel].some((value) =>
            value.toLowerCase().includes(query)
          )
        )
      : rankedStays;

    const ordered = [...base].sort((a, b) => {
      if (sortMode === 'price') {
        return a.pricePerNight - b.pricePerNight;
      }

      if (discoveryMode === 'nearby') {
        const aDistance = a.distanceFromCurrentKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceFromCurrentKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      }

      return a.distanceFromRouteKm - b.distanceFromRouteKm;
    });

    return ordered;
  }, [discoveryMode, rankedStays, searchQuery, sortMode]);

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
    const stayMarkers = mapStays.map((stay: any) => ({
      id: stay.id || stay._id,
      coordinate: stay.coordinate,
      label: stay.name,
      priceLabel: stay.priceLabel || `$${stay.pricePerNight}`,
      tone: (stay.id || stay._id) === featuredStayKey ? ('accent' as const) : ('dark' as const),
      status: (stay.id || stay._id) === featuredStayKey ? ('active' as const) : ('upcoming' as const),
    }));

    // Pass all trip items to ensure the route is always complete
    const tripMarkers = trip?.items ? buildTripMapMarkers(trip.items, 50) : [];

    return [...tripMarkers, ...stayMarkers];
  }, [featuredStayKey, mapStays, trip?.items]);

  const cardWidth = Math.min(windowWidth - 72, 316);
  const cardGap = 10;
  const snapInterval = cardWidth + cardGap;
  const railPadding = Math.max(16, (windowWidth - cardWidth) / 2);
  const snapOffsets = useMemo(
    () => filteredStays.map((_, index) => index * snapInterval),
    [filteredStays, snapInterval]
  );

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

  const centerCoordinate =
    featuredStay?.coordinate ??
    (discoveryMode === 'nearby' && currentLocation.coordinate
      ? currentLocation.coordinate
      : trip?.centerCoordinate) ??
    mapMarkers[0]?.coordinate ??
    null;

  return (
    <ThemedView style={styles.root}>
      <MapPreview
        centerCoordinate={centerCoordinate}
        userCoordinate={currentLocation.coordinate}
        markers={mapMarkers}
        showRoutes={true}
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
            sortMode={sortMode}
            onChangeDiscoveryMode={(mode) => {
              setDiscoveryMode(mode);
              resetToStart();
            }}
            onChangeSearchQuery={(value) => {
              setSearchQuery(value);
              resetToStart();
            }}
            onResetMap={() => {
              scrollX.setValue(0);
            }}
            onTogglePriceSort={() => {
              setSortMode((current) => (current === 'price' ? 'best' : 'price'));
              resetToStart();
            }}
          />
        }
        bottomContentHeight={132}
        bottomContentVisible
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#efefec',
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
});
