import { ArrowUp, MapPin } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { Sheet, SheetFlatList, SheetRef } from '@/components/ui/sheet';
import { CountryFlagAvatar } from '@/components/wandr/country-flag-avatar';
import {
  allPlanningCountryOptions,
  getPlanningLocationForCoordinate,
  otherCountriesPlanningLocationOption,
  type PlanningLocation,
} from '@/constants/planning-countries';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

const knownPlanningCountryCodes = new Set(
  allPlanningCountryOptions
    .map((location) => location.countryCode?.toUpperCase())
    .filter((countryCode): countryCode is string => Boolean(countryCode))
);

type PlanningLocationSheetProps = {
  availableLocations?: readonly PlanningLocation[];
  currentCoordinate?: readonly [number, number] | null;
  selectedLocation: PlanningLocation;
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: PlanningLocation) => void;
};

export function PlanningLocationSheet({
  availableLocations,
  currentCoordinate,
  selectedLocation,
  visible,
  onClose,
  onSelectLocation,
}: PlanningLocationSheetProps) {
  const sheetRef = useRef<SheetRef>(null);
  const [query, setQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const { isLargeScreen } = useResponsive();
  const isDesktop = Platform.OS === 'web' && isLargeScreen;
  const currentLocation = getPlanningLocationForCoordinate(currentCoordinate);
  const mutedColor = isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText;
  const selectedAccentColor = isDark ? designSystem.colors.darkTextWarm : designSystem.colors.ink;
  const currentPillBackgroundColor = isDark ? designSystem.colors.whiteOverlayThin : designSystem.colors.surface;
  const currentPillBorderColor = isDark ? designSystem.colors.whiteOverlayFaint : designSystem.colors.borderSoft;
  const currentPillTextColor = selectedAccentColor;
  const snapPoints = useMemo(() => ['48%', '70%'], []);
  const normalizedQuery = query.trim().toLowerCase();
  const dataBackedLocations = useMemo(
    () => (availableLocations ?? []).map((location) => ({ ...location, isSupported: true })),
    [availableLocations]
  );
  const availabilityByCountryCode = useMemo(() => {
    const locations = new Map<string, PlanningLocation>();

    dataBackedLocations.forEach((location) => {
      if (location.countryCode) {
        locations.set(location.countryCode.toUpperCase(), location);
      }
    });

    return locations;
  }, [dataBackedLocations]);
  const countryOptions = useMemo(() => {
    if (!isSearchExpanded) {
      return [];
    }

    const mergedOptions = allPlanningCountryOptions.map((location) => {
      const availableLocation = location.countryCode
        ? availabilityByCountryCode.get(location.countryCode.toUpperCase())
        : undefined;

      if (availableLocation) {
        return {
          ...location,
          ...availableLocation,
          isSupported: true,
        };
      }

      return {
        ...location,
        isSupported: false,
      };
    });
    const extraAvailableLocations = dataBackedLocations.filter(
      (location) => !location.countryCode || !knownPlanningCountryCodes.has(location.countryCode.toUpperCase())
    );

    return [...mergedOptions, ...extraAvailableLocations].sort((a, b) => {
      const aSupported = a.isSupported !== false;
      const bSupported = b.isSupported !== false;

      if (aSupported !== bSupported) {
        return aSupported ? -1 : 1;
      }

      return a.label.localeCompare(b.label);
    });
  }, [availabilityByCountryCode, dataBackedLocations, isSearchExpanded]);
  const searchOptions = useMemo(() => {
    if (!isSearchExpanded) {
      return [];
    }

    if (!normalizedQuery) {
      return countryOptions;
    }

    return countryOptions.filter((location) =>
      [location.label, location.detail, ...location.searchAliases]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [countryOptions, isSearchExpanded, normalizedQuery]);
  const defaultOptions =
    dataBackedLocations.length > 0
      ? [...dataBackedLocations, otherCountriesPlanningLocationOption]
      : [otherCountriesPlanningLocationOption];
  const options = isSearchExpanded ? searchOptions : defaultOptions;

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    }
  }, [visible]);

  function expandSearch() {
    setIsSearchExpanded(true);
    sheetRef.current?.snapToIndex(1);
  }

  function resetSearchState() {
    setQuery('');
    setIsSearchExpanded(false);
  }

  function handleSheetClose() {
    resetSearchState();
    onClose();
  }

  function handleSelectLocation(location: PlanningLocation) {
    onSelectLocation(location);
    resetSearchState();
    sheetRef.current?.close();
  }

  return (
    <Sheet
      ref={sheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      onClose={handleSheetClose}
      onChange={(index) => {
        if (index === 0) {
          setIsSearchExpanded(false);
          setQuery('');
        }
      }}>
      <SheetFlatList
        data={options}
        extraData={`${selectedLocation.id}-${isSearchExpanded}-${query}`}
        initialNumToRender={isSearchExpanded ? 12 : Math.max(1, options.length)}
        keyExtractor={(location) => location.id}
        keyboardShouldPersistTaps="handled"
        maxToRenderPerBatch={12}
        removeClippedSubviews
        stickyHeaderIndices={isSearchExpanded ? [0] : undefined}
        windowSize={7}
        contentContainerStyle={StyleSheet.flatten([
          styles.listContent,
          isDesktop ? styles.desktopListContent : null,
          { paddingBottom: Math.max(insets.bottom, isDesktop ? designSystem.spacing.md : designSystem.spacing.lg) },
        ])}
        ListHeaderComponent={
          isSearchExpanded ? (
            <View style={styles.header}>
              <Input
                autoCapitalize="words"
                leftIcon={<MapPin color={mutedColor} size={isDesktop ? 18 : 20} weight="bold" />}
                placeholder="Where are you planning?"
                returnKeyType="done"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => {
                  const firstSupportedLocation = searchOptions.find((location) => location.isSupported !== false);
                  if (firstSupportedLocation) {
                    handleSelectLocation(firstSupportedLocation);
                  }
                }}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isSearchExpanded ? (
            <View style={styles.statusRow}>
              <ThemedText style={[styles.statusText, { color: mutedColor }]}>No countries found.</ThemedText>
            </View>
          ) : null
        }
        renderItem={({ item: location }) => {
          const selected = location.id === selectedLocation.id;
          const isCurrent = currentLocation?.id === location.id;
          const isSearchPrompt = location.isSearchPrompt === true;
          const isDisabled = location.isSupported === false && !isSearchPrompt;
          const shouldShowDetail = isSearchExpanded && Boolean(location.detail);

          return (
            <View style={styles.optionFrame}>
              <Pressable
                accessibilityRole="button"
                disabled={isDisabled}
                onPress={() => {
                  if (isSearchPrompt) {
                    expandSearch();
                    return;
                  }

                  handleSelectLocation(location);
                }}
                style={[styles.option, isDesktop ? styles.desktopOption : null, { opacity: isDisabled ? 0.48 : 1 }]}
              >
                {location.countryCode ? (
                  <CountryFlagAvatar countryCode={location.countryCode} size={isDesktop ? 28 : 32} />
                ) : null}
                <View style={styles.optionCopy}>
                  <View style={styles.optionTitleRow}>
                    <ThemedText style={[styles.optionTitle, isDesktop ? styles.desktopOptionTitle : null, selected ? { color: selectedAccentColor } : null]}>
                      {location.label}
                    </ThemedText>
                    {isCurrent ? (
                      <View
                        style={[
                          styles.currentPill,
                          {
                            backgroundColor: currentPillBackgroundColor,
                            borderColor: currentPillBorderColor,
                          },
                        ]}
                      >
                        <ThemedText style={[styles.currentPillText, { color: currentPillTextColor }]}>Near you</ThemedText>
                      </View>
                    ) : null}
                    {isDisabled ? (
                      <View style={[styles.disabledPill, { backgroundColor: currentPillBackgroundColor }]}>
                        <ThemedText style={[styles.disabledPillText, { color: mutedColor }]}>Soon</ThemedText>
                      </View>
                    ) : null}
                  </View>
                  {shouldShowDetail ? (
                    <ThemedText style={[styles.optionDetail, isDesktop ? styles.desktopOptionDetail : null, { color: mutedColor }]}>
                      {location.detail}
                    </ThemedText>
                  ) : null}
                </View>
                {isSearchPrompt ? (
                  <ArrowUp color={mutedColor} size={isDesktop ? 18 : 20} weight="bold" />
                ) : (
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? selectedAccentColor : mutedColor,
                      },
                    ]}
                  >
                    {selected ? <View style={[styles.radioDot, { backgroundColor: selectedAccentColor }]} /> : null}
                  </View>
                )}
              </Pressable>
              <View style={styles.optionDivider} />
            </View>
          );
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: designSystem.spacing.md,
    paddingBottom: designSystem.spacing.md,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingBottom: designSystem.spacing.lg,
  },
  desktopListContent: {
    paddingBottom: designSystem.spacing.md,
  },
  desktopOption: {
    minHeight: 48,
    paddingVertical: 8,
  },
  desktopOptionDetail: {
    fontSize: 11,
    lineHeight: 15,
  },
  desktopOptionTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: {
    minHeight: 54,
    justifyContent: 'center',
  },
  statusText: {
    ...designSystem.type.bodySmallStrong,
  },
  optionFrame: {
    marginHorizontal: designSystem.spacing.lg,
  },
  option: {
    minHeight: 56,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.sm,
  },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
    backgroundColor: designSystem.colors.borderSoft,
  },
  optionCopy: {
    flex: 1,
    gap: 4,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.xs,
    flexWrap: 'wrap',
  },
  optionTitle: {
    ...designSystem.type.bodyStrong,
    fontSize: 16,
  },
  optionDetail: {
    ...designSystem.type.caption,
  },
  currentPill: {
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: designSystem.colors.lime,
  },
  currentPillText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  disabledPill: {
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: designSystem.colors.whiteOverlayThin,
  },
  disabledPillText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    color: designSystem.colors.darkText,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: designSystem.colors.lime,
  },
});
