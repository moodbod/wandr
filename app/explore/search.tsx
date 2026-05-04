import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import { ExploreActivityCardSkeleton, ExploreHiddenGemCardSkeleton } from '@/components/wandr/explore/card-skeletons';
import { DiscoveryFilters } from '@/components/wandr/explore/discovery-filters';
import { ExploreGroupTripCard } from '@/components/wandr/explore/group-trip-card';
import { ExploreHiddenGemCard } from '@/components/wandr/explore/hidden-gem-card';
import { WandrHeader } from '@/components/wandr/header';
import {
  coordinateIsInPlanningLocation,
  destinationMatchesPlanningLocation,
} from '@/constants/planning-countries';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent, ExploreHiddenGem } from '@/constants/explore-content';
import { getHiddenGemSlug } from '@/constants/hidden-gems-content';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { usePlanningLocation, useSyncPlanningLocationWithCurrentLocation } from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
import { getExploreJoinableTripCardsRef, getExplorePageContentRef } from '@/lib/convex';
import {
    buildRegionOptions,
    matchesExperienceFilters,
    matchesHiddenGemFilters,
    matchesIntent,
    type DiscoveryOption,
} from '@/lib/explore-filters';
import type { ExploreJoinableTripCard } from '@/types/explore';

const intentOptions: readonly DiscoveryOption[] = [
  { key: 'all', label: 'Everything' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'food', label: 'Food & Drink' },
  { key: 'popular', label: 'Popular with Travelers' },
];

export default function ExploreSearchScreen() {
  return <ConnectedExploreSearchScreen />;
}

function ConnectedExploreSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const traveler = useCurrentTraveler();
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });
  const joinableTripCards = useQuery(
    getExploreJoinableTripCardsRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : 'skip'
  );
  const { coordinate: currentLocation } = useCurrentLocation();
  const { planningLocation } = usePlanningLocation();
  const [activeRegion, setActiveRegion] = useState<string>('');
  const [activeIntent, setActiveIntent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  useSyncPlanningLocationWithCurrentLocation(currentLocation);

  useEffect(() => {
    if (isLargeScreen) {
      router.replace('/(tabs)/explore');
    }
  }, [isLargeScreen, router]);

  const locationExperiences = useMemo(
    () =>
      page?.experiences.filter((experience) =>
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
            experience.description,
          ],
        })
      ) ?? [],
    [page, planningLocation]
  );

  const locationHiddenGems = useMemo(
    () =>
      page?.search.hiddenGems.items.filter((item) =>
        destinationMatchesPlanningLocation({
          countryCode: item.countryCode,
          countryLabel: item.countryLabel,
          location: planningLocation,
          planningLocationId: item.planningLocationId,
          labels: [item.title, item.description, item.geography?.region, item.geography?.town],
        })
      ) ?? [],
    [page, planningLocation]
  );

  const searchMatchedExperiences = useMemo(
    () =>
      locationExperiences.filter((e) => matchesExperienceFilters(e, 'all', 'all', searchQuery)),
    [locationExperiences, searchQuery]
  );

  const searchMatchedGems = useMemo(
    () =>
      locationHiddenGems.filter((item) => matchesHiddenGemFilters(item, 'all', searchQuery)),
    [locationHiddenGems, searchQuery]
  );

  const regionOptions = useMemo(
    () =>
      page
        ? buildRegionOptions(
            searchMatchedExperiences,
            searchMatchedGems,
            coordinateIsInPlanningLocation(currentLocation, planningLocation)
              ? currentLocation ?? undefined
              : planningLocation.centerCoordinate ?? page.home.hero.centerCoordinate
          )
        : [],
    [currentLocation, page, planningLocation, searchMatchedExperiences, searchMatchedGems]
  );

  const regionMatchedExperiences = useMemo(
    () =>
      locationExperiences.filter((experience) =>
        matchesExperienceFilters(experience, activeRegion || 'all', 'all', searchQuery)
      ),
    [activeRegion, locationExperiences, searchQuery]
  );

  const activeIntentOptions = useMemo(
    () =>
      intentOptions.filter(
        (option) =>
          option.key === 'all' ||
          regionMatchedExperiences.some((e) => matchesIntent(e.category, e.travelerMomentum?.visitorCount, option.key))
      ),
    [regionMatchedExperiences]
  );

  useEffect(() => {
    if (regionOptions.length === 0) {
      return;
    }

    const hasActiveRegion = regionOptions.some((option) => option.key === activeRegion);

    if (!activeRegion || !hasActiveRegion) {
      setActiveRegion(regionOptions[0].key);
    }
  }, [activeRegion, regionOptions]);

  useEffect(() => {
    if (activeIntentOptions.some((option) => option.key === activeIntent)) {
      return;
    }

    setActiveIntent('all');
  }, [activeIntent, activeIntentOptions]);

  const resolvedActiveRegion = activeRegion || 'all';
  const filteredExperiences = locationExperiences.filter((experience) =>
    matchesExperienceFilters(experience, resolvedActiveRegion, activeIntent, searchQuery)
  );
  const filteredHiddenGems = locationHiddenGems.filter((item) =>
    matchesHiddenGemFilters(item, resolvedActiveRegion, searchQuery)
  );
  const previewCards = filteredExperiences.map<ExploreActivityCardContent>((experience) => ({
    badge: experience.badge,
    badgeTone: experience.badgeTone,
    ctaLabel: experience.ctaLabel,
    experienceSlug: experience.slug,
    imageUri: experience.imageUri,
    price: experience.price,
    priceSuffix: experience.priceSuffix,
    subtitle: experience.locationLabel ?? experience.subtitle,
    title: experience.title,
  }));
  const locationExperienceBySlug = new Map(locationExperiences.map((experience) => [experience.slug, experience]));
  const filteredJoinableTripCards = (joinableTripCards ?? []).filter((card) => {
    const experience = locationExperienceBySlug.get(card.experienceSlug);
    const matchesLocation =
      Boolean(experience) ||
      destinationMatchesPlanningLocation({
        countryCode: card.countryCode,
        countryLabel: card.countryLabel,
        location: planningLocation,
        planningLocationId: card.planningLocationId,
        labels: [card.locationLabel, card.destinationLabel, card.experienceTitle],
      });

    if (!matchesLocation) {
      return false;
    }

    return experience
      ? matchesExperienceFilters(experience, 'all', 'all', searchQuery)
      : [card.experienceTitle, card.locationLabel, card.destinationLabel, card.groupName].some((value) =>
          value.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );
  });
  const isLoading = !page;
  const hasResults = isLoading || previewCards.length > 0 || filteredJoinableTripCards.length > 0 || filteredHiddenGems.length > 0;

  return (
    <ExploreSearchScreenView
      activeIntent={activeIntent}
      activeIntentOptions={activeIntentOptions}
      activeRegion={resolvedActiveRegion}
      filteredHiddenGems={filteredHiddenGems}
      insetsTop={insets.top}
      isLoading={isLoading}
      notice={null}
      onIntentChange={setActiveIntent}
      onRegionChange={setActiveRegion}
      onSearchQueryChange={setSearchQuery}
      page={page}
      filteredJoinableTripCards={filteredJoinableTripCards}
      hasResults={hasResults}
      previewCards={previewCards}
      regionOptions={regionOptions}
      searchQuery={searchQuery}
    />
  );
}

function ExploreSearchScreenView({
  activeIntent,
  activeIntentOptions,
  activeRegion,
  filteredHiddenGems,
  insetsTop,
  isLoading,
  notice,
  onIntentChange,
  onRegionChange,
  onSearchQueryChange,
  page,
  filteredJoinableTripCards,
  hasResults,
  previewCards,
  regionOptions,
  searchQuery,
}: {
  activeIntent: string;
  activeIntentOptions: readonly DiscoveryOption[];
  activeRegion: string;
  filteredHiddenGems: readonly ExploreHiddenGem[];
  insetsTop: number;
  isLoading: boolean;
  notice: string | null;
  onIntentChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  page: any | null | undefined;
  filteredJoinableTripCards: ExploreJoinableTripCard[];
  hasResults: boolean;
  previewCards: readonly ExploreActivityCardContent[];
  regionOptions: readonly DiscoveryOption[];
  searchQuery: string;
}) {
  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insetsTop + 72, paddingBottom: designSystem.spacing.xxxl * 2 },
        ]}
      >
        <DiscoveryFilters
          regions={regionOptions}
          intents={activeIntentOptions}
          activeRegion={activeRegion}
          activeIntent={activeIntent}
          searchQuery={searchQuery}
          onIntentChange={onIntentChange}
          onRegionChange={onRegionChange}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder={page?.search.intro.searchPlaceholder ?? 'Search by place, activity, or mood'}
        />

        {(isLoading || previewCards.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <ThemedText style={styles.sectionTitle}>Start with these</ThemedText>
            </View>
            <View style={styles.cardStack}>
              {isLoading
                ? Array.from({ length: 2 }).map((_, index) => <ExploreActivityCardSkeleton key={`search-activity-skeleton-${index}`} />)
                : previewCards.map((card) => (
                    <ExploreActivityCard
                      key={card.experienceSlug}
                      card={card}
                      href={{ pathname: '/explore/[slug]', params: { slug: card.experienceSlug } }}
                    />
                  ))}
            </View>
          </View>
        )}

        {filteredJoinableTripCards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <ThemedText style={styles.sectionTitle}>Open groups to join</ThemedText>
            </View>
            <View style={styles.cardStack}>
              {filteredJoinableTripCards.map((card) => (
                <ExploreGroupTripCard
                  key={card.circleId}
                  card={card}
                  href={{ pathname: '/explore/group/[circleId]', params: { circleId: card.circleId } }}
                />
              ))}
            </View>
          </View>
        )}

        {(isLoading || filteredHiddenGems.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <ThemedText style={styles.sectionTitle}>Local detours worth keeping</ThemedText>
            </View>
            <View style={styles.cardStack}>
              {isLoading
                ? Array.from({ length: 2 }).map((_, index) => <ExploreHiddenGemCardSkeleton key={`search-gem-skeleton-${index}`} />)
                : filteredHiddenGems.map((item) => (
                    <ExploreHiddenGemCard
                      key={item.title}
                      card={item}
                      href={{ pathname: '/explore/hidden-gems/[slug]', params: { slug: getHiddenGemSlug(item.title) } }}
                    />
                  ))}
            </View>
          </View>
        )}

        {!hasResults && (
          <ThemedView
            lightColor={designSystem.colors.surface}
            darkColor={designSystem.colors.darkSurface}
            style={styles.emptyCard}
          >
            <ThemedText style={styles.emptyTitle}>No matches yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Try another region, clear the search, or switch back to everything.
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xxl,
  },
  section: {
    gap: 16,
  },
  sectionHeading: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
  },
  cardStack: {
    gap: 16,
  },
  noticeCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: designSystem.colors.limeSoft,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
});
