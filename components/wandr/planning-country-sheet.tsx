import { ActivityIndicator, Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { CaretRight, Check, MapPin } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassInput } from '@/components/ui/glass-input';
import {
  getGlassBottomSheetBorderColor,
  GlassBottomSheetSurface,
} from '@/components/ui/glass-bottom-sheet';
import {
  defaultPlanningLocations,
  getPlanningLocationForCoordinate,
  type PlanningLocation,
} from '@/constants/planning-countries';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchMapboxLocationSuggestions } from '@/lib/mapbox-geocoding';

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
  const [query, setQuery] = useState('');
  const [isMounted, setIsMounted] = useState(visible);
  const sheetProgress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const currentLocation = getPlanningLocationForCoordinate(currentCoordinate);
  const borderColor = getGlassBottomSheetBorderColor(isDark);
  const mutedColor = isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText;
  const iconColor = isDark ? designSystem.colors.darkText : designSystem.colors.ink;
  const [suggestions, setSuggestions] = useState<PlanningLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const options = useMemo(() => {
    const supportedMatches = defaultPlanningLocations.filter((location) => {
      if (!normalizedQuery) {
        return true;
      }

      return [location.label, location.detail, ...location.searchAliases]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });

    if (normalizedQuery.length >= 2) {
      const supportedIds = new Set(supportedMatches.map((location) => location.id));
      const disabledSuggestions = suggestions
        .filter((location) => !supportedIds.has(location.id))
        .map((location) => ({
          ...location,
          detail: `${location.detail} - coming soon`,
          isSupported: false,
        }));

      return [...supportedMatches, ...disabledSuggestions];
    }

    return supportedMatches;
  }, [normalizedQuery, suggestions]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.timing(sheetProgress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(sheetProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [sheetProgress, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (normalizedQuery.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setIsSearching(true);
      setSearchError(null);

      fetchMapboxLocationSuggestions({
        currentCoordinate,
        query,
        signal: controller.signal,
      })
        .then((results) => {
          setSuggestions(results);
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          setSuggestions([]);
          setSearchError(error instanceof Error ? error.message : 'Unable to load map suggestions.');
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 260);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [currentCoordinate, normalizedQuery, query, visible]);

  if (!isMounted) {
    return null;
  }

  const backdropAnimatedStyle = {
    opacity: sheetProgress,
  };
  const sheetAnimatedStyle = {
    transform: [
      {
        translateY: sheetProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [520, 0],
        }),
      },
    ],
  };

  return (
    <Modal animationType="none" transparent visible={isMounted} onRequestClose={onClose}>
      <Animated.View style={[styles.modalRoot, backdropAnimatedStyle]}>
        <Pressable accessibilityLabel="Close location picker" style={styles.scrim} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, designSystem.spacing.lg),
              backgroundColor: 'transparent',
              borderColor,
            },
            sheetAnimatedStyle,
          ]}
        >
          <GlassBottomSheetSurface overlay style={StyleSheet.absoluteFill} />
          <View style={styles.grabber} />
          <ThemedText style={styles.title}>Choose location</ThemedText>
          <ThemedText style={[styles.description, { color: mutedColor }]}>
            Type a city, country, or region to plan somewhere else.
          </ThemedText>

          <GlassInput
            autoCapitalize="words"
            containerStyle={styles.searchInput}
            leftIcon={<MapPin color={mutedColor} size={20} weight="bold" />}
            placeholder="Where are you planning?"
            returnKeyType="done"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              const firstSuggestion = options[0];
              if (!firstSuggestion) {
                return;
              }

              onSelectLocation(firstSuggestion);
              setQuery('');
              onClose();
            }}
          />

          <View style={styles.optionList}>
            {isSearching ? (
              <View style={[styles.statusRow, { borderColor }]}>
                <ActivityIndicator color={iconColor} />
                <ThemedText style={[styles.statusText, { color: mutedColor }]}>Searching map</ThemedText>
              </View>
            ) : null}
            {!isSearching && searchError ? (
              <View style={[styles.statusRow, { borderColor }]}>
                <ThemedText style={[styles.statusText, { color: mutedColor }]}>
                  Map suggestions are unavailable right now.
                </ThemedText>
              </View>
            ) : null}
            {!isSearching && !searchError && normalizedQuery.length >= 2 && options.length === 0 ? (
              <View style={[styles.statusRow, { borderColor }]}>
                <ThemedText style={[styles.statusText, { color: mutedColor }]}>No map suggestions found.</ThemedText>
              </View>
            ) : null}
            {options.map((location) => {
              const selected = location.label.toLowerCase() === selectedLocation.label.toLowerCase();
              const isCurrent = currentLocation?.id === location.id;
              const isDisabled = location.isSupported === false;

              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={isDisabled}
                  key={location.id}
                  onPress={() => {
                    onSelectLocation(location);
                    setQuery('');
                    onClose();
                  }}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? designSystem.colors.borderAccent : borderColor,
                      backgroundColor: selected
                        ? designSystem.colors.lime
                        : isDark
                          ? designSystem.colors.whiteOverlayThin
                          : designSystem.colors.scrimBarely,
                      opacity: isDisabled ? 0.48 : 1,
                    },
                  ]}
                >
                  <View style={styles.optionIcon}>
                    <MapPin color={selected ? designSystem.colors.darkGreen : iconColor} size={20} weight="bold" />
                  </View>
                  <View style={styles.optionCopy}>
                    <View style={styles.optionTitleRow}>
                      <ThemedText style={[styles.optionTitle, selected ? styles.selectedText : null]}>{location.label}</ThemedText>
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
                    <ThemedText style={[styles.optionDetail, { color: selected ? designSystem.colors.darkGreen : mutedColor }]}>
                      {location.detail}
                    </ThemedText>
                  </View>
                  {selected ? (
                    <Check color={designSystem.colors.darkGreen} size={20} weight="bold" />
                  ) : (
                    <CaretRight color={mutedColor} size={20} weight="bold" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    borderTopLeftRadius: designSystem.radii.sheet,
    borderTopRightRadius: designSystem.radii.sheet,
    borderTopWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: designSystem.spacing.sm,
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    marginBottom: designSystem.spacing.lg,
    backgroundColor: designSystem.colors.border,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
  },
  description: {
    ...designSystem.type.body,
    marginTop: designSystem.spacing.xs,
  },
  searchInput: {
    marginTop: designSystem.spacing.lg,
  },
  optionList: {
    gap: designSystem.spacing.sm,
    marginTop: designSystem.spacing.md,
  },
  statusRow: {
    minHeight: 54,
    borderRadius: designSystem.radii.card,
    borderWidth: 1,
    paddingHorizontal: designSystem.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.sm,
  },
  statusText: {
    ...designSystem.type.bodySmallStrong,
  },
  option: {
    minHeight: 78,
    borderRadius: designSystem.radii.card,
    borderWidth: 1,
    padding: designSystem.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.sm,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: designSystem.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.whiteOverlayThin,
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
    color: designSystem.colors.darkGreen,
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
    fontWeight: '700',
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
    fontWeight: '700',
    color: designSystem.colors.darkText,
  },
});
