import { Image as ExpoImage } from 'expo-image';
import { Plus, UsersThree, X } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripListItem } from '@/types/trip';

type TripSwitcherProps = {
  trips: TripListItem[];
  selectedTripId?: string;
  isEditing?: boolean;
  isLoading?: boolean;
  onDeleteTrip: (id: string) => void;
  onSelectTrip: (id: string) => void;
  onNewTrip: () => void;
  onRenameTrip?: (id: string, name: string) => void;
};

export function TripSwitcher({
  trips,
  selectedTripId,
  isEditing = false,
  isLoading = false,
  onDeleteTrip,
  onSelectTrip,
  onNewTrip,
  onRenameTrip,
}: TripSwitcherProps) {
  const isDark = useColorScheme() === 'dark';

  if (isLoading) {
    return <TripSwitcherSkeleton />;
  }

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
          <ThemedText
            darkColor={designSystem.colors.darkMutedText}
            lightColor={designSystem.colors.warmDark}
            style={styles.tripCardName}
            numberOfLines={1}
          >
            New Trip
          </ThemedText>
        </Pressable>

        {trips.map((t) => (
          <Pressable 
            key={t._id} 
            style={styles.tripCard}
            onPress={() => {
              if (isEditing && onRenameTrip) {
                onRenameTrip?.(t._id, t.name);
                return;
              }

              onSelectTrip(t._id);
            }}
          >
            <View style={[styles.imageFrame, isDark && styles.imageFrameDark, selectedTripId === t._id && styles.imageFrameActive]}>
              {t.previewImage ? (
                <ExpoImage 
                  source={t.previewImage} 
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
              {t.isGroupTrip ? (
                <View style={[styles.groupBadge, isDark && styles.groupBadgeDark]}>
                  <UsersThree
                    size={13}
                    color={isDark ? designSystem.colors.darkText : designSystem.colors.ink}
                    weight="bold"
                  />
                </View>
              ) : null}
            </View>
            <ThemedText 
              numberOfLines={1} 
              lightColor={selectedTripId === t._id ? designSystem.colors.ink : designSystem.colors.warmDark}
              darkColor={selectedTripId === t._id ? designSystem.colors.darkText : designSystem.colors.darkMutedText}
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

export function TripSwitcherSkeleton() {
  return (
    <View style={styles.switcherContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherContent}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={`trip-switcher-skeleton-${index}`} style={styles.tripCard}>
            <SkeletonBlock style={styles.switcherImageSkeleton} />
            <SkeletonBlock style={styles.switcherLabelSkeleton} />
          </View>
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
    flexDirection: 'row',
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
  switcherImageSkeleton: {
    width: 120,
    height: 180,
    borderRadius: 20,
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
    fontWeight: '600',
  },
  switcherLabelSkeleton: {
    width: 84,
    height: 16,
    borderRadius: 6,
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
    backgroundColor: designSystem.colors.lightGlass,
  },
  deleteButtonDark: {
    backgroundColor: designSystem.colors.darkGlass,
  },
  groupBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lightGlass,
  },
  groupBadgeDark: {
    backgroundColor: designSystem.colors.darkGlass,
  },
});
