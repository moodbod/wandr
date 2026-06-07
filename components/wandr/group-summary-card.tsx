import { ArrowRight, ChatCircleDots, MapPin, UsersThree } from 'phosphor-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TravelerAvatarStack, type TravelerAvatarStackItem } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type GroupSummaryCardProps = {
  accessibilityLabel: string;
  activityLabel?: string | null;
  avatars: readonly (string | TravelerAvatarStackItem)[];
  destinationLabel?: string | null;
  fallbackName: string;
  fallbackPaletteKey?: string | null;
  memberCount: number;
  memberLabel?: string;
  onActionPress?: () => void;
  onPress?: () => void;
  actionLabel?: string;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function GroupSummaryCard({
  accessibilityLabel,
  actionLabel,
  activityLabel,
  avatars,
  destinationLabel,
  fallbackName,
  fallbackPaletteKey,
  memberCount,
  memberLabel,
  onActionPress,
  onPress,
  style,
  title,
}: GroupSummaryCardProps) {
  const isDark = useColorScheme() === 'dark';
  const trimmedDestination = destinationLabel?.trim();
  const trimmedActivity = activityLabel?.trim();
  const resolvedMemberLabel = memberLabel ?? `${memberCount} active`;
  const accentColor = isDark ? designSystem.colors.lime : designSystem.colors.darkGreen;
  const mutedColor = isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray;
  const visibleAvatarCount = Math.min(Math.max(avatars.length || (memberCount > 0 ? 1 : 0), 1), 2);
  const hiddenAvatarCount = Math.max(memberCount - visibleAvatarCount, 0);
  const avatarCapsuleWidth = getAvatarCapsuleWidth(visibleAvatarCount + (hiddenAvatarCount > 0 ? 1 : 0));

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.card,
        isDark ? styles.cardDark : null,
        style,
      ]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <ThemedText numberOfLines={2} style={styles.title}>
            {title}
          </ThemedText>
        </View>

        <View style={[styles.avatarCapsule, { width: avatarCapsuleWidth }, isDark ? styles.avatarCapsuleDark : null]}>
          <TravelerAvatarStack
            avatars={avatars}
            fallbackName={fallbackName}
            fallbackPaletteKey={fallbackPaletteKey}
            maxVisible={2}
            size="compact"
            totalCount={memberCount}
          />
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.metaPill, styles.memberPill, isDark ? styles.metaPillDark : null]}>
          <UsersThree color={accentColor} size={14} weight="bold" />
          <ThemedText numberOfLines={1} style={[styles.metaText, isDark ? styles.metaTextDark : null]}>
            {resolvedMemberLabel}
          </ThemedText>
        </View>

        {trimmedDestination ? (
          <View style={[styles.metaPill, isDark ? styles.metaPillDark : null]}>
            <MapPin color={mutedColor} size={14} weight="fill" />
            <ThemedText numberOfLines={1} style={styles.metaTextMuted}>
              {trimmedDestination}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {trimmedActivity ? (
        <View style={[styles.activityRow, isDark ? styles.activityRowDark : null]}>
          <View style={[styles.activityIcon, isDark ? styles.activityIconDark : null]}>
            <ChatCircleDots color={accentColor} size={15} weight="bold" />
          </View>
          <ThemedText numberOfLines={2} style={styles.activityText}>
            {trimmedActivity}
          </ThemedText>

          {actionLabel ? (
            <Pressable
              accessibilityLabel={actionLabel}
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                onActionPress?.();
              }}
              style={styles.action}>
              <ThemedText numberOfLines={1} style={[styles.actionText, isDark ? styles.actionTextDark : null]}>
                {actionLabel}
              </ThemedText>
              <ArrowRight color={accentColor} size={14} weight="bold" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function getAvatarCapsuleWidth(itemCount: number) {
  const avatarSize = 28;
  const overlap = 12;
  const horizontalPadding = 10;
  const visibleCount = Math.max(itemCount, 1);

  return avatarSize + Math.max(visibleCount - 1, 0) * (avatarSize - overlap) + horizontalPadding;
}

const styles = StyleSheet.create({
  card: {
    gap: designSystem.spacing.sm,
    paddingHorizontal: designSystem.layout.cardPadding,
    paddingVertical: designSystem.spacing.md,
    borderRadius: designSystem.radii.panel,
    backgroundColor: designSystem.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderSoft,
  },
  cardDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  header: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  title: {
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  avatarCapsule: {
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 19,
    backgroundColor: designSystem.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderSoft,
  },
  avatarCapsuleDark: {
    backgroundColor: designSystem.colors.whiteOverlayBarely,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  metaRow: {
    alignItems: 'flex-start',
    gap: designSystem.spacing.xs,
  },
  metaPill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  memberPill: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  metaPillDark: {
    backgroundColor: designSystem.colors.whiteOverlayBarely,
  },
  metaText: {
    ...designSystem.type.label,
    color: designSystem.colors.darkGreen,
  },
  metaTextDark: {
    color: designSystem.colors.lime,
  },
  metaTextMuted: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  activityRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.xs,
    padding: designSystem.spacing.xs,
    paddingRight: designSystem.spacing.sm,
    borderRadius: designSystem.radii.card,
    backgroundColor: designSystem.colors.surface,
  },
  activityRowDark: {
    backgroundColor: designSystem.colors.whiteOverlayBarely,
  },
  activityIcon: {
    width: 28,
    height: 28,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: designSystem.colors.limeSoft,
  },
  activityIconDark: {
    backgroundColor: designSystem.colors.whiteOverlayBarely,
  },
  activityText: {
    flex: 1,
    minWidth: 0,
    ...designSystem.type.bodySmall,
    color: designSystem.colors.warmDark,
  },
  action: {
    minHeight: 30,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingLeft: 6,
  },
  actionText: {
    ...designSystem.type.label,
    color: designSystem.colors.darkGreen,
  },
  actionTextDark: {
    color: designSystem.colors.lime,
  },
});
