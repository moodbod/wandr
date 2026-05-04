import { GlobeHemisphereWest, NavigationArrow } from 'phosphor-react-native';
import type React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { TripFilterTabs } from '@/components/wandr/trip/trip-filter-tabs';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripListItem } from '@/types/trip';

type DiscoveryMode = 'route' | 'nearby';
type SortMode = 'best' | 'price';

type StaysDiscoveryControlsProps = {
  discoveryMode: DiscoveryMode;
  leadingSearchAccessory?: React.ReactNode;
  showMapButtons?: boolean;
  searchQuery: string;
  selectedTripId?: string;
  sortMode: SortMode;
  trailingSearchAccessory?: React.ReactNode;
  trips?: readonly TripListItem[];
  onChangeDiscoveryMode: (mode: DiscoveryMode) => void;
  onChangeSearchQuery: (value: string) => void;
  onOpenLocationSheet: () => void;
  onResetMap: () => void;
  onSelectTrip?: (tripId: string) => void;
  onTogglePriceSort: () => void;
};

export function StaysDiscoveryControls({
  discoveryMode,
  leadingSearchAccessory,
  showMapButtons = true,
  searchQuery,
  selectedTripId,
  sortMode,
  trips = [],
  trailingSearchAccessory,
  onChangeDiscoveryMode,
  onChangeSearchQuery,
  onOpenLocationSheet,
  onResetMap,
  onSelectTrip,
  onTogglePriceSort,
}: StaysDiscoveryControlsProps) {
  const isDark = useColorScheme() === 'dark';
  const iconColor = isDark ? designSystem.colors.darkText : designSystem.colors.ink;

  return (
    <View style={styles.discoveryBar}>
      <View style={styles.searchRow}>
        {leadingSearchAccessory ? (
          <View style={styles.searchAccessory}>{leadingSearchAccessory}</View>
        ) : showMapButtons ? (
          <GlassButton
            accessibilityLabel="Change planning location"
            height={52}
            onPress={onOpenLocationSheet}
            style={styles.locationButton}
            width={52}
            radius={designSystem.radii.pill}
          >
            <GlobeHemisphereWest color={iconColor} size={20} weight="bold" />
          </GlassButton>
        ) : null}
        <GlassInput
          containerStyle={styles.searchGlass}
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          placeholder="Search stays or towns"
          intensity={70}
        />
        {trailingSearchAccessory ? (
          <View style={styles.searchAccessory}>{trailingSearchAccessory}</View>
        ) : showMapButtons ? (
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
        ) : null}
      </View>

      {onSelectTrip && trips.length > 0 ? (
        <TripFilterTabs trips={trips} selectedTripId={selectedTripId} onSelectTrip={onSelectTrip}>
          <FilterPill active={discoveryMode === 'nearby'} label="Near me" onPress={() => onChangeDiscoveryMode('nearby')} />
          <FilterPill active={sortMode === 'price'} label="Lowest price" onPress={onTogglePriceSort} />
        </TripFilterTabs>
      ) : null}
    </View>
  );
}

function FilterPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Pressable onPress={onPress} style={styles.filterPressable}>
      <ThemedView
        lightColor={active ? designSystem.colors.lime : designSystem.colors.surface}
        darkColor={active ? designSystem.colors.lime : designSystem.colors.darkSurface}
        style={[
          styles.filterPill,
          {
            borderColor: active
              ? designSystem.colors.lime
              : isDark
                ? designSystem.colors.darkBorderSoft
                : designSystem.colors.borderSoft,
          },
        ]}
      >
        <ThemedText
          lightColor={active ? designSystem.colors.darkGreen : designSystem.colors.ink}
          darkColor={active ? designSystem.colors.darkGreen : designSystem.colors.darkText}
          style={styles.filterLabel}
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
    flex: 1,
  },
  searchAccessory: {
    flexShrink: 0,
  },
  locationButton: {
    flexShrink: 0,
  },
  resetButton: {
    flexShrink: 0,
  },
  filterPressable: {
    borderRadius: designSystem.radii.pill,
  },
  filterPill: {
    minHeight: 44,
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterLabel: {
    ...designSystem.type.bodySmallStrong,
  },
});
