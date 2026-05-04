import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from 'react-native-elements';
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
              {member.avatarUri ? (
                <Avatar rounded size={48} source={{ uri: member.avatarUri }} containerStyle={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <ThemedText style={styles.avatarFallbackText}>{getInitials(member.name || member.travelerSlug)}</ThemedText>
                </View>
              )}
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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'W';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
  },
  avatarFallbackText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
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
