import { useQuery } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import { ExploreActivityCardSkeleton, ExploreHiddenGemCardSkeleton } from '@/components/wandr/explore/card-skeletons';
import { DiscoveryFilters } from '@/components/wandr/explore/discovery-filters';
import { ExploreGroupTripCard } from '@/components/wandr/explore/group-trip-card';
import { ExploreHiddenGemCard } from '@/components/wandr/explore/hidden-gem-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent, ExploreHiddenGem } from '@/constants/explore-content';
import { getHiddenGemSlug } from '@/constants/hidden-gems-content';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentRegionCenter } from '@/hooks/use-current-region-center';
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
  const insets = useSafeAreaInsets();
  const traveler = useCurrentTraveler();
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });
  const joinableTripCards = useQuery(
    getExploreJoinableTripCardsRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : 'skip'
  );
  const { coordinate: currentRegionCenter } = useCurrentRegionCenter();
  const [activeRegion, setActiveRegion] = useState<string>('');
  const [activeIntent, setActiveIntent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const searchMatchedExperiences = useMemo(
    () =>
      page?.experiences.filter((e) => matchesExperienceFilters(e, 'all', 'all', searchQuery)) ?? [],
    [page, searchQuery]
  );

  const searchMatchedGems = useMemo(
    () =>
      page?.search.hiddenGems.items.filter((item) => matchesHiddenGemFilters(item, 'all', searchQuery)) ?? [],
    [page, searchQuery]
  );

  const regionOptions = useMemo(
    () =>
      page
        ? buildRegionOptions(
            searchMatchedExperiences,
            searchMatchedGems,
            currentRegionCenter ?? page.home.hero.centerCoordinate
          )
        : [],
    [currentRegionCenter, page, searchMatchedExperiences, searchMatchedGems]
  );

  const regionMatchedExperiences = useMemo(
    () =>
      page?.experiences.filter((experience) =>
        matchesExperienceFilters(experience, activeRegion || 'all', 'all', searchQuery)
      ) ?? [],
    [activeRegion, page, searchQuery]
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

  if (!page) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader config={{ overlay: true, leadingAction: { kind: 'back', accessibilityLabel: 'Go back' } }} />
        <View style={[styles.content, { paddingTop: insets.top + 88, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  const resolvedActiveRegion = activeRegion || 'all';
  const filteredExperiences = page.experiences.filter((experience) =>
    matchesExperienceFilters(experience, resolvedActiveRegion, activeIntent, searchQuery)
  );
  const filteredHiddenGems = page.search.hiddenGems.items.filter((item) =>
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
  const filteredJoinableTripCards = (joinableTripCards ?? []).filter((card) =>
    filteredExperiences.some((experience) => experience.slug === card.experienceSlug)
  );
  const hasResults = previewCards.length > 0 || filteredJoinableTripCards.length > 0 || filteredHiddenGems.length > 0;

  return (
    <ExploreSearchScreenView
      activeIntent={activeIntent}
      activeIntentOptions={activeIntentOptions}
      activeRegion={resolvedActiveRegion}
      filteredHiddenGems={filteredHiddenGems}
      insetsTop={insets.top}
      isLoading={false}
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
  page: any;
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
          { paddingTop: insetsTop + 88, paddingBottom: designSystem.spacing.xxxl * 2 },
        ]}
      >
        <View style={styles.hero}>
          <ThemedText style={styles.title}>Search Discovery</ThemedText>
          <ThemedText style={styles.description}>
            Filter by real region data first, then layer mood and search on top.
          </ThemedText>
        </View>

        <DiscoveryFilters
          regions={regionOptions}
          intents={activeIntentOptions}
          activeRegion={activeRegion}
          activeIntent={activeIntent}
          searchQuery={searchQuery}
          onIntentChange={onIntentChange}
          onRegionChange={onRegionChange}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder={page.search.intro.searchPlaceholder}
        />

        {previewCards.length > 0 && (
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

        {filteredHiddenGems.length > 0 && (
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
  hero: {
    gap: 10,
  },
  title: {
    fontSize: 40,
    lineHeight: 38,
    fontWeight: '600',
  },
  description: {
    maxWidth: '94%',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
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
