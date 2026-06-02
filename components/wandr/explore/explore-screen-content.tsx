import { Link, useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Sheet, SheetScrollView, SheetRef } from '@/components/ui/sheet';
import { GlassButton } from '@/components/ui/glass-button';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import { ExploreActivityCardList } from '@/components/wandr/explore/activity-card-list';
import { ExploreGroupTripCard } from '@/components/wandr/explore/group-trip-card';
import { styles } from '@/components/wandr/explore/explore-screen.styles';
import { TripFilterTabs } from '@/components/wandr/trip/trip-filter-tabs';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent } from '@/constants/explore-content';
import { useResponsive } from '@/hooks/use-responsive';
import {
  ExploreDiscoveryItem,
  getPlanningLocationCopy,
  toHiddenGemDiscoveryItem,
} from '@/lib/explore-screen-model';
import { GlassView } from '@/lib/glass-effect';
import type { ExploreJoinableTripCard, ExplorePageContent } from '@/types/explore';
import type { TripListItem } from '@/types/trip';
import { MagnifyingGlass, Plus } from 'phosphor-react-native';
export const ExploreContent = memo(function ExploreContent({
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
  discoveryHiddenGems?: ExplorePageContent['search']['gems']['items'];
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
  const ScrollComponent = isLargeScreen ? ScrollView : SheetScrollView;

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
            selectFirstByDefault={false}
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

export const ExploreLoadedSheet = memo(function ExploreLoadedSheet({
  animatedIndex,
  bottomInset = 0,
  headerAnimatedStyle,
  isOpen = true,
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
  bottomInset?: number;
  headerAnimatedStyle?: object;
  isOpen?: boolean;
  isCardLoading: boolean;
  isDark: boolean;
  locationActivities: ExplorePageContent['home']['activities'];
  locationHiddenGems: ExplorePageContent['search']['gems']['items'];
  locationJoinableTripCards: readonly ExploreJoinableTripCard[];
  locationLabel: string;
  locationTrips: readonly TripListItem[];
  planningCopy: ReturnType<typeof getPlanningLocationCopy>;
  selectedTripId?: string;
  sheetRef?: React.RefObject<SheetRef | null>;
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
    <Sheet
      animatedIndex={animatedIndex}
      backgroundInteraction="enabled"
      bottomInset={bottomInset}
      enablePanDownToClose={false}
      index={isOpen ? 0 : -1}
      isOpen={isOpen}
      presentation="inline"
      ref={sheetRef}
      showDragIndicator={false}
      snapPoints={snapPoints ?? [390, '78%']}
      style={[styles.mobileSheetPanel, Platform.OS !== 'ios' ? styles.mobileSheetPanelFallback : null]}>
      {Platform.OS === 'ios' ? (
        <GlassView glassEffectStyle="regular" style={[StyleSheet.absoluteFill, styles.mobileSheetGlass]} />
      ) : null}
      <View
        pointerEvents="box-none"
        style={[
          styles.mobileStickySearchButton,
          Platform.OS === 'ios' ? styles.nativeMobileStickySearchButton : null,
        ]}>
        <Link href="/explore/search" asChild>
          <GlassButton accessibilityLabel="Search experiences" width={48} height={48}>
            <MagnifyingGlass color={isDark ? designSystem.colors.white : designSystem.colors.warmDark} size={20} weight="bold" />
          </GlassButton>
        </Link>
      </View>
      <SheetScrollView
        contentContainerStyle={[
          styles.mobileSheetContent,
          Platform.OS === 'ios' ? styles.nativeMobileSheetContent : null,
        ]}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.mobileSectionHeader,
            Platform.OS === 'ios' ? styles.nativeMobileSectionHeader : null,
            headerAnimatedStyle,
          ]}>
          <View style={styles.sectionCopy}>
            <ThemedText
              darkColor={designSystem.colors.darkText}
              lightColor={designSystem.colors.ink}
              style={[
                styles.mobileSectionTitle,
                Platform.OS === 'ios' ? styles.nativeMobileSectionTitle : null,
              ]}
            >
              {Platform.OS === 'ios' ? locationLabel : planningCopy.exploreTitle}
            </ThemedText>
            <ThemedText
              style={[
                styles.mobileSectionSubtitle,
                Platform.OS === 'ios' ? styles.nativeMobileSectionSubtitle : null,
                { color: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText },
              ]}
            >
              {Platform.OS === 'ios' ? 'Places, groups, and trips nearby.' : 'Nearby plans, open groups, and places worth saving.'}
            </ThemedText>
          </View>
        </Animated.View>

        <View style={styles.mobileTripFilterRail}>
          {locationTrips.length > 0 ? (
            <TripFilterTabs
              trips={locationTrips}
              selectedTripId={selectedTripId}
              selectFirstByDefault={false}
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
                Platform.OS === 'ios' ? styles.mobileEmptyLocationCard : null,
                { borderColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft },
              ]}
            >
              <ThemedText style={[styles.emptyLocationTitle, Platform.OS === 'ios' ? styles.mobileEmptyLocationTitle : null]}>
                No picks yet
              </ThemedText>
              <ThemedText
                style={[
                  styles.emptyLocationText,
                  Platform.OS === 'ios' ? styles.mobileEmptyLocationText : null,
                  { color: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText },
                ]}
              >
                New stays and experiences will appear here when they are added.
              </ThemedText>
            </View>
          ) : null}
        </View>
      </SheetScrollView>
    </Sheet>
  );
});
