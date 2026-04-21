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
  const visibleCount = Math.max(0, Math.min(initials.length, Math.max(0, positiveCount - 1), 2));

  return (
    <View style={[styles.stack, { paddingRight: overlap + 8 }]}>
      {visibleCount > 0 ? (
        <View style={[styles.avatar, styles.avatarFront, { borderColor }]}>
          <ThemedText style={styles.avatarInitial}>{initials[0]}</ThemedText>
        </View>
      ) : null}

      {visibleCount > 1 ? (
        <View style={[styles.avatar, styles.avatarSecond, { borderColor, marginLeft: -overlap }]}>
          <ThemedText style={styles.avatarInitial}>{initials[1]}</ThemedText>
        </View>
      ) : null}

      <View
        style={[
          styles.countAvatar,
          { borderColor, marginLeft: visibleCount > 0 ? -overlap : 0 },
        ]}>
        <ThemedText style={styles.countText}>+{positiveCount}</ThemedText>
      </View>
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
    fontWeight: '900',
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
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
});
