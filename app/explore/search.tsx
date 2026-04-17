import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExploreFeatureDetailCard } from '@/components/wandr/explore/feature-detail-card';
import { ExploreFeatureHeroCard } from '@/components/wandr/explore/feature-hero-card';
import { ExploreHiddenGemCard } from '@/components/wandr/explore/hidden-gem-card';
import { ExploreLiveMapPanel } from '@/components/wandr/explore/live-map-panel';
import { ExploreSearchBar } from '@/components/wandr/explore/search-bar';
import { ExploreSectionHeading } from '@/components/wandr/explore/section-heading';
import { WandrHeader } from '@/components/wandr/header';
import { appContent } from '@/constants/app-content';
import { designSystem } from '@/constants/design-system';
import { exploreSearchContent } from '@/constants/explore-content';

export default function ExploreSearchScreen() {
  const screen = appContent.exploreSearch;

  return (
    <ThemedView style={styles.root}>
      <WandrHeader config={screen.header} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <ThemedText style={styles.title}>{exploreSearchContent.intro.title}</ThemedText>
          <ThemedText style={styles.description}>{exploreSearchContent.intro.description}</ThemedText>
          <View style={styles.tagRow}>
            {exploreSearchContent.intro.tags.map((tag, index) => (
              <View
                key={tag}
                style={[styles.tag, index === 1 ? styles.activeTag : undefined]}>
                <ThemedText style={[styles.tagLabel, index === 1 ? styles.activeTagLabel : undefined]}>
                  {tag}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <ExploreSearchBar placeholder={exploreSearchContent.intro.searchPlaceholder} />

        <View style={styles.featureGrid}>
          <ExploreFeatureHeroCard card={exploreSearchContent.featured.hero} />
          <ExploreFeatureDetailCard card={exploreSearchContent.featured.detail} />
        </View>

        <View style={styles.section}>
          <ExploreSectionHeading
            title={exploreSearchContent.hiddenGems.title}
            actionLabel={exploreSearchContent.hiddenGems.ctaLabel}
          />
          <View style={styles.gemGrid}>
            {exploreSearchContent.hiddenGems.items.map((item) => (
              <ExploreHiddenGemCard card={item} key={item.title} />
            ))}
          </View>
        </View>

        <ExploreLiveMapPanel
          centerCoordinate={exploreSearchContent.map.centerCoordinate}
          ctaLabel={exploreSearchContent.map.ctaLabel}
          description={exploreSearchContent.map.description}
          markers={exploreSearchContent.map.markers}
          title={exploreSearchContent.map.title}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: designSystem.spacing.lg,
    paddingBottom: designSystem.spacing.xxxl,
    gap: 24,
  },
  hero: {
    gap: 14,
  },
  title: {
    fontSize: 64,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: -2.4,
    textTransform: 'uppercase',
  },
  description: {
    maxWidth: 360,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#f4f4f1',
    borderWidth: 1,
    borderColor: designSystem.colors.border,
  },
  activeTag: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  tagLabel: {
    fontSize: 13,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  activeTagLabel: {
    color: designSystem.colors.darkGreen,
  },
  featureGrid: {
    gap: 16,
  },
  section: {
    gap: 18,
  },
  gemGrid: {
    gap: 16,
  },
});
