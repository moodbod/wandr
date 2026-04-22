import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type WandrTravelerGroupProps = {
  count: number;
  overlap?: number;
  borderColor?: string;
  initials?: readonly string[];
};

export function WandrTravelerGroup({
  count,
  overlap = 12,
  borderColor = designSystem.colors.surface,
  initials = ['L', 'J'],
}: WandrTravelerGroupProps) {
  const positiveCount = Math.max(0, count);
  // Show at most 2 initials, but only if we have enough count
  const avatarsToShow = Math.min(positiveCount, 2);
  const remainingCount = positiveCount - avatarsToShow;

  return (
    <View style={styles.stack}>
      {avatarsToShow > 0 ? (
        <View style={[styles.avatar, styles.avatarFront, { borderColor }]}>
          <ThemedText style={styles.avatarInitial}>{initials[0]}</ThemedText>
        </View>
      ) : null}

      {avatarsToShow > 1 ? (
        <View style={[styles.avatar, styles.avatarSecond, { borderColor, marginLeft: -overlap }]}>
          <ThemedText style={styles.avatarInitial}>{initials[1]}</ThemedText>
        </View>
      ) : null}

      {remainingCount > 0 ? (
        <View
          style={[
            styles.countAvatar,
            { borderColor, marginLeft: -overlap },
          ]}>
          <ThemedText style={styles.countText}>+{remainingCount}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11130f',
  },
  avatarFront: {
    zIndex: 3,
  },
  avatarSecond: {
    zIndex: 2,
    backgroundColor: '#2a3322',
  },
  avatarInitial: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '700',
    color: '#f9f9f6',
  },
  countAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    zIndex: 1,
  },
  countText: {
    fontSize: 13,
    lineHeight: 13,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
});
