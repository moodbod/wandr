import { MagnifyingGlass } from 'phosphor-react-native';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';

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
import { exploreSearchContent } from '@/constants/explore-content';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ExploreSearchScreen() {
  const screen = appContent.exploreSearch;
  const { width } = Dimensions.get('window');
  const cardWidth = width - designSystem.spacing.lg * 2;
  
  const iconColor = useThemeColor(
    { light: 'rgba(14,15,12,0.35)', dark: 'rgba(249,249,246,0.35)' },
    'icon'
  );

  return (
    <ThemedView style={styles.root}>
      <WandrHeader config={screen.header} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.paddingX}>
          <Input 
            placeholder={exploreSearchContent.intro.searchPlaceholder}
            leftIcon={<MagnifyingGlass color={iconColor} size={22} weight="bold" />}
            autoFocus={true}
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
            <ExploreFeatureHeroCard card={exploreSearchContent.featured.hero} />
          </View>
          <View style={{ width: cardWidth }}>
            <ExploreFeatureDetailCard card={exploreSearchContent.featured.detail} />
          </View>
        </ScrollView>

        <View style={[styles.section, styles.paddingX]}>
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

        <View style={styles.paddingX}>
          <ExploreLiveMapPanel
            centerCoordinate={exploreSearchContent.map.centerCoordinate}
            ctaLabel={exploreSearchContent.map.ctaLabel}
            description={exploreSearchContent.map.description}
            markers={exploreSearchContent.map.markers}
            title={exploreSearchContent.map.title}
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
    paddingTop: designSystem.spacing.lg,
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
