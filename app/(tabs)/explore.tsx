import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { Link } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import type { ExploreExperience } from '@/constants/explore-content';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getExplorePageContentRef, hasConvexUrl, seedDefaultPageContentRef } from '@/lib/convex';
import { buildExperienceMapMarkers } from '@/lib/explore-map-markers';
import { MagnifyingGlass } from 'phosphor-react-native';

export default function ExploreScreen() {
  return <ConnectedExploreScreen />;
}

function ConnectedExploreScreen() {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['34%', '64%', '100%'], []);
  const mapTopInset = insets.top;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const page = useQuery(getExplorePageContentRef, { slug: 'default' });
  const seedDefaultPageContent = useMutation(seedDefaultPageContentRef);
  const [mapResetKey, setMapResetKey] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const animatedIndex = useSharedValue(0);

  const handleMapInteract = () => {
    sheetRef.current?.snapToIndex(0);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingTop: interpolate(animatedIndex.value, [1, 2], [0, insets.top], 'clamp'),
    };
  });

  useEffect(() => {
    if (!hasConvexUrl || page !== null || isSeeding) {
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

  if (!hasConvexUrl) {
    return (
      <ThemedView style={styles.emptyRoot}>
        <ThemedView
          lightColor="#ffffff"
          darkColor={designSystem.colors.darkSurface}
          style={[
            styles.emptyCard,
            { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
          ]}>
          <ThemedText style={styles.emptyTitle}>Explore unavailable</ThemedText>
          <ThemedText style={styles.emptyText}>
            Set `EXPO_PUBLIC_CONVEX_URL` so this screen can load Explore content from Convex.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (page === undefined || page === null) {
    const message = seedError
      ? seedError
      : page === undefined
        ? 'Loading nearby experiences from Convex...'
        : isSeeding
          ? 'Preparing the default Explore page in Convex...'
          : 'Waiting for Explore content from Convex...';

    return (
      <ThemedView style={styles.emptyRoot}>
        <ThemedView
          lightColor="#ffffff"
          darkColor={designSystem.colors.darkSurface}
          style={[
            styles.emptyCard,
            { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
          ]}>
          <ThemedText style={styles.emptyTitle}>Loading Explore</ThemedText>
          <ThemedText style={styles.emptyText}>{message}</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  const content = page.home;
  const homeExperiences = content.activities
    .map((activity) => page.experiences.find((experience) => experience.slug === activity.experienceSlug))
    .filter((experience): experience is ExploreExperience => Boolean(experience));
  const homeMarkers = buildExperienceMapMarkers(homeExperiences, 4);

  return (
    <ThemedView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.mapLayer}>
          <ExploreMapHero
            key={mapResetKey}
            centerCoordinate={content.hero.centerCoordinate}
            locationLabel={content.hero.locationLabel}
            markers={homeMarkers}
            topInset={mapTopInset}
            onInteract={handleMapInteract}
            onLocateMe={() => setMapResetKey((current) => current + 1)}
          />
        </View>

        <GlassBottomSheet
          index={0}
          ref={sheetRef}
          snapPoints={snapPoints}
          animatedIndex={animatedIndex}>
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.sectionHeader, headerAnimatedStyle]}>
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
              {content.activities.map((activity, index) => (
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
  emptyRoot: {
    flex: 1,
    paddingHorizontal: designSystem.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
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
});
