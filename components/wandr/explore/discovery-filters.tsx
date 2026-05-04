import type React from 'react';
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
  leadingSearchAccessory?: React.ReactNode;
  searchQuery: string;
  trailingSearchAccessory?: React.ReactNode;
  onRegionChange: (key: string) => void;
  onIntentChange: (key: string) => void;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder?: string;
  fullBleed?: boolean;
};

export function DiscoveryFilters({
  regions,
  intents,
  activeRegion,
  activeIntent,
  leadingSearchAccessory,
  searchQuery,
  trailingSearchAccessory,
  onRegionChange,
  onIntentChange,
  onSearchQueryChange,
  searchPlaceholder = 'Search places or experiences',
  fullBleed = true,
}: DiscoveryFiltersProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.searchRow}>
        {leadingSearchAccessory ? <View style={styles.searchAccessory}>{leadingSearchAccessory}</View> : null}
        <GlassInput
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.searchInput}
          intensity={70}
          onChangeText={onSearchQueryChange}
          placeholder={searchPlaceholder}
          returnKeyType="search"
          value={searchQuery}
        />
        {trailingSearchAccessory ? <View style={styles.searchAccessory}>{trailingSearchAccessory}</View> : null}
      </View>

      <SegmentedTabs
        value={activeRegion}
        options={regions}
        onChange={onRegionChange}
        style={fullBleed ? styles.fullBleedTabs : undefined}
        tabStyle={styles.borderlessTab}
        contentContainerStyle={fullBleed ? styles.fullBleedTabContent : undefined}
      />

      <SegmentedTabs
        value={activeIntent}
        options={intents}
        onChange={onIntentChange}
        style={fullBleed ? styles.fullBleedTabs : undefined}
        tabStyle={styles.borderlessTab}
        contentContainerStyle={fullBleed ? styles.fullBleedTabContent : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchAccessory: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
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
