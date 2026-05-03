import { ChatCircleDots } from 'phosphor-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FriendCircleSummary } from '@/types/friends';

const CARD_PADDING = designSystem.layout.cardPadding;
const ROW_GAP = designSystem.spacing.sm;
const COLUMN_GAP = designSystem.spacing.sm;
const STATUS_ICON_SIZE = 22;
const ACTION_HEIGHT = 32;

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
  const isDark = useColorScheme() === 'dark';
  const shellStyle = {
    backgroundColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised,
    borderColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft,
  };

  return (
    <Pressable accessibilityLabel={ctaLabel} onPress={onPress} style={[styles.wrap, shellStyle, style]}>
      <View style={styles.head}>
        <View style={styles.copy}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {circle.name}
          </ThemedText>
        </View>
        <TravelerAvatarStack avatars={circle.avatarUris} totalCount={circle.memberCount} />
      </View>

      <View style={styles.inlineRow}>
        <View style={styles.update}>
          <View style={[styles.iconWrap, isDark ? styles.iconWrapDark : null]}>
            <ChatCircleDots
              color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen}
              size={14}
              weight="bold"
            />
          </View>
          <ThemedText style={styles.updateText} numberOfLines={2}>
            {circle.latestMessagePreview ?? 'Fresh updates waiting'}
          </ThemedText>
        </View>

        {secondaryLabel ? (
          <Pressable onPress={onSecondaryPress} hitSlop={8} style={styles.secondaryAction}>
            <ThemedText style={styles.secondaryCta}>{secondaryLabel}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
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
    gap: ROW_GAP,
    paddingHorizontal: CARD_PADDING,
    paddingVertical: designSystem.spacing.md,
    borderRadius: designSystem.radii.panel,
    borderWidth: StyleSheet.hairlineWidth,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: 76,
    height: 34,
    borderRadius: 17,
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
  iconWrapDark: {
    backgroundColor: designSystem.colors.whiteOverlayBarely,
  },
  updateText: {
    flex: 1,
    ...designSystem.type.bodySmall,
    color: designSystem.colors.warmDark,
  },
  updateTextSkeleton: {
    flex: 1,
    height: 18,
    borderRadius: 8,
  },
  secondaryAction: {
    height: ACTION_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing.xxs,
    flexShrink: 0,
  },
  secondaryCta: {
    ...designSystem.type.label,
    color: designSystem.colors.gray,
  },
});
