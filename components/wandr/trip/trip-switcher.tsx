import { Image as ExpoImage } from 'expo-image';
import { CheckCircle, MapPin, Plus, UsersThree, X } from 'phosphor-react-native';
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
  showDeleteActions?: boolean;
  newTripHint?: string;
  newTripLabel?: string;
  variant?: 'cards' | 'compact';
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
  showDeleteActions = true,
  newTripHint = 'Start from this place',
  newTripLabel = 'New trip',
  variant = 'cards',
}: TripSwitcherProps) {
  const isDark = useColorScheme() === 'dark';

  if (isLoading) {
    return <TripSwitcherSkeleton />;
  }

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={onNewTrip}
          style={({ pressed }) => [
            styles.compactRow,
            isDark ? styles.compactRowDark : null,
            pressed ? styles.compactRowPressed : null,
          ]}
        >
          <View style={[styles.compactIconFrame, styles.newTripFrame, isDark && styles.compactIconFrameDark]}>
            <Plus size={20} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />
          </View>
          <View style={styles.compactCopy}>
            <ThemedText
              darkColor={designSystem.colors.darkText}
              lightColor={designSystem.colors.ink}
              numberOfLines={1}
              style={styles.compactName}
            >
              {newTripLabel}
            </ThemedText>
            <ThemedText
              darkColor={designSystem.colors.darkTextSoft}
              lightColor={designSystem.colors.mutedText}
              numberOfLines={1}
              style={styles.compactMeta}
            >
              {newTripHint}
            </ThemedText>
          </View>
        </Pressable>

        {trips.map((t) => {
          const isSelected = selectedTripId === t._id;

          return (
            <Pressable
              accessibilityRole="button"
              key={t._id}
              onPress={() => {
                if (isEditing && onRenameTrip) {
                  onRenameTrip?.(t._id, t.name);
                  return;
                }

                onSelectTrip(t._id);
              }}
              style={({ pressed }) => [
                styles.compactRow,
                isDark ? styles.compactRowDark : null,
                isSelected ? styles.compactRowActive : null,
                pressed ? styles.compactRowPressed : null,
              ]}
            >
              <View style={[styles.compactIconFrame, isDark && styles.compactIconFrameDark]}>
                {t.previewImage ? (
                  <ExpoImage
                    source={t.previewImage}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                ) : (
                  <MapPin
                    color={isDark ? designSystem.colors.darkTextSoft : designSystem.colors.warmDark}
                    size={20}
                    weight="fill"
                  />
                )}
              </View>
              <View style={styles.compactCopy}>
                <ThemedText
                  darkColor={designSystem.colors.darkText}
                  lightColor={designSystem.colors.ink}
                  numberOfLines={1}
                  style={styles.compactName}
                >
                  {t.name}
                </ThemedText>
                <View style={styles.compactMetaRow}>
                  {t.isGroupTrip ? (
                    <UsersThree
                      color={isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText}
                      size={13}
                      weight="bold"
                    />
                  ) : null}
                  <ThemedText
                    darkColor={designSystem.colors.darkTextSoft}
                    lightColor={designSystem.colors.mutedText}
                    numberOfLines={1}
                    style={styles.compactMeta}
                  >
                    {t.isGroupTrip ? 'Group trip' : t.visibility === 'public' ? 'Public trip' : 'Private trip'}
                  </ThemedText>
                </View>
              </View>
              {isSelected ? (
                <CheckCircle color={designSystem.colors.lime} size={22} weight="fill" />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
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
              {showDeleteActions ? (
                <Pressable
                  accessibilityLabel={`Delete ${t.name}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    onDeleteTrip(t._id);
                  }}
                  style={[styles.deleteButton, isDark && styles.deleteButtonDark]}>
                  <X size={14} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />
                </Pressable>
              ) : null}
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
  compactContainer: {
    gap: 10,
  },
  compactRow: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.surfaceRaised,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  compactRowDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  compactRowActive: {
    borderColor: designSystem.colors.lime,
  },
  compactRowPressed: {
    opacity: 0.82,
  },
  compactIconFrame: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.surface,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  compactIconFrameDark: {
    backgroundColor: designSystem.colors.charcoalSoft,
  },
  compactCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  compactName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  compactMeta: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  compactMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
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
    borderColor: designSystem.colors.lime,
    borderWidth: 3,
  },
  imagePlaceholder: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
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
