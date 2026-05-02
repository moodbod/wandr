import { StyleSheet, View } from 'react-native';

import { GlassInput } from '@/components/ui/glass-input';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { designSystem } from '@/constants/design-system';
import type { DiscoveryOption } from '@/lib/explore-filters';

type DiscoveryFiltersProps = {
  regions: readonly DiscoveryOption[];
  intents: readonly DiscoveryOption[];
  activeRegion: string;
  activeIntent: string;
  searchQuery: string;
  onRegionChange: (key: string) => void;
  onIntentChange: (key: string) => void;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder?: string;
};

export function DiscoveryFilters({
  regions,
  intents,
  activeRegion,
  activeIntent,
  searchQuery,
  onRegionChange,
  onIntentChange,
  onSearchQueryChange,
  searchPlaceholder = 'Search places or experiences',
}: DiscoveryFiltersProps) {
  return (
    <View style={styles.shell}>
      <GlassInput
        autoCapitalize="none"
        autoCorrect={false}
        intensity={70}
        onChangeText={onSearchQueryChange}
        placeholder={searchPlaceholder}
        returnKeyType="search"
        value={searchQuery}
      />

      <SegmentedTabs
        value={activeRegion}
        options={regions}
        onChange={onRegionChange}
        style={styles.fullBleedTabs}
        tabStyle={styles.borderlessTab}
        contentContainerStyle={styles.fullBleedTabContent}
      />

      <SegmentedTabs
        value={activeIntent}
        options={intents}
        onChange={onIntentChange}
        style={styles.fullBleedTabs}
        tabStyle={styles.borderlessTab}
        contentContainerStyle={styles.fullBleedTabContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 12,
  },
  fullBleedTabs: {
    marginHorizontal: -designSystem.spacing.lg,
  },
  fullBleedTabContent: {
    paddingHorizontal: designSystem.spacing.lg,
  },
  borderlessTab: {
    borderWidth: 0,
  },
});
