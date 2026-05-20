import type React from 'react';
import { MagnifyingGlass } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { GlassInput } from '@/components/ui/glass-input';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  variant?: 'default' | 'desktopMap';
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
  variant = 'default',
}: DiscoveryFiltersProps) {
  const isDark = useColorScheme() === 'dark';
  const isDesktopMap = variant === 'desktopMap';
  const desktopBorderColor = 'rgba(255, 255, 255, 0.12)';
  const desktopControlSurfaceColor = 'rgba(8, 9, 14, 0.82)';
  const desktopInactiveTabColor = isDark ? 'rgba(255, 255, 255, 0.06)' : designSystem.colors.surface;
  const desktopInactiveTextColor = isDark ? designSystem.colors.darkTextWarm : designSystem.colors.ink;
  const desktopPlaceholderTextColor = 'rgba(243, 244, 239, 0.58)';
  const desktopSearchIconColor = isDark ? 'rgba(243, 244, 239, 0.78)' : designSystem.colors.fern;
  const showRegionTabs = regions.length > 1;
  const showIntentTabs = intents.length > 1;
  const showFilterTabs = showRegionTabs || showIntentTabs;

  return (
    <View style={[styles.shell, isDesktopMap && styles.desktopShell]}>
      <View style={[styles.searchRow, isDesktopMap && styles.desktopSearchRow]}>
        {leadingSearchAccessory ? (
          <View style={[styles.searchAccessory, isDesktopMap && styles.desktopLeadingAccessory]}>
            {leadingSearchAccessory}
          </View>
        ) : null}
        <GlassInput
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={[styles.searchInput, isDesktopMap && styles.desktopSearchInput]}
          contentStyle={
            isDesktopMap
              ? [
                  styles.desktopSearchInputContent,
                  {
                    backgroundColor: desktopControlSurfaceColor,
                    borderColor: desktopBorderColor,
                  },
                ]
              : undefined
          }
          intensity={70}
          leftIcon={
            isDesktopMap ? (
              <View style={styles.desktopSearchIconBadge}>
                <MagnifyingGlass color={desktopSearchIconColor} size={15} weight="bold" />
              </View>
            ) : undefined
          }
          onChangeText={onSearchQueryChange}
          plain={isDesktopMap}
          placeholder={searchPlaceholder}
          placeholderTextColor={isDesktopMap ? desktopPlaceholderTextColor : undefined}
          returnKeyType="search"
          style={isDesktopMap ? [styles.desktopSearchText, { color: desktopInactiveTextColor }] : undefined}
          value={searchQuery}
        />
        {trailingSearchAccessory ? (
          <View style={[styles.searchAccessory, isDesktopMap && styles.desktopTrailingAccessory]}>
            {trailingSearchAccessory}
          </View>
        ) : null}
      </View>

      {showFilterTabs ? (
        <View style={isDesktopMap ? styles.desktopFilterDock : undefined}>
          {showRegionTabs ? (
            <SegmentedTabs
              value={activeRegion}
              options={regions}
              onChange={onRegionChange}
              style={fullBleed ? styles.fullBleedTabs : undefined}
              tabStyle={[styles.borderlessTab, isDesktopMap && styles.desktopTab]}
              activeTabStyle={isDesktopMap ? styles.desktopActiveTab : undefined}
              inactiveTabStyle={
                isDesktopMap
                  ? [styles.desktopInactiveTab, { backgroundColor: desktopInactiveTabColor }]
                  : undefined
              }
              labelStyle={isDesktopMap ? styles.desktopTabLabel : undefined}
              activeLabelStyle={isDesktopMap ? styles.desktopActiveTabLabel : undefined}
              inactiveLabelStyle={
                isDesktopMap
                  ? [styles.desktopInactiveTabLabel, { color: desktopInactiveTextColor }]
                  : undefined
              }
              contentContainerStyle={[
                fullBleed ? styles.fullBleedTabContent : undefined,
                isDesktopMap && styles.desktopTabContent,
              ]}
            />
          ) : null}

          {showIntentTabs ? (
            <SegmentedTabs
              value={activeIntent}
              options={intents}
              onChange={onIntentChange}
              style={fullBleed ? styles.fullBleedTabs : undefined}
              tabStyle={[styles.borderlessTab, isDesktopMap && styles.desktopTab]}
              activeTabStyle={isDesktopMap ? styles.desktopActiveTab : undefined}
              inactiveTabStyle={
                isDesktopMap
                  ? [styles.desktopInactiveTab, { backgroundColor: desktopInactiveTabColor }]
                  : undefined
              }
              labelStyle={isDesktopMap ? styles.desktopTabLabel : undefined}
              activeLabelStyle={isDesktopMap ? styles.desktopActiveTabLabel : undefined}
              inactiveLabelStyle={
                isDesktopMap
                  ? [styles.desktopInactiveTabLabel, { color: desktopInactiveTextColor }]
                  : undefined
              }
              contentContainerStyle={[
                fullBleed ? styles.fullBleedTabContent : undefined,
                isDesktopMap && styles.desktopTabContent,
              ]}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 12,
  },
  desktopShell: {
    width: '100%',
    alignSelf: 'center',
    gap: 12,
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
  searchAccessory: {
    flexShrink: 0,
  },
  desktopLeadingAccessory: {
    flexShrink: 0,
    maxWidth: 220,
  },
  desktopTrailingAccessory: {
    width: 52,
    alignItems: 'flex-end',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
  },
  desktopSearchInput: {
    flexShrink: 1,
    minWidth: 0,
  },
  desktopSearchInputContent: {
    height: 58,
    gap: 14,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 18px 38px rgba(0,0,0,0.38)',
  },
  desktopSearchIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
  },
  desktopSearchText: {
    color: designSystem.colors.darkTextWarm,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  desktopFilterDock: {
    gap: 8,
    alignItems: 'flex-start',
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
  desktopTabContent: {
    gap: 8,
    paddingHorizontal: 8,
    paddingRight: 8,
  },
  desktopTab: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  desktopActiveTab: {
    backgroundColor: designSystem.colors.lime,
  },
  desktopInactiveTab: {
  },
  desktopTabLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  desktopActiveTabLabel: {
    color: designSystem.colors.darkGreen,
  },
  desktopInactiveTabLabel: {
  },
});
