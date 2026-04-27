import { NavigationArrow } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type DiscoveryMode = 'route' | 'nearby';
type SortMode = 'best' | 'price';

type StaysDiscoveryControlsProps = {
  discoveryMode: DiscoveryMode;
  searchQuery: string;
  sortMode: SortMode;
  onChangeDiscoveryMode: (mode: DiscoveryMode) => void;
  onChangeSearchQuery: (value: string) => void;
  onResetMap: () => void;
  onTogglePriceSort: () => void;
};

export function StaysDiscoveryControls({
  discoveryMode,
  searchQuery,
  sortMode,
  onChangeDiscoveryMode,
  onChangeSearchQuery,
  onResetMap,
  onTogglePriceSort,
}: StaysDiscoveryControlsProps) {
  const isDark = useColorScheme() === 'dark';
  const iconColor = isDark ? designSystem.colors.darkText : designSystem.colors.ink;

  return (
    <View style={styles.discoveryBar}>
      <View style={styles.searchRow}>
        <GlassInput
          containerStyle={styles.searchGlass}
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          placeholder="Search stays or towns"
          style={styles.searchInput}
          intensity={70}
        />
        <GlassButton
          accessibilityLabel="Reset map position"
          height={52}
          onPress={onResetMap}
          style={styles.resetButton}
          width={52}
          radius={designSystem.radii.pill}
        >
          <NavigationArrow color={iconColor} size={20} weight="bold" />
        </GlassButton>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <FilterChip
          active={discoveryMode === 'route'}
          isDark={isDark}
          label="Near route"
          onPress={() => onChangeDiscoveryMode('route')}
        />
        <FilterChip
          active={discoveryMode === 'nearby'}
          isDark={isDark}
          label="Near me"
          onPress={() => onChangeDiscoveryMode('nearby')}
        />
        <FilterChip
          active={sortMode === 'price'}
          isDark={isDark}
          label="Lowest price"
          onPress={onTogglePriceSort}
        />
      </ScrollView>
    </View>
  );
}

function FilterChip({
  active,
  isDark,
  label,
  onPress,
}: {
  active: boolean;
  isDark: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <ThemedView
        lightColor={active ? designSystem.colors.lime : designSystem.colors.surface}
        darkColor={active ? designSystem.colors.lime : designSystem.colors.darkSurface}
        style={[
          styles.chip,
          { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
        ]}
      >
        <ThemedText
          style={styles.chipLabel}
          lightColor={active ? designSystem.colors.darkGreen : designSystem.colors.ink}
          darkColor={active ? designSystem.colors.darkGreen : designSystem.colors.darkText}
        >
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  discoveryBar: {
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchGlass: {
    minHeight: 52,
    flex: 1,
  },
  searchInput: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
  },
  resetButton: {
    flexShrink: 0,
  },
  filterRow: {
    gap: 10,
    paddingRight: 4,
  },
  pressable: {
    borderRadius: designSystem.radii.pill,
  },
  chip: {
    minHeight: 42,
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
});
