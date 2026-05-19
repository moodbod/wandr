import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Check, MagnifyingGlass, MapPin } from 'phosphor-react-native';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Country, type CountryCode } from 'react-native-country-picker-modal';

import { ThemedText } from '@/components/themed-text';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { Input } from '@/components/ui/input';
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
  label,
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
  const snapPoints = useMemo(() => [isDesktop ? '100%' : '84%'], [isDesktop]);
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

  const themeBackgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
  const themeBorderColor = 'transparent';
  const themeTextColor = isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text;
  const themePlaceholderColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';

  const updateBtnBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)';
  const updateBtnText = isDark ? designSystem.colors.white : designSystem.colors.darkGreen;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setIsOpen(true)}
        style={[
          variant === 'compact' ? styles.compactRow : styles.row,
          {
            backgroundColor: themeBackgroundColor,
            borderColor: themeBorderColor,
            borderRadius: 12,
            borderWidth: 0,
          }
        ]}>
        
        {variant === 'compact' ? (
          <>
            <View style={[styles.iconBox, { width: 28, height: 28, borderRadius: 8 }]}>
              {countryCode ? (
                <CountryFlagAvatar countryCode={countryCode} size={18} />
              ) : (
                <MapPin color={designSystem.colors.lime} weight="fill" size={14} />
              )}
            </View>
            <ThemedText
              lightColor={themeTextColor}
              darkColor={themeTextColor}
              style={styles.compactValue}>
              {value}
            </ThemedText>
          </>
        ) : (
          <>
            <View style={styles.iconBox}>
              {countryCode ? (
                <CountryFlagAvatar countryCode={countryCode} size={24} />
              ) : (
                <MapPin color={designSystem.colors.lime} weight="fill" size={20} />
              )}
            </View>
            
            <View style={styles.copy}>
              <ThemedText lightColor={themeTextColor} darkColor={themeTextColor} style={styles.valueTop}>
                {value || 'Select country'}
              </ThemedText>
              <ThemedText
                lightColor={themePlaceholderColor}
                darkColor={themePlaceholderColor}
                style={styles.valueBottom}>
                {label}
              </ThemedText>
            </View>
            
            <View style={[styles.updateButton, { backgroundColor: updateBtnBg }]}>
              <ThemedText lightColor={updateBtnText} darkColor={updateBtnText} style={styles.updateText}>
                {value ? 'Change' : 'Select'}
              </ThemedText>
            </View>
          </>
        )}
      </Pressable>
      <GlassBottomSheet
        ref={sheetRef}
        index={isOpen ? 0 : -1}
        renderInModal
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: isDark ? 'rgba(20, 20, 20, 0.65)' : 'rgba(255, 255, 255, 0.85)' }}
        desktopModalHostStyle={isDesktop ? { alignItems: 'center', justifyContent: 'center', paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0 } : undefined}
        desktopPopupHostStyle={isDesktop ? { width: 520, maxWidth: '90%', height: 640, maxHeight: '85%', borderRadius: 24, overflow: 'hidden' } : undefined}
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.sheetListContent, { paddingBottom: Math.max(insets.bottom, designSystem.spacing.lg) }]}
          ListHeaderComponent={
            <View style={styles.sheetHeader}>
              <Input
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
                darkColor="rgba(255, 255, 255, 0.04)"
                lightColor="rgba(0, 0, 0, 0.04)"
                containerStyle={{ borderWidth: 0, borderRadius: 16, height: 48 }}
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
                  style={[
                    styles.option,
                    isDesktop ? styles.desktopOption : null,
                    selected ? { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderRadius: 12 } : null
                  ]}>
                  <CountryFlagAvatar countryCode={item.code} size={isDesktop ? 24 : 32} />
                  <ThemedText style={[styles.optionTitle, isDesktop ? styles.desktopOptionTitle : null, selected ? styles.selectedText : null]}>
                    {item.label}
                  </ThemedText>
                  {selected ? <Check color={designSystem.colors.lime} size={20} weight="bold" /> : null}
                </Pressable>
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
    flexDirection: 'row',
    gap: designSystem.spacing.md,
    height: 64,
    paddingHorizontal: designSystem.spacing.md,
    borderRadius: 12,
  },
  compactRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    height: 40,
    paddingHorizontal: designSystem.spacing.sm,
    borderRadius: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(198, 239, 174, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  valueTop: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  valueBottom: {
    fontSize: 13,
    lineHeight: 18,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  updateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  desktopOption: {
    minHeight: 44,
    paddingVertical: 6,
    paddingHorizontal: designSystem.spacing.md,
  },
  desktopOptionTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: designSystem.spacing.sm,
  },
  optionFrame: {
    paddingHorizontal: designSystem.spacing.xs,
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
    paddingHorizontal: designSystem.spacing.md,
    paddingTop: designSystem.spacing.md,
    paddingBottom: designSystem.spacing.sm,
  },
  sheetListContent: {
    paddingHorizontal: designSystem.spacing.sm,
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
