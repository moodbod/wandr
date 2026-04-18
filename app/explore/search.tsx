import { useQuery } from 'convex/react';
import { MagnifyingGlass } from 'phosphor-react-native';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/ui/input';
import { ExploreFeatureDetailCard } from '@/components/wandr/explore/feature-detail-card';
import { ExploreFeatureHeroCard } from '@/components/wandr/explore/feature-hero-card';
import { ExploreHiddenGemCard } from '@/components/wandr/explore/hidden-gem-card';
import { ExploreLiveMapPanel } from '@/components/wandr/explore/live-map-panel';
import { ExploreSectionHeading } from '@/components/wandr/explore/section-heading';
import { WandrHeader } from '@/components/wandr/header';
import { appContent } from '@/constants/app-content';
import { designSystem } from '@/constants/design-system';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getExplorePageContentRef, hasConvexUrl } from '@/lib/convex';

export default function ExploreSearchScreen() {
  if (!hasConvexUrl) {
    return null;
  }

  return <ConnectedExploreSearchScreen />;
}

function ConnectedExploreSearchScreen() {
  const screen = appContent.exploreSearch;
  const { width } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const page = useQuery(getExplorePageContentRef, { slug: 'default' });

  const cardWidth = width - designSystem.spacing.lg * 2 - 40;
  const iconColor = useThemeColor(
    { light: 'rgba(14,15,12,0.35)', dark: 'rgba(249,249,246,0.35)' },
    'icon'
  );

  const headerHeight = insets.top + 60;

  if (page === undefined) {
    return null;
  }

  if (page === null) {
    return null;
  }

  const content = page.search;

  return (
    <ThemedView style={styles.root}>
      <WandrHeader config={screen.header} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerHeight + designSystem.spacing.lg }]}>
        <View style={styles.paddingX}>
          <Input 
            placeholder={content.intro.searchPlaceholder}
            leftIcon={<MagnifyingGlass color={iconColor} size={22} weight="bold" />}
            autoFocus={false}
          />
        </View>

        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth + 16} // cardWidth + gap
          snapToAlignment="start"
          contentContainerStyle={styles.featureGrid}
        >
          <View style={{ width: cardWidth }}>
            <ExploreFeatureHeroCard card={content.featured.hero} />
          </View>
          <View style={{ width: cardWidth }}>
            <ExploreFeatureDetailCard card={content.featured.detail} />
          </View>
        </ScrollView>

        <View style={[styles.section, styles.paddingX]}>
          <ExploreSectionHeading
            title={content.hiddenGems.title}
            actionLabel={content.hiddenGems.ctaLabel}
          />
          <View style={styles.gemGrid}>
            {content.hiddenGems.items.map((item) => (
              <ExploreHiddenGemCard card={item} key={item.title} />
            ))}
          </View>
        </View>

        <View style={styles.paddingX}>
          <ExploreLiveMapPanel
            centerCoordinate={content.map.centerCoordinate}
            ctaLabel={content.map.ctaLabel}
            description={content.map.description}
            markers={content.map.markers}
            title={content.map.title}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: designSystem.spacing.xxxl,
    gap: 40,
  },
  paddingX: {
    paddingHorizontal: designSystem.spacing.lg,
  },
  featureGrid: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: 16,
  },
  section: {
    gap: 18,
  },
  gemGrid: {
    gap: 16,
  },
});
