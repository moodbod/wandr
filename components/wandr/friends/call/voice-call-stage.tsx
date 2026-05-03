import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { designSystem } from '@/constants/design-system';
import type { FriendCircleMember } from '@/types/friends';

export function VoiceCallStage({ members, title }: { members: FriendCircleMember[]; title: string }) {
  const visibleMembers = members.slice(0, 3);
  const remainingCount = Math.max(0, members.length - visibleMembers.length);

  return (
    <View style={styles.voiceStage}>
      <View style={styles.avatarCluster}>
        {visibleMembers.length > 0 ? (
          visibleMembers.map((member, index) => (
            <View
              key={member.travelerSlug}
              style={[
                styles.avatarShell,
                {
                  marginLeft: index === 0 ? 0 : -16,
                  zIndex: 10 - index,
                },
              ]}>
              <FaceHashAvatar name={member.name || member.travelerSlug} size={48} uri={member.avatarUri} style={styles.avatarImage} />
            </View>
          ))
        ) : (
          <View style={styles.initialAvatar}>
            <ThemedText style={styles.initialText}>{title.charAt(0).toUpperCase()}</ThemedText>
          </View>
        )}
        {remainingCount > 0 ? (
          <View style={[styles.avatarShell, styles.moreAvatar]}>
            <ThemedText style={styles.moreText}>+{remainingCount}</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  voiceStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 88,
  },
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarShell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(249,249,246,0.9)',
    backgroundColor: designSystem.colors.darkSurface,
  },
  avatarImage: {},
  initialAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    borderWidth: 2,
    borderColor: 'rgba(249,249,246,0.92)',
  },
  initialText: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  moreAvatar: {
    marginLeft: -16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,249,246,0.12)',
  },
  moreText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
});
