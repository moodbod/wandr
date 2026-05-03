import { Image as ExpoImage } from 'expo-image';
import type React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripListItem } from '@/types/trip';

type TripFilterTabsProps = {
  trips: readonly TripListItem[];
  selectedTripId?: string;
  children?: React.ReactNode;
  onSelectTrip: (tripId: string) => void;
};

export function TripFilterTabs({ children, trips, selectedTripId, onSelectTrip }: TripFilterTabsProps) {
  const isDark = useColorScheme() === 'dark';

  if (trips.length === 0 && !children) {
    return null;
  }

  const selectedTrip = selectedTripId ?? trips[0]?._id;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.tabs}
    >
      {trips.map((trip) => {
        const isActive = trip._id === selectedTrip;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={trip._id}
            onPress={() => onSelectTrip(trip._id)}
            style={[
              styles.pill,
              isDark && styles.pillDark,
              isActive && styles.pillActive,
            ]}
          >
            <View style={[styles.imageFrame, isActive && styles.imageFrameActive]}>
              {trip.previewImage ? (
                <ExpoImage source={trip.previewImage} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[styles.imagePlaceholder, isDark && styles.imagePlaceholderDark]}>
                  <ThemedText style={styles.imagePlaceholderText}>{trip.name.charAt(0)}</ThemedText>
                </View>
              )}
            </View>
            <ThemedText
              numberOfLines={1}
              lightColor={isActive ? designSystem.colors.darkGreen : designSystem.colors.ink}
              darkColor={isActive ? designSystem.colors.darkGreen : designSystem.colors.darkText}
              style={styles.label}
            >
              {trip.name}
            </ThemedText>
          </Pressable>
        );
      })}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    marginHorizontal: -designSystem.spacing.lg,
    minHeight: 44,
    flexGrow: 0,
  },
  tabs: {
    gap: designSystem.spacing.xs,
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.lg,
  },
  pill: {
    minHeight: 44,
    maxWidth: 184,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    backgroundColor: designSystem.colors.surface,
    paddingLeft: 5,
    paddingRight: 14,
  },
  pillDark: {
    borderColor: designSystem.colors.darkBorderSoft,
    backgroundColor: designSystem.colors.darkSurface,
  },
  pillActive: {
    borderColor: designSystem.colors.lime,
    backgroundColor: designSystem.colors.lime,
  },
  imageFrame: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.borderFaint,
  },
  imageFrameActive: {
    borderWidth: 1,
    borderColor: designSystem.colors.darkGreen,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lightGlass,
  },
  imagePlaceholderDark: {
    backgroundColor: designSystem.colors.darkGlass,
  },
  imagePlaceholderText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  label: {
    ...designSystem.type.bodySmallStrong,
    flexShrink: 1,
  },
});
