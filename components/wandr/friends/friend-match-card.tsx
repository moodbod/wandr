import { X } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
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
  const primaryLabel = hasInvited ? 'Requested' : hasFriended ? 'Invite' : 'Friend';
  const primaryAction = hasFriended ? onInvite : onFriend;
  const primaryDisabled = disabled || hasInvited || hasPassed;

  return (
    <View style={[styles.row, hasPassed ? styles.rowMuted : null]}>
      <Pressable
        accessibilityLabel={`View ${candidate.name}'s profile`}
        disabled={!onOpenProfile}
        onPress={onOpenProfile}
        style={styles.avatarButton}>
        <FaceHashAvatar name={candidate.travelerSlug ?? candidate.name} size={60} uri={candidate.avatarUri} style={styles.avatar} />
      </Pressable>

      <View style={styles.identity}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {candidate.name}
        </ThemedText>
        <View style={styles.metaRow}>
          <ThemedText style={styles.contextText} numberOfLines={1}>
            {candidate.baseLabel}
          </ThemedText>
          <ThemedText style={[styles.matchText, { color: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen }]}>
            {candidate.matchScore}% match
          </ThemedText>
        </View>
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

export function FriendMatchCardSkeleton() {
  return (
    <View style={styles.row}>
      <SkeletonBlock style={styles.avatar} />
      <View style={styles.identity}>
        <SkeletonBlock style={styles.nameSkeleton} />
        <View style={styles.metaRow}>
          <SkeletonBlock style={styles.contextSkeleton} />
          <SkeletonBlock style={styles.matchSkeleton} />
        </View>
      </View>
      <View style={styles.actions}>
        <SkeletonBlock style={styles.primaryActionSkeleton} />
        <SkeletonBlock style={styles.removeActionSkeleton} />
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  name: {
    minWidth: 0,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  matchText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  contextText: {
    maxWidth: '100%',
    fontSize: 14,
    lineHeight: 17,
    color: designSystem.colors.warmDark,
  },
  nameSkeleton: {
    width: 108,
    height: 20,
    borderRadius: 8,
  },
  matchSkeleton: {
    width: 62,
    height: 15,
    borderRadius: 8,
  },
  contextSkeleton: {
    width: '72%',
    height: 17,
    borderRadius: 8,
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
  primaryActionSkeleton: {
    width: 78,
    height: 36,
    borderRadius: 14,
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
  removeActionSkeleton: {
    width: 24,
    height: 36,
    borderRadius: 12,
  },
  actionDisabled: {
    opacity: 0.48,
  },
});
