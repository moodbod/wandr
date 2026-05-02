import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';

export function VoiceCallStage({ memberAvatars, title }: { memberAvatars: string[]; title: string }) {
  return (
    <View style={styles.voiceStage}>
      {memberAvatars.length > 0 ? (
        <View style={styles.largeAvatarStack}>
          <TravelerAvatarStack avatars={memberAvatars.slice(0, 6)} totalCount={memberAvatars.length} />
        </View>
      ) : (
        <View style={styles.largeInitialAvatar}>
          <ThemedText style={styles.largeInitial}>{title.charAt(0).toUpperCase()}</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  voiceStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 118,
  },
  largeAvatarStack: {
    width: 242,
    height: 242,
    borderRadius: 121,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f2f4',
  },
  largeInitialAvatar: {
    width: 242,
    height: 242,
    borderRadius: 121,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f2f4',
  },
  largeInitial: {
    fontSize: 128,
    lineHeight: 138,
    fontWeight: '900',
    color: '#171717',
  },
});
