import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Check, MagnifyingGlass } from 'phosphor-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCountries, getCountryCallingCode, type CountryCode as PhoneCountryCode } from 'libphonenumber-js/min';

import { ThemedText } from '@/components/themed-text';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassInput } from '@/components/ui/glass-input';
import { CountryFlagAvatar } from '@/components/wandr/country-flag-avatar';
import { allPlanningCountryOptions } from '@/constants/planning-countries';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type PhoneCountrySelection = {
  callingCode: string;
  countryCode: PhoneCountryCode;
  countryLabel: string;
};

type PhoneCountryOption = PhoneCountrySelection & {
  searchText: string;
};

type PhoneCountrySheetProps = {
  selectedCountryCode: PhoneCountryCode;
  visible: boolean;
  onClose: () => void;
  onSelectCountry: (country: PhoneCountrySelection) => void;
};

const countryNameByCode = new Map(
  allPlanningCountryOptions
    .filter((location) => location.countryCode)
    .map((location) => [location.countryCode, location.countryLabel ?? location.label])
);

const regionDisplayNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new (Intl as typeof Intl & {
        DisplayNames: new (locales: string[], options: { type: 'region' }) => { of: (code: string) => string | undefined };
      }).DisplayNames(['en'], { type: 'region' })
    : null;

const phoneCountryOptions: PhoneCountryOption[] = getCountries()
  .map((countryCode) => {
    const countryLabel = countryNameByCode.get(countryCode) ?? regionDisplayNames?.of(countryCode) ?? countryCode;
    const callingCode = getCountryCallingCode(countryCode);

    return {
      callingCode,
      countryCode,
      countryLabel,
      searchText: `${countryLabel} ${countryCode} ${callingCode}`.toLowerCase(),
    };
  })
  .sort((a, b) => a.countryLabel.localeCompare(b.countryLabel));

export function PhoneCountrySheet({
  selectedCountryCode,
  visible,
  onClose,
  onSelectCountry,
}: PhoneCountrySheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const mutedColor = isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText;
  const snapPoints = useMemo(() => ['54%', '76%'], []);
  const normalizedQuery = query.trim().toLowerCase();
  const options = useMemo(() => {
    const matchingCountries = normalizedQuery
      ? phoneCountryOptions.filter((country) => country.searchText.includes(normalizedQuery))
      : phoneCountryOptions;

    const selectedCountry = matchingCountries.find((country) => country.countryCode === selectedCountryCode);

    if (!selectedCountry) {
      return matchingCountries;
    }

    return [
      selectedCountry,
      ...matchingCountries.filter((country) => country.countryCode !== selectedCountryCode),
    ];
  }, [normalizedQuery, selectedCountryCode]);

  function handleSelect(country: PhoneCountrySelection) {
    onSelectCountry(country);
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
        if (index === -1 && visible) {
          setQuery('');
          onClose();
        }
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.28} pressBehavior="close" />
      )}
    >
      <BottomSheetFlatList
        data={options}
        extraData={`${selectedCountryCode}-${query}`}
        keyExtractor={(country) => country.countryCode}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, designSystem.spacing.lg) }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <GlassInput
              autoCapitalize="words"
              leftIcon={<MagnifyingGlass color={mutedColor} size={20} weight="bold" />}
              placeholder="Search country"
              returnKeyType="search"
              value={query}
              onChangeText={setQuery}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.statusRow}>
            <ThemedText style={[styles.statusText, { color: mutedColor }]}>No countries found.</ThemedText>
          </View>
        }
        renderItem={({ item }) => {
          const selected = item.countryCode === selectedCountryCode;

          return (
            <View style={styles.optionFrame}>
              <Pressable accessibilityRole="button" onPress={() => handleSelect(item)} style={styles.option}>
                <CountryFlagAvatar countryCode={item.countryCode} size={32} />
                <View style={styles.optionCopy}>
                  <ThemedText style={styles.optionTitle}>
                    {item.countryLabel}
                  </ThemedText>
                  <ThemedText style={[styles.optionDetail, { color: mutedColor }]}>
                    +{item.callingCode}
                  </ThemedText>
                </View>
                {selected ? <Check color={designSystem.colors.lime} size={22} weight="bold" /> : null}
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
    backgroundColor: 'transparent',
    paddingBottom: designSystem.spacing.md,
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: designSystem.spacing.md,
  },
  listContent: {
    paddingBottom: designSystem.spacing.lg,
  },
  statusRow: {
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: designSystem.spacing.lg,
  },
  statusText: {
    ...designSystem.type.bodySmallStrong,
  },
  optionFrame: {
    marginHorizontal: designSystem.spacing.lg,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    minHeight: 56,
    paddingVertical: 10,
  },
  optionCopy: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    ...designSystem.type.bodyStrong,
  },
  optionDetail: {
    ...designSystem.type.caption,
  },
  optionDivider: {
    backgroundColor: designSystem.colors.borderSoft,
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
});
