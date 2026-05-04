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
  type PlanningLocation,
} from '@/constants/planning-countries';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type PlanningLocationSheetProps = {
  currentCoordinate?: readonly [number, number] | null;
  selectedLocation: PlanningLocation;
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: PlanningLocation) => void;
};

export function PlanningLocationSheet({
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
  const snapPoints = useMemo(() => ['48%', '70%'], []);
  const normalizedQuery = query.trim().toLowerCase();
  const countryOptions = useMemo(
    () =>
      [...allPlanningCountryOptions].sort((a, b) => {
        const aSupported = a.isSupported !== false;
        const bSupported = b.isSupported !== false;

        if (aSupported !== bSupported) {
          return aSupported ? -1 : 1;
        }

        return a.label.localeCompare(b.label);
      }),
    []
  );
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
  const options = isSearchExpanded ? searchOptions : defaultPlanningLocationPickerOptions;

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
      index={0}
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
        stickyHeaderIndices={[0]}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, designSystem.spacing.lg) }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText style={styles.title}>Choose location</ThemedText>
            {isSearchExpanded ? (
              <ThemedText style={[styles.description, { color: mutedColor }]}>
                Type a city, country, or region to plan somewhere else.
              </ThemedText>
            ) : null}

            {isSearchExpanded ? (
              <GlassInput
                autoCapitalize="words"
                containerStyle={styles.searchInput}
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
            ) : null}
          </View>
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
                    <ThemedText style={[styles.optionTitle, selected ? styles.selectedText : null]}>
                      {location.label}
                    </ThemedText>
                    {isCurrent ? (
                      <View style={styles.currentPill}>
                        <ThemedText style={styles.currentPillText}>Near you</ThemedText>
                      </View>
                    ) : null}
                    {isDisabled ? (
                      <View style={styles.disabledPill}>
                        <ThemedText style={styles.disabledPillText}>Soon</ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText style={[styles.optionDetail, { color: selected ? designSystem.colors.lime : mutedColor }]}>
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
                        borderColor: selected ? designSystem.colors.lime : mutedColor,
                      },
                    ]}
                  >
                    {selected ? <View style={styles.radioDot} /> : null}
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
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
  },
  description: {
    ...designSystem.type.body,
    marginTop: designSystem.spacing.xs,
  },
  searchInput: {
    marginTop: designSystem.spacing.lg,
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
  selectedText: {
    color: designSystem.colors.lime,
  },
  optionDetail: {
    ...designSystem.type.caption,
  },
  currentPill: {
    borderRadius: designSystem.radii.pill,
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
