import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Link } from 'expo-router';
import React, { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassButton } from '@/components/ui/glass-button';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import { appContent } from '@/constants/app-content';
import { designSystem } from '@/constants/design-system';
import { exploreHomeContent } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MagnifyingGlass } from 'phosphor-react-native';

export default function ExploreScreen() {
  const screen = appContent.exploreHome;
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['34%', '64%', '100%'], []);
  const mapTopInset = insets.top;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const animatedIndex = useSharedValue(0);

  const handleMapInteract = () => {
    sheetRef.current?.snapToIndex(0);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingTop: interpolate(animatedIndex.value, [1, 2], [0, insets.top], 'clamp'),
    };
  });

  return (
    <ThemedView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.mapLayer}>
          <ExploreMapHero
            centerCoordinate={exploreHomeContent.hero.centerCoordinate}
            locationLabel={exploreHomeContent.hero.locationLabel}
            markers={exploreHomeContent.hero.markers}
            topInset={mapTopInset}
            onInteract={handleMapInteract}
          />
        </View>

        <GlassBottomSheet
          index={0}
          ref={sheetRef}
          snapPoints={snapPoints}
          animatedIndex={animatedIndex}>
          <BottomSheetScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.sectionHeader, headerAnimatedStyle]}>
              <View style={styles.sectionCopy}>
                <ThemedText 
                  style={styles.locationEyebrow}
                  lightColor={designSystem.colors.darkGreen}
                  darkColor={designSystem.colors.lime}
                >
                  {exploreHomeContent.hero.locationLabel}
                </ThemedText>
                <ThemedText style={styles.sectionTitle}>{exploreHomeContent.section.title}</ThemedText>
              </View>
              <Link href="/explore/search" asChild>
                <GlassButton width={46} height={46}>
                  <MagnifyingGlass color={isDark ? '#fff' : designSystem.colors.warmDark} size={18} weight="bold" />
                </GlassButton>
              </Link>
            </Animated.View>

            <View style={styles.cardList}>
              {exploreHomeContent.activities.map((activity) => (
                <Link href="/explore/stories" asChild key={activity.title}>
                  <Pressable>
                    <ExploreActivityCard card={activity} />
                  </Pressable>
                </Link>
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
  sheetBackground: {
    borderTopLeftRadius: designSystem.radii.sheet,
    borderTopRightRadius: designSystem.radii.sheet,
    overflow: 'hidden',
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