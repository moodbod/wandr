import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type TravelerAvatarStackProps = {
  avatars: readonly string[];
  totalCount: number;
  size?: 'compact' | 'default';
};

export function TravelerAvatarStack({
  avatars,
  totalCount,
  size = 'default',
}: TravelerAvatarStackProps) {
  const visibleAvatars = avatars.slice(0, 2);
  const remainingCount = Math.max(0, totalCount - visibleAvatars.length);
  const avatarSize = size === 'compact' ? 28 : 32;
  const borderRadius = avatarSize / 2;
  const overlap = size === 'compact' ? 12 : 12;

  if (visibleAvatars.length === 0 && remainingCount <= 0) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {visibleAvatars.map((uri, index) => (
        <View
          key={`traveler-avatar-${index}`}
          style={[
            styles.avatarWrapper,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius,
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: 10 - index,
            },
          ]}>
          <ExpoImage source={uri} style={styles.avatar} contentFit="cover" />
        </View>
      ))}

      {remainingCount > 0 ? (
        <View
          style={[
            styles.moreBadge,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius,
              marginLeft: visibleAvatars.length > 0 ? -overlap : 0,
              zIndex: 0,
            },
          ]}>
          <ThemedText style={[styles.moreText, size === 'compact' ? styles.moreTextCompact : null]}>+</ThemedText>
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
  avatarWrapper: {
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: designSystem.colors.surface,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  moreBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(14,15,12,0.06)',
  },
  moreText: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  moreTextCompact: {
    fontSize: 11,
    lineHeight: 11,
  },
});
