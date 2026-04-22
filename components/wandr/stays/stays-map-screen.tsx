import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { WandrHeader } from '@/components/wandr/header';
import { StaysDiscoveryControls } from '@/components/wandr/stays/stays-discovery-controls';
import { StaysRailCard } from '@/components/wandr/stays/stays-rail-card';
import { designSystem } from '@/constants/design-system';
import { rankStayProperties } from '@/constants/stays-content';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { currentDemoTravelerSlug } from '@/lib/demo-session';
import { getTripDashboardRef, listUserTripsRef } from '@/lib/convex';

export function StaysMapScreen({ showBack = false }: { showBack?: boolean }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';
  const trips = useQuery(listUserTripsRef, { travelerSlug: currentDemoTravelerSlug });
  const selectedTripId = trips?.[0]?._id;
  const trip = useQuery(getTripDashboardRef, {
    travelerSlug: currentDemoTravelerSlug,
    tripId: selectedTripId,
  });
  const currentLocation = useCurrentLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveryMode, setDiscoveryMode] = useState<'route' | 'nearby'>('route');
  const [sortMode, setSortMode] = useState<'best' | 'price'>('best');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const rankedStays = useMemo(
    () =>
      rankStayProperties({
        trip,
        currentCoordinate: currentLocation.coordinate,
    }),
    [currentLocation.coordinate, trip]
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
  const cardWidth = Math.min(windowWidth - 44, 318);
  const cardGap = 12;
  const snapInterval = cardWidth + cardGap;
  const railPadding = Math.max(16, (windowWidth - cardWidth) / 2);

  const scrollToCard = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * snapInterval,
      animated: true,
    });
  };

  const handleSnap = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    if (nextIndex >= 0 && nextIndex < filteredStays.length) {
      setSelectedIndex(nextIndex);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <MapPreview
        centerCoordinate={featuredStay?.coordinate ?? trip?.centerCoordinate ?? ([17.0832, -22.5609] as const)}
        userCoordinate={currentLocation.coordinate}
        markers={[]}
        zoomLevel={6}
      />

      <WandrHeader
        config={{
          overlay: true,
          leadingAction: showBack ? { kind: 'back', accessibilityLabel: 'Go back' } : undefined,
        }}
      />

      <View pointerEvents="box-none" style={[styles.discoveryBar, { top: insets.top + 54 }]}>
        <StaysDiscoveryControls
          discoveryMode={discoveryMode}
          isDark={isDark}
          searchQuery={searchQuery}
          sortMode={sortMode}
          onChangeDiscoveryMode={(mode) => {
            setDiscoveryMode(mode);
            setSelectedIndex(0);
          }}
          onChangeSearchQuery={(value) => {
            setSearchQuery(value);
            setSelectedIndex(0);
          }}
          onTogglePriceSort={() => {
            setSortMode((current) => (current === 'price' ? 'best' : 'price'));
            setSelectedIndex(0);
          }}
        />
      </View>

      <View style={styles.railHeader}>
        <ThemedText style={styles.railEyebrow}>
          {discoveryMode === 'nearby' ? 'Nearby stays' : 'On your route'}
        </ThemedText>
      </View>

      <View pointerEvents="box-none" style={styles.carouselWrap}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
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
                key={stay.id}
                style={[styles.cardShell, { width: cardWidth }]}
                onPress={() => {
                  setSelectedIndex(index);
                  scrollToCard(index);
                }}
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
                      priceLabel={stay.priceLabel}
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
  discoveryBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
  railHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 260,
    pointerEvents: 'none',
  },
  railEyebrow: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    color: '#ffffff',
  },
  carouselWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    height: 188,
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    gap: 12,
    alignItems: 'flex-end',
  },
  cardShell: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardMotion: {
    width: '100%',
  },
  cardInner: {
    width: '100%',
  },
});
