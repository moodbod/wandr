import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassInput } from '@/components/ui/glass-input';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.shell}>
      <GlassInput
        containerStyle={styles.searchShell}
        onChangeText={onSearchQueryChange}
        placeholder={searchPlaceholder}
        style={styles.searchInput}
        value={searchQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {regions.map((option) => (
          <FilterChip
            key={option.key}
            active={option.key === activeRegion}
            isDark={isDark}
            label={option.label}
            onPress={() => onRegionChange(option.key)}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {intents.map((option) => (
          <FilterChip
            key={option.key}
            active={option.key === activeIntent}
            isDark={isDark}
            label={option.label}
            onPress={() => onIntentChange(option.key)}
          />
        ))}
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
  shell: {
    gap: 12,
  },
  searchShell: {
    minHeight: 48,
  },
  searchInput: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
  },
  row: {
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
    fontSize: 13,
    lineHeight: 14,
    fontWeight: '700',
  },
});
