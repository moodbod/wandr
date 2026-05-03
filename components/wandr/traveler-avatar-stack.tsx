import { StyleSheet, View } from 'react-native';

import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TravelerAvatarStackProps = {
  avatars: readonly string[];
  totalCount: number;
  fallbackName?: string;
  maxVisible?: number;
  size?: 'compact' | 'default';
};

export function TravelerAvatarStack({
  avatars,
  fallbackName = 'Traveler',
  maxVisible = 2,
  totalCount,
  size = 'default',
}: TravelerAvatarStackProps) {
  const isDark = useColorScheme() === 'dark';
  const visibleAvatarCount = Math.min(Math.max(totalCount, avatars.length), maxVisible);
  const visibleAvatars = Array.from({ length: visibleAvatarCount }, (_, index) => ({
    name: avatars[index] ?? `${fallbackName} ${index + 1}`,
    uri: avatars[index] ?? null,
  }));
  const avatarSize = size === 'compact' ? 28 : 32;
  const borderRadius = avatarSize / 2;
  const overlap = size === 'compact' ? 12 : 12;

  if (visibleAvatars.length === 0) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {visibleAvatars.map((avatar, index) => (
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
              borderColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.white,
            },
          ]}>
          <FaceHashAvatar name={avatar.name} size={avatarSize} uri={avatar.uri} />
        </View>
      ))}
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
    overflow: 'hidden',
    backgroundColor: designSystem.colors.surface,
  },
});
