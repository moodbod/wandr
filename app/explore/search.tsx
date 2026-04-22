import { useQuery } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import { ExploreActivityCardSkeleton, ExploreHiddenGemCardSkeleton } from '@/components/wandr/explore/card-skeletons';
import { DiscoveryFilters } from '@/components/wandr/explore/discovery-filters';
import { ExploreHiddenGemCard } from '@/components/wandr/explore/hidden-gem-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent, ExploreHiddenGem } from '@/constants/explore-content';
import { getHiddenGemSlug } from '@/constants/hidden-gems-content';
import { useCurrentRegionCenter } from '@/hooks/use-current-region-center';
import { getExplorePageContentRef } from '@/lib/convex';
import { currentDemoTravelerSlug } from '@/lib/demo-session';
import {
    buildRegionOptions,
    matchesExperienceFilters,
    matchesHiddenGemFilters,
    matchesIntent,
    type DiscoveryOption,
} from '@/lib/explore-filters';

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
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: currentDemoTravelerSlug });
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

  useEffect(() => {
    if (regionOptions.length === 0) {
      return;
    }

    const hasActiveRegion = regionOptions.some((option) => option.key === activeRegion);

    if (!activeRegion || !hasActiveRegion) {
      setActiveRegion(regionOptions[0].key);
    }
  }, [activeRegion, regionOptions]);

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

  const activeIntentOptions = intentOptions.filter(
    (option) =>
      option.key === 'all' ||
      searchMatchedExperiences.some((e) => matchesIntent(e.category, e.travelerMomentum?.visitorCount, option.key))
  );

  const filteredExperiences = page.experiences.filter((experience) =>
    matchesExperienceFilters(experience, activeRegion, activeIntent, searchQuery)
  );
  const filteredHiddenGems = page.search.hiddenGems.items.filter((item) =>
    matchesHiddenGemFilters(item, activeRegion, searchQuery)
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

  return (
    <ExploreSearchScreenView
      activeIntent={activeIntent}
      activeIntentOptions={activeIntentOptions}
      activeRegion={activeRegion}
      filteredHiddenGems={filteredHiddenGems}
      insetsTop={insets.top}
      isLoading={false}
      notice={null}
      onIntentChange={setActiveIntent}
      onRegionChange={setActiveRegion}
      onSearchQueryChange={setSearchQuery}
      page={page}
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
    fontWeight: '700',
    letterSpacing: -1.4,
    textTransform: 'uppercase',
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
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  cardStack: {
    gap: 16,
  },
  noticeCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(159, 232, 112, 0.18)',
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
});
