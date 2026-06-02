import { CaretDown, GlobeHemisphereWest, MagnifyingGlass, NavigationArrow } from 'phosphor-react-native';
import type React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { CountryFlagAvatar } from '@/components/wandr/country-flag-avatar';
import { TripFilterTabs } from '@/components/wandr/trip/trip-filter-tabs';
import { designSystem } from '@/constants/design-system';
import type { PlanningLocation } from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripListItem } from '@/types/trip';

type DiscoveryMode = 'route' | 'nearby';
type SortMode = 'best' | 'price';

type StaysDiscoveryControlsProps = {
  discoveryMode: DiscoveryMode;
  leadingSearchAccessory?: React.ReactNode;
  planningLocation?: PlanningLocation;
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
  variant?: 'default' | 'desktopMap';
};

export function StaysDiscoveryControls({
  discoveryMode,
  leadingSearchAccessory,
  planningLocation,
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
  variant = 'default',
}: StaysDiscoveryControlsProps) {
  const isDark = useColorScheme() === 'dark';
  const iconColor = isDark ? designSystem.colors.darkText : designSystem.colors.ink;
  const isDesktopMap = variant === 'desktopMap';
  const desktopBorderColor = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft;
  const desktopDockSurfaceColor = isDark ? 'rgba(8, 11, 8, 0.38)' : designSystem.colors.whiteGlassMedium;
  const desktopInactivePillColor = isDark ? 'rgba(255, 255, 255, 0.06)' : designSystem.colors.surface;
  const desktopInactiveTextColor = isDark ? designSystem.colors.darkTextWarm : designSystem.colors.ink;
  const shouldShowFilterRail = !isDesktopMap || Boolean(onSelectTrip && trips.length > 0);
  const proximityFilterPills = (
    <>
      <FilterPill
        active={discoveryMode === 'route'}
        label="Near route"
        inactiveBackgroundColor={desktopInactivePillColor}
        inactiveTextColor={desktopInactiveTextColor}
        variant={variant}
        onPress={() => onChangeDiscoveryMode('route')}
      />
      <FilterPill
        active={discoveryMode === 'nearby'}
        label="Near me"
        inactiveBackgroundColor={desktopInactivePillColor}
        inactiveTextColor={desktopInactiveTextColor}
        variant={variant}
        onPress={() => onChangeDiscoveryMode('nearby')}
      />
      <FilterPill
        active={sortMode === 'price'}
        label="Lowest price"
        inactiveBackgroundColor={desktopInactivePillColor}
        inactiveTextColor={desktopInactiveTextColor}
        variant={variant}
        onPress={onTogglePriceSort}
      />
    </>
  );

  return (
    <View
      style={[
        styles.discoveryBar,
        isDesktopMap && styles.desktopDiscoveryBar,
      ]}
    >
      <View style={[styles.searchRow, isDesktopMap && styles.desktopSearchRow]}>
        {leadingSearchAccessory ? (
          <View style={[styles.searchAccessory, isDesktopMap && styles.desktopLeadingAccessory]}>
            {leadingSearchAccessory}
          </View>
        ) : showMapButtons ? (
          <GlassButton
            accessibilityLabel="Change planning location"
            height={52}
            onPress={onOpenLocationSheet}
            style={styles.locationButton}
            width={66}
            radius={designSystem.radii.pill}
          >
            <View style={styles.locationButtonContent}>
              {planningLocation?.countryCode ? (
                <CountryFlagAvatar countryCode={planningLocation.countryCode} size={28} />
              ) : (
                <GlobeHemisphereWest color={iconColor} size={20} weight="bold" />
              )}
              <CaretDown color={iconColor} size={13} weight="bold" />
            </View>
          </GlassButton>
        ) : null}
        <Input
          containerStyle={[
            styles.searchGlass,
            isDesktopMap && styles.desktopSearchGlass,
            styles.searchContent,
            isDesktopMap && styles.desktopSearchContent,
          ]}
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          leftIcon={
            <MagnifyingGlass
              color={
                isDesktopMap
                  ? isDark
                    ? designSystem.colors.darkTextWarm
                    : designSystem.colors.ink
                  : isDark
                    ? designSystem.colors.darkPlaceholderText
                    : designSystem.colors.placeholderText
              }
              size={18}
              weight="regular"
            />
          }
          placeholder="Search hotels or towns"
          style={isDesktopMap ? [styles.desktopSearchText, { color: desktopInactiveTextColor }] : undefined}
        />
        {trailingSearchAccessory ? (
          <View style={[styles.searchAccessory, isDesktopMap && styles.desktopTrailingAccessory]}>
            {trailingSearchAccessory}
          </View>
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

      {shouldShowFilterRail ? (
        <View
          style={
            isDesktopMap
              ? [
                  styles.desktopFilterDock,
                  {
                    backgroundColor: desktopDockSurfaceColor,
                    borderColor: desktopBorderColor,
                  },
                ]
              : undefined
          }
        >
          <TripFilterTabs
            trips={onSelectTrip ? trips : []}
            leadingChildren={isDesktopMap ? undefined : proximityFilterPills}
            selectedTripId={selectedTripId}
            variant={isDesktopMap ? 'desktopMap' : 'default'}
            onSelectTrip={onSelectTrip ?? noopSelectTrip}
          >
            {isDesktopMap ? proximityFilterPills : null}
          </TripFilterTabs>
        </View>
      ) : null}
    </View>
  );
}

function noopSelectTrip() {}

function FilterPill({
  active,
  inactiveBackgroundColor,
  inactiveTextColor,
  label,
  onPress,
  variant = 'default',
}: {
  active: boolean;
  inactiveBackgroundColor?: string;
  inactiveTextColor?: string;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'desktopMap';
}) {
  const isDark = useColorScheme() === 'dark';
  const isDesktopMap = variant === 'desktopMap';

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
          isDesktopMap && styles.desktopFilterPill,
          isDesktopMap &&
            !active && {
              backgroundColor: inactiveBackgroundColor,
            },
          isDesktopMap && active && styles.desktopFilterPillActive,
        ]}
      >
        <ThemedText
          lightColor={active ? designSystem.colors.darkGreen : designSystem.colors.ink}
          darkColor={active ? designSystem.colors.darkGreen : designSystem.colors.darkText}
          style={[
            styles.filterLabel,
            isDesktopMap && styles.desktopFilterLabel,
            isDesktopMap && !active && inactiveTextColor ? { color: inactiveTextColor } : null,
          ]}
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
  desktopDiscoveryBar: {
    width: '100%',
    maxWidth: 860,
    gap: 8,
    padding: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopSearchRow: {
    gap: 8,
    width: '100%',
  },
  searchGlass: {
    flex: 1,
    minWidth: 0,
  },
  searchContent: {
    gap: 8,
    paddingHorizontal: 12,
  },
  desktopSearchGlass: {
    flexShrink: 1,
    minWidth: 0,
  },
  desktopSearchContent: {
    paddingHorizontal: 12,
  },
  desktopSearchText: {
    color: designSystem.colors.darkTextWarm,
  },
  searchAccessory: {
    flexShrink: 0,
  },
  desktopLeadingAccessory: {
    flexShrink: 1,
    maxWidth: 184,
    minWidth: 124,
    width: 148,
  },
  desktopTrailingAccessory: {
    width: 52,
  },
  locationButton: {
    flexShrink: 0,
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  resetButton: {
    flexShrink: 0,
  },
  desktopFilterDock: {
    gap: 6,
    paddingVertical: 6,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
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
  desktopFilterPill: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 0,
    paddingHorizontal: 14,
  },
  desktopFilterPillActive: {
    backgroundColor: designSystem.colors.lime,
  },
  filterLabel: {
    ...designSystem.type.bodySmallStrong,
  },
  desktopFilterLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
});
