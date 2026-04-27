import { ChatCircleDots, Compass, UsersThree } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import type { FriendCircleSummary } from '@/types/friends';

export function FriendCircleBanner({
  circle,
  ctaLabel = 'Open chat',
  onPress,
}: {
  circle: FriendCircleSummary;
  ctaLabel?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Compass color={designSystem.colors.darkGreen} size={16} weight="bold" />
          <ThemedText style={styles.badgeText}>{circle.heroLabel}</ThemedText>
        </View>
        <TravelerAvatarStack avatars={circle.avatarUris} totalCount={circle.memberCount} />
      </View>

      <View style={styles.copy}>
        <ThemedText style={styles.title}>{circle.name}</ThemedText>
        <ThemedText style={styles.subtitle}>{circle.destinationLabel}</ThemedText>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <UsersThree color={designSystem.colors.warmDark} size={16} weight="bold" />
          <ThemedText style={styles.metricText}>{circle.memberCount} active</ThemedText>
        </View>
        <View style={styles.metric}>
          <ChatCircleDots color={designSystem.colors.warmDark} size={16} weight="bold" />
          <ThemedText style={styles.metricText} numberOfLines={1}>
            {circle.latestMessagePreview ?? 'Fresh updates waiting'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.ctaText}>{ctaLabel}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: designSystem.spacing.md,
    borderRadius: designSystem.radii.section,
    padding: designSystem.spacing.xl,
    backgroundColor: designSystem.colors.mint,
    shadowColor: 'rgba(14,15,12,0.12)',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  badgeText: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  copy: {
    gap: 4,
  },
  title: {
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -1.1,
    color: designSystem.colors.ink,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.warmDark,
  },
  metrics: {
    gap: 10,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  footer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.ink,
  },
  ctaText: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.background,
  },
});
