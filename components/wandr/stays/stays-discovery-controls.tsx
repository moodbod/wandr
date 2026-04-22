import { Pressable, StyleSheet, View } from 'react-native';

import { GlassInput } from '@/components/ui/glass-input';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type DiscoveryMode = 'route' | 'nearby';
type SortMode = 'best' | 'price';

type StaysDiscoveryControlsProps = {
  discoveryMode: DiscoveryMode;
  isDark: boolean;
  searchQuery: string;
  sortMode: SortMode;
  onChangeDiscoveryMode: (mode: DiscoveryMode) => void;
  onChangeSearchQuery: (value: string) => void;
  onTogglePriceSort: () => void;
};

export function StaysDiscoveryControls({
  discoveryMode,
  isDark,
  searchQuery,
  sortMode,
  onChangeDiscoveryMode,
  onChangeSearchQuery,
  onTogglePriceSort,
}: StaysDiscoveryControlsProps) {
  return (
    <View style={styles.discoveryBar}>
      <GlassInput
        containerStyle={styles.searchGlass}
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
        placeholder="Search stays or towns"
        style={styles.searchInput}
      />

      <View style={styles.filterRow}>
        <Pressable
          style={[
            styles.filterChip,
            discoveryMode === 'route' && styles.filterChipActive,
            isDark && styles.filterChipDark,
          ]}
          onPress={() => onChangeDiscoveryMode('route')}
        >
          <ThemedText
            style={[
              styles.filterChipText,
              discoveryMode === 'route' && styles.filterChipTextActive,
            ]}
          >
            Near route
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            discoveryMode === 'nearby' && styles.filterChipActive,
            isDark && styles.filterChipDark,
          ]}
          onPress={() => onChangeDiscoveryMode('nearby')}
        >
          <ThemedText
            style={[
              styles.filterChipText,
              discoveryMode === 'nearby' && styles.filterChipTextActive,
            ]}
          >
            Near me
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            sortMode === 'price' && styles.filterChipActive,
            isDark && styles.filterChipDark,
          ]}
          onPress={onTogglePriceSort}
        >
          <ThemedText
            style={[
              styles.filterChipText,
              sortMode === 'price' && styles.filterChipTextActive,
            ]}
          >
            Lowest price
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  discoveryBar: {
    gap: 8,
  },
  searchGlass: {
    minHeight: 44,
  },
  searchInput: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipDark: {
    backgroundColor: 'rgba(18,20,17,0.76)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(159,232,112,0.88)',
    borderColor: 'rgba(159,232,112,0.88)',
  },
  filterChipText: {
    fontSize: 12,
    lineHeight: 13,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
  filterChipTextActive: {
    color: designSystem.colors.darkGreen,
  },
});
