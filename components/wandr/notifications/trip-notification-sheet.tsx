import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { Star, MapPin } from 'phosphor-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripNotificationPayload } from '@/lib/notifications';

type TripNotificationSheetProps = {
  payload: TripNotificationPayload | null;
  note: string;
  onNoteChange: (value: string) => void;
  rating: number;
  onRatingChange: (value: number) => void;
  onDismiss: () => void;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  isSubmitting?: boolean;
};

export function TripNotificationSheet({
  payload,
  note,
  onNoteChange,
  rating,
  onRatingChange,
  onDismiss,
  onPrimaryPress,
  onSecondaryPress,
  isSubmitting = false,
}: TripNotificationSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const copy = useMemo(() => {
    if (!payload) {
      return null;
    }

    if (payload.kind === 'arrival') {
      return {
        title: 'Arrived',
        body: 'This stop has been marked as visited.',
        primary: 'Open trip',
        secondary: 'Close',
      };
    }

    return {
      title: 'Rate this stop',
      body: 'Leave a quick rating and an optional note.',
      primary: isSubmitting ? 'Saving...' : 'Save',
      secondary: 'Later',
    };
  }, [isSubmitting, payload]);

  const snapPoints = useMemo(
    () => (payload?.kind === 'rating' ? ['48%'] : ['28%']),
    [payload?.kind]
  );

  useEffect(() => {
    if (!payload) {
      sheetRef.current?.close();
      return;
    }

    requestAnimationFrame(() => {
      sheetRef.current?.snapToIndex(0);
    });
  }, [payload]);

  if (!payload || !copy) {
    return null;
  }

  return (
    <GlassBottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      topInset={insets.top}
      onClose={onDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.2}
          pressBehavior="close"
        />
      )}>
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>{copy.title}</ThemedText>
          <ThemedText style={[styles.placeTitle, isDark && styles.placeTitleDark]}>
            {payload.title}
          </ThemedText>

          {payload.locationLabel ? (
            <View style={styles.locationRow}>
              <MapPin
                size={14}
                color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
                weight="fill"
              />
              <ThemedText style={[styles.locationText, isDark && styles.locationTextDark]}>
                {payload.locationLabel}
              </ThemedText>
            </View>
          ) : null}

          <ThemedText style={[styles.body, isDark && styles.bodyDark]}>{copy.body}</ThemedText>
        </View>

        {payload.kind === 'rating' ? (
          <View style={styles.ratingSection}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= rating;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${value} stars`}
                    onPress={() => onRatingChange(value)}
                    style={styles.starButton}>
                    <Star
                      size={28}
                      weight={active ? 'fill' : 'regular'}
                      color={
                        active
                          ? designSystem.colors.darkGreen
                          : isDark
                            ? designSystem.colors.darkMutedText
                            : designSystem.colors.subtleText
                      }
                    />
                  </Pressable>
                );
              })}
            </View>

            <BottomSheetTextInput
              multiline
              numberOfLines={4}
              onChangeText={onNoteChange}
              placeholder="Add a note"
              placeholderTextColor={isDark ? designSystem.colors.darkPlaceholderTextSoft : designSystem.colors.placeholderTextFaint}
              style={[styles.noteInput, isDark && styles.noteInputDark]}
              textAlignVertical="top"
              value={note}
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onPrimaryPress}
            disabled={isSubmitting || (payload.kind === 'rating' && rating < 1)}
            style={[
              styles.primaryButton,
              (isSubmitting || (payload.kind === 'rating' && rating < 1)) && styles.primaryButtonDisabled,
            ]}>
            <ThemedText style={styles.primaryButtonText}>{copy.primary}</ThemedText>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={onSecondaryPress ?? onDismiss} style={styles.secondaryButton}>
            <ThemedText style={[styles.secondaryButtonText, isDark && styles.secondaryButtonTextDark]}>
              {copy.secondary}
            </ThemedText>
          </Pressable>
        </View>
      </BottomSheetView>
    </GlassBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  placeTitle: {
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  placeTitleDark: {
    color: designSystem.colors.darkText,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
  locationTextDark: {
    color: designSystem.colors.darkMutedText,
  },
  body: {
    ...designSystem.type.body,
    color: designSystem.colors.warmDark,
  },
  bodyDark: {
    color: designSystem.colors.darkMutedText,
  },
  ratingSection: {
    gap: 14,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInput: {
    minHeight: 100,
    borderRadius: 18,
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
    color: designSystem.colors.ink,
  },
  noteInputDark: {
    backgroundColor: designSystem.colors.darkSurface,
    color: designSystem.colors.darkText,
    borderWidth: 1,
    borderColor: designSystem.colors.darkBorder,
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: designSystem.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.warmDark,
  },
  secondaryButtonTextDark: {
    color: designSystem.colors.darkMutedText,
  },
});
