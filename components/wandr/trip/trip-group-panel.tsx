import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TripGroupDetails } from '@/types/trip';

export function TripGroupPanel({
  group,
  onOpenChat,
}: {
  group: TripGroupDetails;
  onOpenChat: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const avatars = group.members
    .filter((member) => member.status === 'active')
    .map((member) => member.avatarUri)
    .filter(Boolean) as string[];
  const firstActiveMember = group.members.find((member) => member.status === 'active');

  return (
    <View style={[styles.wrap, isDark ? styles.wrapDark : null]}>
      <View style={styles.head}>
        <View style={styles.copy}>
          <ThemedText style={styles.title}>{group.name}</ThemedText>
        </View>
        <TravelerAvatarStack
          avatars={avatars}
          fallbackName={firstActiveMember?.name ?? group.name}
          fallbackPaletteKey={firstActiveMember?.travelerSlug ?? group.circleId}
          totalCount={group.memberCount}
        />
      </View>

      <View style={styles.inlineRow}>
        <ThemedText style={styles.subtitle}>
          {group.memberCount} active in {group.destinationLabel}
        </ThemedText>
        <Pressable accessibilityLabel="Open group chat" onPress={onOpenChat} hitSlop={8}>
          <ThemedText style={[styles.actionText, isDark ? styles.actionTextDark : null]}>Open chat</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: designSystem.spacing.sm,
    paddingHorizontal: designSystem.layout.cardPadding,
    paddingVertical: designSystem.spacing.md,
    borderRadius: designSystem.radii.panel,
    backgroundColor: designSystem.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderSoft,
  },
  wrapDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  copy: {
    flex: 1,
    gap: 0,
  },
  title: {
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  subtitle: {
    flex: 1,
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionText: {
    ...designSystem.type.label,
    color: designSystem.colors.darkGreen,
  },
  actionTextDark: {
    color: designSystem.colors.lime,
  },
});
