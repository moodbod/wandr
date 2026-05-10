import type React from 'react';
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
  const desktopSurfaceColor = isDark ? designSystem.colors.darkOliveGlassSoft : designSystem.colors.whiteGlassHigh;
  const desktopBorderColor = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft;
  const desktopInputSurfaceColor = isDark ? designSystem.colors.darkGlassStrong : designSystem.colors.whiteGlassMax;
  const desktopDockSurfaceColor = isDark ? 'rgba(8, 11, 8, 0.38)' : designSystem.colors.whiteGlassMedium;
  const desktopInactiveTabColor = isDark ? 'rgba(255, 255, 255, 0.06)' : designSystem.colors.surface;
  const desktopInactiveTextColor = isDark ? designSystem.colors.darkTextWarm : designSystem.colors.ink;

  return (
    <View
      style={[
        styles.shell,
        isDesktopMap && styles.desktopShell,
        isDesktopMap && {
          backgroundColor: desktopSurfaceColor,
          borderColor: desktopBorderColor,
        },
      ]}
    >
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
                    backgroundColor: desktopInputSurfaceColor,
                    borderColor: desktopBorderColor,
                  },
                ]
              : undefined
          }
          intensity={70}
          onChangeText={onSearchQueryChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={
            isDesktopMap
              ? isDark
                ? designSystem.colors.darkPlaceholderTextSoft
                : designSystem.colors.placeholderTextSoft
              : undefined
          }
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
      </View>
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
    gap: 8,
    padding: 8,
    borderRadius: 32,
    borderWidth: 1,
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
    flexShrink: 1,
    maxWidth: 184,
    minWidth: 124,
    width: 148,
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
    gap: 8,
    paddingHorizontal: 12,
  },
  desktopSearchText: {
    color: designSystem.colors.darkTextWarm,
  },
  desktopFilterDock: {
    gap: 6,
    paddingVertical: 6,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
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
