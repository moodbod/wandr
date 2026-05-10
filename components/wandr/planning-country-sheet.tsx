import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { ArrowUp, MapPin } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassInput } from '@/components/ui/glass-input';
import { CountryFlagAvatar } from '@/components/wandr/country-flag-avatar';
import {
  allPlanningCountryOptions,
  defaultPlanningLocationPickerOptions,
  getPlanningLocationForCoordinate,
  otherCountriesPlanningLocationOption,
  type PlanningLocation,
} from '@/constants/planning-countries';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const sheetRef = useRef<BottomSheet>(null);
  const [query, setQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const currentLocation = getPlanningLocationForCoordinate(currentCoordinate);
  const mutedColor = isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText;
  const selectedAccentColor = isDark ? designSystem.colors.lime : designSystem.colors.fern;
  const currentPillBackgroundColor = isDark ? designSystem.colors.lime : designSystem.colors.limeMist;
  const currentPillBorderColor = isDark ? designSystem.colors.lime : designSystem.colors.borderAccent;
  const currentPillTextColor = isDark ? designSystem.colors.darkGreen : designSystem.colors.fern;
  const snapPoints = useMemo(() => ['48%', '70%'], []);
  const normalizedQuery = query.trim().toLowerCase();
  const availabilityByCountryCode = useMemo(() => {
    const locations = new Map<string, PlanningLocation>();

    availableLocations?.forEach((location) => {
      if (location.countryCode) {
        locations.set(location.countryCode.toUpperCase(), location);
      }
    });

    return locations;
  }, [availableLocations]);
  const hasDataBackedAvailability = availableLocations !== undefined;
  const countryOptions = useMemo(() => {
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

      return hasDataBackedAvailability
        ? {
            ...location,
            isSupported: false,
          }
        : location;
    });
    const knownCountryCodes = new Set(
      allPlanningCountryOptions
        .map((location) => location.countryCode?.toUpperCase())
        .filter((countryCode): countryCode is string => Boolean(countryCode))
    );
    const extraAvailableLocations = (availableLocations ?? []).filter(
      (location) => !location.countryCode || !knownCountryCodes.has(location.countryCode.toUpperCase())
    );

    return [...mergedOptions, ...extraAvailableLocations].sort((a, b) => {
      const aSupported = a.isSupported !== false;
      const bSupported = b.isSupported !== false;

      if (aSupported !== bSupported) {
        return aSupported ? -1 : 1;
      }

      return a.label.localeCompare(b.label);
    });
  }, [availabilityByCountryCode, availableLocations, hasDataBackedAvailability]);
  const searchOptions = useMemo(() => {
    if (!normalizedQuery) {
      return countryOptions;
    }

    return countryOptions.filter((location) =>
      [location.label, location.detail, ...location.searchAliases]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [countryOptions, normalizedQuery]);
  const defaultOptions =
    hasDataBackedAvailability
      ? availableLocations && availableLocations.length > 0
        ? [...availableLocations, otherCountriesPlanningLocationOption]
        : [otherCountriesPlanningLocationOption]
      : defaultPlanningLocationPickerOptions;
  const options = isSearchExpanded ? searchOptions : defaultOptions;

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
      return;
    }

    sheetRef.current?.close();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setIsSearchExpanded(false);
    }
  }, [visible]);

  function expandSearch() {
    setIsSearchExpanded(true);
    sheetRef.current?.snapToIndex(1);
  }

  function handleSelectLocation(location: PlanningLocation) {
    onSelectLocation(location);
    setQuery('');
    sheetRef.current?.close();
  }

  return (
    <GlassBottomSheet
      ref={sheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      onChange={(index) => {
        if (index === 0) {
          setIsSearchExpanded(false);
          setQuery('');
        }

        if (index === -1 && visible) {
          onClose();
        }
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.28} pressBehavior="close" />
      )}
    >
      <BottomSheetFlatList
        data={options}
        extraData={`${selectedLocation.id}-${isSearchExpanded}-${query}`}
        keyExtractor={(location) => location.id}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={isSearchExpanded ? [0] : undefined}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, designSystem.spacing.lg) }]}
        ListHeaderComponent={
          isSearchExpanded ? (
            <View style={styles.header}>
              <GlassInput
                autoCapitalize="words"
                leftIcon={<MapPin color={mutedColor} size={20} weight="bold" />}
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
                style={[styles.option, { opacity: isDisabled ? 0.48 : 1 }]}
              >
                {location.countryCode ? (
                  <CountryFlagAvatar countryCode={location.countryCode} size={32} />
                ) : null}
                <View style={styles.optionCopy}>
                  <View style={styles.optionTitleRow}>
                    <ThemedText style={[styles.optionTitle, selected ? { color: selectedAccentColor } : null]}>
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
                      <View style={styles.disabledPill}>
                        <ThemedText style={styles.disabledPillText}>Soon</ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText style={[styles.optionDetail, { color: selected ? selectedAccentColor : mutedColor }]}>
                    {location.detail}
                  </ThemedText>
                </View>
                {isSearchPrompt ? (
                  <ArrowUp color={mutedColor} size={20} weight="bold" />
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
    </GlassBottomSheet>
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
