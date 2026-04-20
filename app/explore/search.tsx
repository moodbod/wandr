import { useQuery } from 'convex/react';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import { DiscoveryFilters } from '@/components/wandr/explore/discovery-filters';
import { ExploreHiddenGemCard } from '@/components/wandr/explore/hidden-gem-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent } from '@/constants/explore-content';
import { getHiddenGemSlug } from '@/constants/hidden-gems-content';
import { useCurrentRegionCenter } from '@/hooks/use-current-region-center';
import { getExplorePageContentRef, hasConvexUrl } from '@/lib/convex';
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
  if (!hasConvexUrl) {
    return null;
  }

  return <ConnectedExploreSearchScreen />;
}

function ConnectedExploreSearchScreen() {
  const insets = useSafeAreaInsets();
  const page = useQuery(getExplorePageContentRef, { slug: 'default' });
  const { coordinate: currentRegionCenter } = useCurrentRegionCenter();
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [activeIntent, setActiveIntent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (page === undefined || page === null) {
    return null;
  }

  const searchMatchedExperiences = page.experiences.filter((e) =>
    matchesExperienceFilters(e, 'all', 'all', searchQuery)
  );

  const searchMatchedGems = page.search.hiddenGems.items.filter((item) =>
    matchesHiddenGemFilters(item, 'all', searchQuery)
  );

  const regionOptions = buildRegionOptions(
    searchMatchedExperiences,
    searchMatchedGems,
    currentRegionCenter ?? page.home.hero.centerCoordinate
  );

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
  const previewCards = filteredExperiences.slice(0, 2).map<ExploreActivityCardContent>((experience) => ({
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
          { paddingTop: insets.top + 88, paddingBottom: insets.bottom + designSystem.spacing.xxxl },
        ]}
      >
        <View style={styles.hero}>
          <ThemedText style={styles.eyebrow}>Trip Lens</ThemedText>
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
          onRegionChange={setActiveRegion}
          onIntentChange={setActiveIntent}
          onSearchQueryChange={setSearchQuery}
          searchPlaceholder={page.search.intro.searchPlaceholder}
        />

        {previewCards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <ThemedText style={styles.sectionEyebrow}>Best next move</ThemedText>
              <ThemedText style={styles.sectionTitle}>Start with these</ThemedText>
            </View>
            <View style={styles.cardStack}>
              {previewCards.map((card) => (
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
              <ThemedText style={styles.sectionEyebrow}>Quieter picks</ThemedText>
              <ThemedText style={styles.sectionTitle}>Local detours worth keeping</ThemedText>
            </View>
            <View style={styles.cardStack}>
              {filteredHiddenGems.slice(0, 2).map((item) => (
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
  eyebrow: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: designSystem.colors.lime,
  },
  title: {
    fontSize: 40,
    lineHeight: 38,
    fontWeight: '900',
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
  sectionEyebrow: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.lime,
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  cardStack: {
    gap: 16,
  },
});
