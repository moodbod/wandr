import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Check, MagnifyingGlass } from 'phosphor-react-native';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Country, type CountryCode } from 'react-native-country-picker-modal';

import { ThemedText } from '@/components/themed-text';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassInput } from '@/components/ui/glass-input';
import { CountryFlagAvatar } from '@/components/wandr/country-flag-avatar';
import { allPlanningCountryOptions } from '@/constants/planning-countries';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

type CountryPickerFieldProps = {
  accessibilityLabel: string;
  countryCode: CountryCode | string;
  label: string;
  value: string;
  onSelect: (country: Country) => void;
  variant?: 'card' | 'compact';
};

export function CountryPickerField({
  accessibilityLabel,
  countryCode,
  value,
  onSelect,
  variant = 'card',
}: CountryPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const { isLargeScreen } = useResponsive();
  const isDesktop = Platform.OS === 'web' && isLargeScreen;
  const mutedColor = isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText;
  const snapPoints = useMemo(() => ['58%', '78%'], []);
  const countryOptions = useMemo(
    () =>
      allPlanningCountryOptions
        .filter((location) => location.countryCode && location.countryLabel)
        .map((location) => ({
          code: location.countryCode as CountryCode,
          label: location.countryLabel ?? location.label,
          searchText: `${location.countryLabel ?? location.label} ${location.countryCode} ${location.searchAliases.join(' ')}`.toLowerCase(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    []
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCountryOptions = useMemo(() => {
    if (!normalizedQuery) {
      return countryOptions;
    }

    return countryOptions.filter((country) => country.searchText.includes(normalizedQuery));
  }, [countryOptions, normalizedQuery]);

  function resetSheetState() {
    setIsOpen(false);
    setQuery('');
  }

  function closeSheet() {
    resetSheetState();
    sheetRef.current?.close();
  }

  function handleSelectCountry(country: { code: CountryCode; label: string }) {
    onSelect({
      cca2: country.code,
      name: country.label,
    } as Country);
    closeSheet();
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setIsOpen(true)}
        style={[
          variant === 'compact' ? styles.compactRow : styles.row,
          isDesktop ? styles.desktopRow : null,
        ]}>
        <CountryFlagAvatar countryCode={countryCode} size={isDesktop ? 26 : 30} />
        {variant === 'compact' ? (
          <ThemedText style={[styles.compactValue, isDesktop ? styles.desktopValue : null]}>{value}</ThemedText>
        ) : (
          <View style={styles.copy}>
            <ThemedText style={[styles.value, isDesktop ? styles.desktopValue : null, !value && styles.placeholderValue]}>
              {value || 'Select country'}
            </ThemedText>
          </View>
        )}
        <MaterialCommunityIcons color={designSystem.colors.darkGreen} name="chevron-down" size={20} />
      </Pressable>
      <GlassBottomSheet
        ref={sheetRef}
        index={isOpen ? 0 : -1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        onClose={resetSheetState}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.28} pressBehavior="close" />
        )}>
        <BottomSheetFlatList
          data={filteredCountryOptions}
          extraData={`${countryCode}-${query}`}
          keyExtractor={(country) => country.code}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={[0]}
          contentContainerStyle={[styles.sheetListContent, { paddingBottom: Math.max(insets.bottom, designSystem.spacing.lg) }]}
          ListHeaderComponent={
            <View style={styles.sheetHeader}>
              <GlassInput
                autoCapitalize="words"
                leftIcon={<MagnifyingGlass color={mutedColor} size={20} weight="bold" />}
                placeholder="Search countries"
                returnKeyType="done"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => {
                  const firstCountry = filteredCountryOptions[0];
                  if (firstCountry) {
                    handleSelectCountry(firstCountry);
                  }
                }}
              />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.statusRow}>
              <ThemedText style={[styles.statusText, { color: mutedColor }]}>No countries found.</ThemedText>
            </View>
          }
          renderItem={({ item }) => {
            const selected = item.code === countryCode;

            return (
              <View style={styles.optionFrame}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handleSelectCountry(item)}
                  style={[styles.option, isDesktop ? styles.desktopOption : null]}>
                  <CountryFlagAvatar countryCode={item.code} size={isDesktop ? 28 : 32} />
                  <ThemedText style={[styles.optionTitle, isDesktop ? styles.desktopOptionTitle : null, selected ? styles.selectedText : null]}>
                    {item.label}
                  </ThemedText>
                  {selected ? <Check color={designSystem.colors.lime} size={20} weight="bold" /> : null}
                </Pressable>
                <View style={styles.optionDivider} />
              </View>
            );
          }}
        />
      </GlassBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.white,
    borderColor: designSystem.colors.border,
    borderRadius: designSystem.radii.card - designSystem.spacing.xxs / 2,
    borderWidth: 1,
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    height: designSystem.layout.inputHeight,
    paddingHorizontal: designSystem.spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    ...designSystem.type.caption,
    color: designSystem.colors.gray,
    textTransform: 'uppercase',
  },
  value: {
    ...designSystem.type.bodyStrong,
  },
  compactRow: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.white,
    borderColor: designSystem.colors.border,
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    height: designSystem.layout.inputHeight,
    paddingHorizontal: designSystem.spacing.xs,
  },
  compactValue: {
    ...designSystem.type.bodyStrong,
  },
  desktopOption: {
    minHeight: 48,
    paddingVertical: 8,
  },
  desktopOptionTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  desktopRow: {
    height: 44,
    paddingHorizontal: designSystem.spacing.sm,
  },
  desktopValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    minHeight: 56,
    paddingVertical: 10,
  },
  optionDivider: {
    backgroundColor: designSystem.colors.borderSoft,
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
  optionFrame: {
    marginHorizontal: designSystem.spacing.lg,
  },
  optionTitle: {
    ...designSystem.type.bodyStrong,
    flex: 1,
    fontSize: 16,
  },
  placeholderValue: {
    color: designSystem.colors.gray,
  },
  selectedText: {
    color: designSystem.colors.lime,
  },
  sheetHeader: {
    backgroundColor: 'transparent',
    paddingBottom: designSystem.spacing.md,
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: designSystem.spacing.md,
  },
  sheetListContent: {
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
});
