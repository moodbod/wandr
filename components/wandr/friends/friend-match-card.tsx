import { Image as ExpoImage } from 'expo-image';
import { X } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FriendCandidate } from '@/types/friends';

export function FriendMatchCard({
  candidate,
  onInvite,
  onPass,
  onFriend,
  onOpenProfile,
  disabled = false,
}: {
  candidate: FriendCandidate;
  onInvite: () => void;
  onPass: () => void;
  onFriend: () => void;
  onOpenProfile?: () => void;
  disabled?: boolean;
}) {
  const isDark = useColorScheme() === 'dark';
  const hasPassed = candidate.actionState === 'passed';
  const hasFriended = candidate.actionState === 'friended';
  const hasInvited = candidate.actionState === 'invited';
  const primaryLabel = hasInvited ? 'Invited' : hasFriended ? 'Invite' : 'Friend';
  const primaryAction = hasFriended ? onInvite : onFriend;
  const primaryDisabled = disabled || hasInvited || hasPassed;

  return (
    <View style={[styles.row, hasPassed ? styles.rowMuted : null]}>
      <Pressable
        accessibilityLabel={`View ${candidate.name}'s profile`}
        disabled={!onOpenProfile}
        onPress={onOpenProfile}
        style={styles.avatarButton}>
        {candidate.avatarUri ? (
          <ExpoImage source={candidate.avatarUri} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
      </Pressable>

      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {candidate.name}
          </ThemedText>
          <ThemedText style={[styles.matchText, { color: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen }]}>
            {candidate.matchScore}% match
          </ThemedText>
        </View>
        <ThemedText style={styles.contextText} numberOfLines={1}>
          {candidate.baseLabel}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`${primaryLabel} ${candidate.name}`}
          disabled={primaryDisabled}
          onPress={primaryAction}
          style={[styles.primaryAction, primaryDisabled ? styles.actionDisabled : null]}>
          <ThemedText style={styles.primaryActionText}>{primaryLabel}</ThemedText>
        </Pressable>

        <Pressable
          accessibilityLabel={hasPassed ? `${candidate.name} removed` : `Remove ${candidate.name}`}
          disabled={disabled || hasPassed}
          onPress={onPass}
          style={[styles.removeAction, disabled || hasPassed ? styles.actionDisabled : null]}>
          <X color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray} size={17} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 13,
  },
  rowMuted: {
    opacity: 0.42,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 5,
    paddingTop: 1,
  },
  avatarButton: {
    borderRadius: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: designSystem.colors.surface,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  name: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  matchText: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  contextText: {
    fontSize: 14,
    lineHeight: 17,
    color: designSystem.colors.warmDark,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingTop: 8,
  },
  primaryAction: {
    minWidth: 78,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: designSystem.colors.lime,
  },
  primaryActionText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  removeAction: {
    width: 24,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionDisabled: {
    opacity: 0.48,
  },
});
