import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { CheckCircle, NavigationArrow } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WandrTravelerGroup } from '@/components/wandr/traveler-group';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripDashboardItem } from '@/types/trip';

type TripTimelineSectionProps = {
  items: readonly TripDashboardItem[];
  variant?: 'default' | 'sheet';
};

const MARKER_SIZE = 48;
const MARKER_COLUMN_WIDTH = 56;
const ACTIVE_MEDIA_RADIUS = 24;

type TimelineTone = {
  markerKind: 'active' | 'completed' | 'upcoming';
};

function getTimelineTone(status: TripDashboardItem['status']): TimelineTone {
  switch (status) {
    case 'active':
      return { markerKind: 'active' };
    case 'completed':
      return { markerKind: 'completed' };
    case 'upcoming':
      return { markerKind: 'upcoming' };
  }
}

function TimelineMarker({
  kind,
  isDark,
}: {
  kind: TimelineTone['markerKind'];
  isDark: boolean;
}) {
  if (kind === 'active') {
    return (
      <View style={[styles.markerBase, styles.markerActive, isDark && styles.markerActiveDark]}>
        <NavigationArrow color={designSystem.colors.darkGreen} size={18} weight="fill" />
      </View>
    );
  }

  if (kind === 'completed') {
    return (
      <View style={[styles.markerBase, styles.markerCompleted, isDark && styles.markerCompletedDark]}>
        <CheckCircle
          color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.warmDark}
          size={18}
          weight="fill"
        />
      </View>
    );
  }

  return (
    <View style={[styles.markerBase, styles.markerUpcoming, isDark && styles.markerUpcomingDark]}>
      <View style={[styles.markerUpcomingDot, isDark && styles.markerUpcomingDotDark]} />
    </View>
  );
}

export function TripTimelineSection({ items, variant = 'default' }: TripTimelineSectionProps) {
  const isDark = useColorScheme() === 'dark';
  const isSheet = variant === 'sheet';

  return (
    <View style={[styles.timeline, isSheet ? styles.timelineSheet : null]}>
      {items.map((item, index) => {
        const { experience, status } = item;
        const tone = getTimelineTone(status);
        const isActive = status === 'active';
        const isLast = index === items.length - 1;
        const squadCount = Math.max(1, Math.min(2, experience.travelerMomentum?.visitorCount ?? 1));

        return (
          <Link key={item._id} href={{ pathname: '/explore/[slug]', params: { slug: experience.slug } }} asChild>
            <Pressable style={[styles.item, isSheet ? styles.itemSheet : null]}>
              <View style={[styles.mainRow, isSheet ? styles.rowSheet : null]}>
                <View style={styles.markerCell}>
                  <TimelineMarker kind={tone.markerKind} isDark={isDark} />

                  {!isLast ? (
                    <View style={styles.rowConnectorSlot}>
                      <View style={[styles.connectorLine, isDark && styles.connectorLineDark]} />
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.card,
                    isDark && styles.cardDark,
                    isActive ? styles.cardActive : styles.cardInactive,
                    isActive && isDark ? styles.cardActiveDark : null,
                    !isActive && isDark ? styles.cardInactiveDark : null,
                    isSheet ? styles.cardSheet : null,
                  ]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerCopy}>
                      <ThemedText
                        style={[
                          styles.title,
                          isDark && styles.titleDark,
                          isActive ? styles.titleActive : null,
                          isActive && isDark ? styles.titleActiveDark : null,
                        ]}>
                        {experience.title}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.location,
                          isDark && styles.locationDark,
                          isActive ? styles.locationActive : null,
                          isActive && isDark ? styles.locationActiveDark : null,
                        ]}>
                        {experience.locationLabel || 'Swakopmund'}
                      </ThemedText>
                    </View>
                  </View>

                  {isActive ? (
                    <>
                      <ThemedText
                        style={[
                          styles.description,
                          isDark && styles.descriptionDark,
                          isActive ? styles.descriptionActive : null,
                          isActive && isDark ? styles.descriptionActiveDark : null,
                        ]}>
                        {experience.description}
                      </ThemedText>

                      {experience.imageUri ? (
                        <View style={styles.mediaFrame}>
                          <Image source={experience.imageUri} style={styles.media} contentFit="cover" />
                        </View>
                      ) : null}

                      <View style={styles.metaRow}>
                        <View style={styles.metaGroup}>
                          <WandrTravelerGroup
                            count={squadCount}
                            borderColor={isActive ? designSystem.colors.mint : designSystem.colors.surface}
                          />
                          <ThemedText
                            style={[
                              styles.metaText,
                              isDark && styles.metaTextDark,
                              isActive ? styles.metaTextActive : null,
                              isActive && isDark ? styles.metaTextActiveDark : null,
                            ]}>
                            Squad is here
                          </ThemedText>
                        </View>

                        {experience.durationLabel ? (
                          <ThemedText
                            style={[
                              styles.metaTag,
                              isDark && styles.metaTagDark,
                              isActive ? styles.metaTagActive : null,
                              isActive && isDark ? styles.metaTagActiveDark : null,
                            ]}>
                            {experience.durationLabel}
                          </ThemedText>
                        ) : null}
                      </View>
                    </>
                  ) : (
                    <View style={styles.compactFooter}>
                      {experience.category ? (
                        <ThemedText style={[styles.compactTag, isDark && styles.compactTagDark]}>
                          {experience.category}
                        </ThemedText>
                      ) : null}

                      {experience.durationLabel ? (
                        <ThemedText style={[styles.compactTag, isDark && styles.compactTagDark]}>
                          {experience.durationLabel}
                        </ThemedText>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>

              {!isLast ? (
                <View style={styles.connectorRow}>
                  <View style={styles.markerCell}>
                    <View style={[styles.connectorLine, isDark && styles.connectorLineDark]} />
                  </View>
                  <View style={styles.connectorSpacer} />
                </View>
              ) : null}
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    gap: 18,
    paddingVertical: 4,
  },
  timelineSheet: {
    marginTop: 8,
  },
  item: {
    gap: 0,
  },
  itemSheet: {
    gap: 0,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
  },
  rowSheet: {
    gap: 18,
  },
  markerCell: {
    width: MARKER_COLUMN_WIDTH,
    alignItems: 'center',
    flexShrink: 0,
  },
  rowConnectorSlot: {
    flex: 1,
    width: 4,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  connectorRow: {
    flexDirection: 'row',
    gap: 16,
    height: 18,
  },
  connectorSpacer: {
    flex: 1,
  },
  connectorLine: {
    width: 4,
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(14,15,12,0.08)',
    marginVertical: -2,
  },
  connectorLineDark: {
    backgroundColor: 'rgba(249,249,246,0.14)',
  },
  markerBase: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: designSystem.colors.background,
  },
  markerActive: {
    backgroundColor: designSystem.colors.lime,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  markerActiveDark: {
    borderColor: designSystem.colors.darkBackground,
  },
  markerCompleted: {
    backgroundColor: designSystem.colors.surface,
  },
  markerCompletedDark: {
    borderColor: designSystem.colors.darkBackground,
    backgroundColor: '#20251d',
  },
  markerUpcoming: {
    backgroundColor: '#eef0eb',
  },
  markerUpcomingDark: {
    borderColor: designSystem.colors.darkBackground,
    backgroundColor: '#20251d',
  },
  markerUpcomingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(14,15,12,0.28)',
  },
  markerUpcomingDotDark: {
    backgroundColor: 'rgba(249,249,246,0.38)',
  },
  card: {
    flex: 1,
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
  },
  cardDark: {
    borderColor: designSystem.colors.darkBorder,
  },
  cardInactive: {
    backgroundColor: '#f4f4f1',
    borderColor: 'rgba(14,15,12,0.05)',
  },
  cardInactiveDark: {
    backgroundColor: '#1a1e18',
    borderColor: 'rgba(249,249,246,0.06)',
  },
  cardActive: {
    backgroundColor: designSystem.colors.mint,
    borderColor: 'rgba(159,232,112,0.36)',
    padding: 24,
    borderRadius: 34,
  },
  cardActiveDark: {
    backgroundColor: '#1b2515',
    borderColor: 'rgba(159,232,112,0.22)',
  },
  cardSheet: {
    borderRadius: 32,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  titleDark: {
    color: 'rgba(249,249,246,0.9)',
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.7,
    color: designSystem.colors.ink,
  },
  titleActive: {
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -1,
    color: designSystem.colors.darkGreen,
  },
  titleActiveDark: {
    color: designSystem.colors.lime,
  },
  location: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
  locationDark: {
    color: 'rgba(249,249,246,0.76)',
  },
  locationActive: {
    fontSize: 17,
    lineHeight: 22,
    color: 'rgba(22,51,0,0.7)',
  },
  locationActiveDark: {
    color: 'rgba(249,249,246,0.72)',
  },
  description: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: 'rgba(14,15,12,0.62)',
  },
  descriptionDark: {
    color: 'rgba(249,249,246,0.64)',
  },
  descriptionActive: {
    color: 'rgba(22,51,0,0.74)',
  },
  descriptionActiveDark: {
    color: 'rgba(249,249,246,0.76)',
  },
  mediaFrame: {
    marginTop: 16,
    height: 176,
    borderRadius: ACTIVE_MEDIA_RADIUS,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  metaRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: 'rgba(14,15,12,0.56)',
  },
  metaTextDark: {
    color: 'rgba(249,249,246,0.64)',
  },
  metaTextActive: {
    color: 'rgba(22,51,0,0.68)',
  },
  metaTextActiveDark: {
    color: 'rgba(249,249,246,0.72)',
  },
  metaTag: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: designSystem.colors.darkGreen,
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: designSystem.radii.pill,
  },
  metaTagDark: {
    backgroundColor: 'rgba(249,249,246,0.1)',
    color: 'rgba(249,249,246,0.86)',
  },
  metaTagActive: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  metaTagActiveDark: {
    backgroundColor: 'rgba(159,232,112,0.08)',
  },
  compactFooter: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactTag: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(14,15,12,0.52)',
    backgroundColor: 'rgba(14,15,12,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: designSystem.radii.pill,
  },
  compactTagDark: {
    color: 'rgba(249,249,246,0.7)',
    backgroundColor: 'rgba(249,249,246,0.08)',
  },
});
