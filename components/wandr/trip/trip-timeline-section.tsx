import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { MapTrifold, X } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripDashboardItem } from '@/types/trip';

type TripTimelineSectionProps = {
  items: readonly TripDashboardItem[];
  isEditing?: boolean;
  onRemoveItem?: (itemId: string) => void;
  removingItemId?: string | null;
  variant?: 'default' | 'sheet';
};

const MARKER_SIZE = 32;
const MARKER_COLUMN_WIDTH = 48;

function TimelineMarker({
  index,
  isDark,
}: {
  index: number;
  isDark: boolean;
}) {
  return (
    <View style={[styles.markerBase, isDark && styles.markerDark]}>
      <ThemedText style={styles.markerText}>{index + 1}</ThemedText>
    </View>
  );
}

export function TripTimelineSection({
  items,
  isEditing = false,
  onRemoveItem,
  removingItemId = null,
  variant = 'default',
}: TripTimelineSectionProps) {
  const isDark = useColorScheme() === 'dark';
  const isSheet = variant === 'sheet';

  return (
    <View style={[styles.timeline, isSheet ? styles.timelineSheet : null]}>
      {!isSheet && (
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Itinerary</ThemedText>
          <View style={styles.sectionMeta}>
            <MapTrifold size={18} color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray} weight="bold" />
            <ThemedText style={styles.sectionMetaText}>{items.length} Places</ThemedText>
          </View>
        </View>
      )}

      <View style={styles.listContainer}>
        {items.map((item, index) => {
          const { experience } = item;
          const isLast = index === items.length - 1;
          const isRemoving = removingItemId === item._id;

          const content = (
            <View style={styles.mainRow}>
              <View style={styles.markerCell}>
                <TimelineMarker index={index} isDark={isDark} />
                {!isLast && <View style={[styles.connectorLine, isDark && styles.connectorLineDark]} />}
              </View>

              <View style={[styles.card, isDark && styles.cardDark]}>
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.dayBadge}>
                        <ThemedText style={styles.dayBadgeText}>Day {index + 1}</ThemedText>
                      </View>
                      {isEditing ? (
                        <Pressable
                          accessibilityLabel={`Remove ${experience.title} from itinerary`}
                          disabled={isRemoving}
                          onPress={() => onRemoveItem?.(item._id)}
                          style={[styles.removeButton, isDark && styles.removeButtonDark, isRemoving && styles.removeButtonDisabled]}>
                          <X size={14} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />
                        </Pressable>
                      ) : null}
                    </View>
                    
                    <ThemedText style={[styles.title, isDark && styles.titleDark]} numberOfLines={2}>
                      {experience.title}
                    </ThemedText>
                    
                    <ThemedText style={[styles.description, isDark && styles.descriptionDark]} numberOfLines={2}>
                      {experience.description}
                    </ThemedText>

                    <View style={styles.tagRow}>
                      {experience.category && (
                        <View style={[styles.tag, isDark && styles.tagDark]}>
                          <ThemedText style={styles.tagText}>{experience.category}</ThemedText>
                        </View>
                      )}
                      {experience.durationLabel && (
                        <View style={[styles.tag, isDark && styles.tagDark]}>
                          <ThemedText style={styles.tagText}>{experience.durationLabel}</ThemedText>
                        </View>
                      )}
                    </View>
                  </View>

                  {experience.imageUri && (
                    <View style={styles.imageContainer}>
                      <Image source={experience.imageUri} style={styles.image} contentFit="cover" />
                    </View>
                  )}
                </View>
              </View>
            </View>
          );

          if (isEditing) {
            return (
              <View key={item._id} style={styles.item}>
                {content}
              </View>
            );
          }

          return (
            <Link key={item._id} href={{ pathname: '/explore/[slug]', params: { slug: experience.slug } }} asChild>
              <Pressable style={styles.item}>{content}</Pressable>
            </Link>
          );
        })}

        <View style={[styles.optimizedNote, isDark && styles.optimizedNoteDark]}>
          <ThemedText style={[styles.optimizedNoteText, isDark && styles.optimizedNoteTextDark]}>
            Your route is optimized for efficiency, helping you spend less time driving and more time at each stop.
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    paddingVertical: 0,
  },
  timelineSheet: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...designSystem.type.subtitle,
    fontSize: 28, // Overriding subtitle slightly for this specific header
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionMetaText: {
    ...designSystem.type.bodyStrong,
    fontSize: 15,
    color: designSystem.colors.gray,
  },
  listContainer: {
    gap: 12,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  markerCell: {
    width: MARKER_COLUMN_WIDTH,
    alignItems: 'center',
    position: 'relative',
  },
  markerBase: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: designSystem.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  markerDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderWidth: 1,
    borderColor: designSystem.colors.darkBorder,
  },
  markerText: {
    color: '#fff',
    ...designSystem.type.bodyStrong,
    fontSize: 14,
  },
  connectorLine: {
    position: 'absolute',
    top: MARKER_SIZE,
    bottom: -24,
    width: 2,
    backgroundColor: 'rgba(14,15,12,0.08)',
    zIndex: 1,
  },
  connectorLineDark: {
    backgroundColor: 'rgba(249,249,246,0.14)',
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorder,
    borderWidth: 1,
    shadowOpacity: 0.2,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 16,
  },
  cardLeft: {
    flex: 1,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dayBadge: {
    backgroundColor: 'rgba(14,15,12,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  dayBadgeText: {
    ...designSystem.type.eyebrow,
    fontSize: 10,
    color: designSystem.colors.gray,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,15,12,0.06)',
  },
  removeButtonDark: {
    backgroundColor: 'rgba(249,249,246,0.08)',
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  title: {
    ...designSystem.type.cardTitle,
    color: designSystem.colors.ink,
  },
  titleDark: {
    color: designSystem.colors.darkText,
  },
  description: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.gray,
  },
  descriptionDark: {
    color: designSystem.colors.darkMutedText,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagDark: {
    backgroundColor: 'rgba(249,249,246,0.08)',
  },
  tagText: {
    ...designSystem.type.eyebrow,
    fontSize: 10,
    color: designSystem.colors.gray,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
