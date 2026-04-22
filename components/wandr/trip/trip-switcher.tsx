import { Image as ExpoImage } from 'expo-image';
import { Plus, X } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripDashboard } from '@/types/trip';

type TripSwitcherProps = {
  trips: any[];
  currentTrip: TripDashboard;
  selectedTripId?: string;
  onDeleteTrip: (id: string) => void;
  onSelectTrip: (id: string) => void;
  onNewTrip: () => void;
};

export function TripSwitcher({
  trips,
  currentTrip,
  selectedTripId,
  onDeleteTrip,
  onSelectTrip,
  onNewTrip,
}: TripSwitcherProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.switcherContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherContent}>
        <Pressable 
          style={styles.tripCard}
          onPress={onNewTrip}
        >
          <View style={[styles.imageFrame, styles.newTripFrame, isDark && styles.imageFrameDark]}>
            <Plus size={24} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />
          </View>
          <ThemedText style={styles.tripCardName} numberOfLines={1}>New Trip</ThemedText>
        </Pressable>

        {trips.map((t) => (
          <Pressable 
            key={t._id} 
            style={styles.tripCard}
            onPress={() => onSelectTrip(t._id)}
          >
            <View style={[styles.imageFrame, isDark && styles.imageFrameDark, selectedTripId === t._id && styles.imageFrameActive]}>
              {(selectedTripId === t._id ? currentTrip.items[0]?.experience.imageUri : t.previewImage) ? (
                <ExpoImage 
                  source={selectedTripId === t._id ? currentTrip.items[0]?.experience.imageUri : t.previewImage} 
                  style={StyleSheet.absoluteFill} 
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.imagePlaceholder, isDark && styles.imagePlaceholderDark]} />
              )}
              <Pressable
                accessibilityLabel={`Delete ${t.name}`}
                onPress={(event) => {
                  event.stopPropagation();
                  onDeleteTrip(t._id);
                }}
                style={[styles.deleteButton, isDark && styles.deleteButtonDark]}>
                <X size={14} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />
              </Pressable>
            </View>
            <ThemedText 
              numberOfLines={1} 
              style={[styles.tripCardName, selectedTripId === t._id && styles.tripCardNameActive]}
            >
              {t.name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  switcherContainer: {
    marginTop: 12,
    marginHorizontal: -designSystem.spacing.lg,
  },
  switcherContent: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: 16,
  },
  tripCard: {
    width: 120,
    backgroundColor: 'transparent',
    gap: 10,
    alignItems: 'flex-start',
  },
  imageFrame: {
    width: 120,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.surface,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFrameDark: {
    backgroundColor: designSystem.colors.darkSurface,
  },
  imageFrameActive: {
    borderWidth: 0,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: designSystem.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderDark: {
    backgroundColor: designSystem.colors.darkSurface,
  },
  newTripFrame: {
    borderWidth: 1,
    borderColor: designSystem.colors.border,
    borderStyle: 'dashed',
  },
  tripCardName: {
    ...designSystem.type.bodyStrong,
    fontSize: 13,
    color: designSystem.colors.warmDark,
  },
  tripCardNameActive: {
    color: designSystem.colors.ink,
    fontWeight: '800',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,249,246,0.92)',
  },
  deleteButtonDark: {
    backgroundColor: 'rgba(17,19,15,0.88)',
  },
});
