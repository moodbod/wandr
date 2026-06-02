import { StyleSheet, Text, View } from 'react-native';

import { WandrAvatar } from '@/components/wandr/avatar';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type TravelerAvatarStackItem = {
  name?: string | null;
  paletteKey?: string | null;
  uri?: string | null;
};

type TravelerAvatarStackProps = {
  avatars: readonly (string | TravelerAvatarStackItem)[];
  totalCount: number;
  fallbackName?: string;
  fallbackPaletteKey?: string | null;
  maxVisible?: number;
  size?: 'compact' | 'default';
};

export function TravelerAvatarStack({
  avatars,
  fallbackName = 'Traveler',
  fallbackPaletteKey,
  maxVisible = 2,
  totalCount,
  size = 'default',
}: TravelerAvatarStackProps) {
  const isDark = useColorScheme() === 'dark';
  const visibleAvatars = avatars
    .map((avatar) => normalizeAvatar(avatar))
    .filter((avatar) => Boolean(avatar.uri || avatar.name))
    .slice(0, maxVisible);
  const avatarSize = size === 'compact' ? 28 : 32;
  const borderRadius = avatarSize / 2;
  const overlap = size === 'compact' ? 12 : 12;
  const ringWidth = 2;
  const innerAvatarSize = avatarSize - ringWidth * 2;
  const ringColor = isDark ? designSystem.colors.darkSurface : designSystem.colors.white;
  const showFallbackAvatar = visibleAvatars.length === 0 && totalCount > 0;
  const shownAvatarCount = visibleAvatars.length + (showFallbackAvatar ? 1 : 0);
  const hiddenCount = Math.max(totalCount - shownAvatarCount, 0);

  if (totalCount === 0) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {visibleAvatars.map((avatar, index) => (
        <View
          key={`traveler-avatar-${avatar.paletteKey ?? avatar.uri ?? avatar.name ?? index}`}
          style={[
            styles.avatarWrapper,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius,
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: 10 - index,
              backgroundColor: ringColor,
              padding: ringWidth,
            },
          ]}>
          <WandrAvatar
            name={avatar.name ?? fallbackName}
            paletteKey={avatar.paletteKey ?? avatar.uri ?? avatar.name ?? fallbackPaletteKey ?? fallbackName}
            size={innerAvatarSize}
            uri={avatar.uri}
          />
        </View>
      ))}
      {showFallbackAvatar ? (
        <View
          style={[
            styles.avatarWrapper,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius,
              backgroundColor: ringColor,
              padding: ringWidth,
            },
          ]}>
          <WandrAvatar name={fallbackName} paletteKey={fallbackPaletteKey ?? fallbackName} size={innerAvatarSize} uri={null} />
        </View>
      ) : null}
      {hiddenCount > 0 ? (
        <View
          style={[
            styles.avatarWrapper,
            styles.countBubble,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius,
              marginLeft: shownAvatarCount === 0 ? 0 : -overlap,
              backgroundColor: ringColor,
              padding: ringWidth,
            },
          ]}>
          <View
            style={[
              styles.countBubble,
              {
                width: innerAvatarSize,
                height: innerAvatarSize,
                borderRadius: innerAvatarSize / 2,
              },
            ]}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.countText}>
              +{hiddenCount}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function normalizeAvatar(avatar: string | TravelerAvatarStackItem): TravelerAvatarStackItem {
  if (typeof avatar === 'string') {
    const uri = avatar.trim();
    return uri ? { uri } : {};
  }

  const uri = typeof avatar.uri === 'string' && avatar.uri.trim().length > 0 ? avatar.uri.trim() : null;
  const name = typeof avatar.name === 'string' && avatar.name.trim().length > 0 ? avatar.name.trim() : null;
  const paletteKey =
    typeof avatar.paletteKey === 'string' && avatar.paletteKey.trim().length > 0 ? avatar.paletteKey.trim() : null;

  return { name, paletteKey, uri };
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  countBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.darkGreen,
  },
  countText: {
    color: designSystem.colors.white,
    fontSize: 11,
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
