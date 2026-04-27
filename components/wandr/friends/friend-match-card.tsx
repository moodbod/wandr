import { Image as ExpoImage } from 'expo-image';
import { Clock, MapPin, UserPlus, X } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import type { FriendCandidate } from '@/types/friends';

function ActionButton({
  label,
  onPress,
  tone = 'neutral',
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'primary' | 'soft';
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const backgroundColor =
    tone === 'primary'
      ? designSystem.colors.lime
      : tone === 'soft'
        ? 'rgba(159,232,112,0.14)'
        : 'rgba(14,15,12,0.06)';

  const textColor = tone === 'neutral' ? designSystem.colors.ink : designSystem.colors.darkGreen;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor }, disabled ? styles.actionButtonDisabled : null]}>
      {icon}
      <ThemedText style={[styles.actionButtonText, { color: textColor }]}>{label}</ThemedText>
    </Pressable>
  );
}

export function FriendMatchCard({
  candidate,
  onInvite,
  onPass,
  onFriend,
  disabled = false,
}: {
  candidate: FriendCandidate;
  onInvite: () => void;
  onPass: () => void;
  onFriend: () => void;
  disabled?: boolean;
}) {
  const stateLabel =
    candidate.actionState === 'invited'
      ? 'Invited'
      : candidate.actionState === 'friended'
        ? 'Friend added'
        : candidate.actionState === 'passed'
          ? 'Passed'
          : `${candidate.matchScore}% match`;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.identityRow}>
          {candidate.avatarUri ? <ExpoImage source={candidate.avatarUri} style={styles.avatar} contentFit="cover" /> : null}
          <View style={styles.identityCopy}>
            <ThemedText style={styles.name}>{candidate.name}</ThemedText>
            <ThemedText style={styles.location}>{candidate.baseLabel}</ThemedText>
          </View>
        </View>
        <View style={styles.matchBadge}>
          <ThemedText style={styles.matchBadgeText}>{stateLabel}</ThemedText>
        </View>
      </View>

      <View style={styles.copyBlock}>
        <ThemedText style={styles.headline}>{candidate.headline}</ThemedText>
        <ThemedText style={styles.bio}>{candidate.bio}</ThemedText>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MapPin color={designSystem.colors.gray} size={14} weight="bold" />
          <ThemedText style={styles.metaText}>{candidate.destinationLabel}</ThemedText>
        </View>
        <View style={styles.metaItem}>
          <Clock color={designSystem.colors.gray} size={14} weight="bold" />
          <ThemedText style={styles.metaText}>{candidate.arrivalWindowLabel}</ThemedText>
        </View>
      </View>

      <View style={styles.interestWrap}>
        {candidate.sharedInterests.slice(0, 3).map((interest) => (
          <View key={`${candidate.travelerSlug}-${interest}`} style={styles.interestChip}>
            <ThemedText style={styles.interestText}>{interest}</ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <ActionButton
          label={candidate.actionState === 'passed' ? 'Passed' : 'Pass'}
          onPress={onPass}
          disabled={disabled || candidate.actionState === 'passed'}
          icon={<X color={designSystem.colors.ink} size={16} weight="bold" />}
        />
        <ActionButton
          label={candidate.actionState === 'friended' ? 'Friend added' : 'Add friend'}
          onPress={onFriend}
          tone="soft"
          disabled={disabled || candidate.actionState === 'friended'}
          icon={<UserPlus color={designSystem.colors.darkGreen} size={16} weight="bold" />}
        />
        <ActionButton
          label={candidate.actionState === 'invited' ? 'Invited' : 'Invite'}
          onPress={onInvite}
          tone="primary"
          disabled={disabled || candidate.actionState === 'invited'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: designSystem.spacing.md,
    borderRadius: 32,
    padding: designSystem.spacing.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.06)',
    shadowColor: 'rgba(14,15,12,0.08)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
  },
  identityRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: designSystem.colors.surface,
  },
  identityCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  location: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  matchBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'rgba(159,232,112,0.18)',
  },
  matchBadgeText: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  copyBlock: {
    gap: 6,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.warmDark,
  },
  metaRow: {
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  interestWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.surface,
  },
  interestText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: designSystem.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
