import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { GroupSummaryCard } from '@/components/wandr/group-summary-card';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FriendCircleSummary } from '@/types/friends';

const CARD_PADDING = designSystem.layout.cardPadding;
const ROW_GAP = designSystem.spacing.sm;
const COLUMN_GAP = designSystem.spacing.sm;
const STATUS_ICON_SIZE = 28;

export function FriendCircleBanner({
  circle,
  ctaLabel = 'Open chat',
  onPress,
  secondaryLabel,
  onSecondaryPress,
  style,
}: {
  circle: FriendCircleSummary;
  ctaLabel?: string;
  onPress?: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const avatars = circle.members
    .filter((member) => member.status === 'active')
    .map((member) => ({
      name: member.name,
      paletteKey: member.travelerSlug,
      uri: member.avatarUri,
    }));

  return (
    <GroupSummaryCard
      accessibilityLabel={ctaLabel}
      actionLabel={secondaryLabel}
      activityLabel={circle.latestMessagePreview ?? 'Fresh updates waiting'}
      avatars={avatars}
      destinationLabel={circle.destinationLabel}
      fallbackName={circle.name}
      fallbackPaletteKey={circle._id}
      memberCount={circle.memberCount}
      memberLabel={`${circle.memberCount} active`}
      onActionPress={onSecondaryPress}
      onPress={onPress}
      style={style}
      title={circle.name}
    />
  );
}

export function FriendCircleBannerSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const isDark = useColorScheme() === 'dark';
  const shellStyle = {
    backgroundColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised,
    borderColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft,
  };

  return (
    <View style={[styles.wrap, shellStyle, style]}>
      <View style={styles.head}>
        <View style={styles.copy}>
          <SkeletonBlock style={styles.titleSkeleton} />
        </View>
        <SkeletonBlock style={styles.avatarStackSkeleton} />
      </View>

      <View style={styles.metaRow}>
        <SkeletonBlock style={styles.memberMetaSkeleton} />
        <SkeletonBlock style={styles.destinationMetaSkeleton} />
      </View>

      <View style={styles.inlineRow}>
        <View style={styles.update}>
          <SkeletonBlock style={styles.iconWrapSkeleton} />
          <SkeletonBlock style={styles.updateTextSkeleton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: ROW_GAP + 2,
    paddingHorizontal: CARD_PADDING,
    paddingVertical: designSystem.spacing.md,
    borderRadius: designSystem.radii.panel,
    borderWidth: StyleSheet.hairlineWidth,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: COLUMN_GAP,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  titleSkeleton: {
    width: '72%',
    height: 28,
    borderRadius: 10,
  },
  avatarStackSkeleton: {
    width: 70,
    height: 38,
    borderRadius: 19,
  },
  metaRow: {
    alignItems: 'flex-start',
    gap: designSystem.spacing.xs,
  },
  memberMetaSkeleton: {
    width: 82,
    height: 30,
    borderRadius: 15,
  },
  destinationMetaSkeleton: {
    width: 108,
    height: 30,
    borderRadius: 15,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: COLUMN_GAP,
  },
  update: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: STATUS_ICON_SIZE,
    height: STATUS_ICON_SIZE,
    borderRadius: STATUS_ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.limeSoft,
  },
  iconWrapSkeleton: {
    width: STATUS_ICON_SIZE,
    height: STATUS_ICON_SIZE,
    borderRadius: STATUS_ICON_SIZE / 2,
  },
  updateTextSkeleton: {
    flex: 1,
    height: 18,
    borderRadius: 8,
  },
});
