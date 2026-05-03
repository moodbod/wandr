import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { MapPin, MapTrifold, X } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripDashboardItem } from '@/types/trip';

import { TripTimelineSkeleton } from './trip-skeletons';

type TripTimelineSectionProps = {
  items?: readonly TripDashboardItem[];
  variant?: 'default' | 'sheet';
  isEditing?: boolean;
  isLoading?: boolean;
  onRemoveItem?: (itemId: string) => void;
  removingItemId?: string | null;
};

const MARKER_SIZE = 32;
const MARKER_COLUMN_WIDTH = 48;

function getStayNightsLabel(checkIn?: number, checkOut?: number) {
  if (!checkIn || !checkOut) {
    return null;
  }

  const nights = Math.max(1, Math.round((checkOut - checkIn) / 86_400_000));
  return `${nights} night${nights === 1 ? '' : 's'}`;
}

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

function buildStayContextLine(locationLabel?: string) {
  return locationLabel ?? null;
}

export function TripTimelineSection({
  items = [],
  variant = 'default',
  isEditing = false,
  isLoading = false,
  onRemoveItem,
  removingItemId = null,
}: TripTimelineSectionProps) {
  const isDark = useColorScheme() === 'dark';
  const isSheet = variant === 'sheet';

  if (isLoading) {
    return <TripTimelineSkeleton />;
  }

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
          const isStay = item.kind === 'stay' && Boolean(item.stay);
          const isLast = index === items.length - 1;
          const stayNights = getStayNightsLabel(item.checkIn, item.checkOut);
          const stayContextLine = buildStayContextLine(item.stay?.town ?? experience.locationLabel);
          const title = isStay ? item.stay?.name ?? experience.title : experience.title;
          const imageUri = isStay ? item.stay?.imageUri ?? experience.imageUri : experience.imageUri;
          const primaryTag = isStay ? item.stay?.town ?? experience.locationLabel : experience.category;
          const secondaryTag = isStay ? stayNights : experience.durationLabel;
          const href = isStay
            ? ({ pathname: '/stays/details', params: { slug: item.experienceSlug } } as const)
            : ({ pathname: '/explore/[slug]', params: { slug: experience.slug } } as const);

          const itemContent = (
            <Pressable style={[styles.item, isEditing && styles.itemEditing]} disabled={isEditing}>
              <View style={styles.mainRow}>
                <View style={styles.markerCell}>
                  <TimelineMarker index={index} isDark={isDark} />
                  {!isLast && <View style={[styles.connectorLine, isDark && styles.connectorLineDark]} />}
                </View>

                <View style={styles.card}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardLeft}>
                      <ThemedText style={[styles.title, isDark && styles.titleDark]} numberOfLines={2}>
                        {title}
                      </ThemedText>

                      {isStay ? (
                        stayContextLine ? (
                          <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                              <MapPin size={12} color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray} weight="fill" />
                              <ThemedText style={[styles.metaText, isDark && styles.metaTextDark]} numberOfLines={1}>
                                {stayContextLine}
                              </ThemedText>
                            </View>
                          </View>
                        ) : null
                      ) : (
                        <View style={styles.metaRow}>
                          {primaryTag ? (
                            <View style={styles.metaItem}>
                              <MapPin size={12} color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray} weight="fill" />
                              <ThemedText style={[styles.metaText, isDark && styles.metaTextDark]} numberOfLines={1}>
                                {primaryTag}
                              </ThemedText>
                            </View>
                          ) : null}
                          {secondaryTag ? (
                            <View style={styles.metaItem}>
                              <ThemedText style={[styles.metaDot, isDark && styles.metaDotDark]}>•</ThemedText>
                              <ThemedText style={[styles.metaText, isDark && styles.metaTextDark]} numberOfLines={1}>
                                {secondaryTag}
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </View>

                    {imageUri && (
                      <View style={styles.imageContainer}>
                        <Image source={imageUri} style={styles.image} contentFit="cover" />
                      </View>
                    )}

                    {isEditing ? (
                      <Pressable
                        accessibilityLabel={`Remove ${title} from trip`}
                        disabled={!onRemoveItem || removingItemId === item._id}
                        onPress={() => onRemoveItem?.(item._id)}
                        style={[styles.removeButton, isDark && styles.removeButtonDark, removingItemId === item._id && styles.removeButtonDisabled]}>
                        <X
                          size={16}
                          color={isDark ? designSystem.colors.darkText : designSystem.colors.ink}
                          weight="bold"
                        />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            </Pressable>
          );

          if (isEditing) {
            return <View key={item._id}>{itemContent}</View>;
          }

          return (
            <Link key={item._id} href={href} asChild>
              {itemContent}
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    paddingVertical: 4,
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
  item: {
    marginBottom: 12,
  },
  itemEditing: {
    opacity: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  markerCell: {
    width: MARKER_COLUMN_WIDTH,
    alignItems: 'center',
    position: 'relative',
    paddingTop: 6,
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
    color: designSystem.colors.white,
    ...designSystem.type.bodyStrong,
    fontSize: 14,
  },
  connectorLine: {
    position: 'absolute',
    top: MARKER_SIZE,
    bottom: -24,
    width: 2,
    backgroundColor: designSystem.colors.borderSoft,
    zIndex: 1,
  },
  connectorLineDark: {
    backgroundColor: designSystem.colors.lightGlassSoft,
  },
  card: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 14,
    paddingLeft: 8,
    paddingRight: 4,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 8,
    minWidth: 0,
  },
  title: {
    ...designSystem.type.cardTitle,
    color: designSystem.colors.ink,
  },
  titleDark: {
    color: designSystem.colors.darkText,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...designSystem.type.eyebrow,
    fontSize: 11,
    color: designSystem.colors.gray,
  },
  metaTextDark: {
    color: designSystem.colors.darkMutedText,
  },
  metaDot: {
    ...designSystem.type.eyebrow,
    fontSize: 11,
    color: designSystem.colors.gray,
  },
  metaDotDark: {
    color: designSystem.colors.darkMutedText,
  },
  imageContainer: {
    width: 96,
    height: 96,
    borderRadius: 18,
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lightGlassStrong,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  removeButtonDark: {
    backgroundColor: designSystem.colors.darkGlassStrong,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
});
