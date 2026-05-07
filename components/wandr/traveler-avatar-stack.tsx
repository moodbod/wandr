import { StyleSheet, Text, View } from 'react-native';

import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TravelerAvatarStackProps = {
  avatars: readonly string[];
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
  const visibleAvatars = avatars.filter(Boolean).slice(0, maxVisible);
  const avatarSize = size === 'compact' ? 28 : 32;
  const borderRadius = avatarSize / 2;
  const overlap = size === 'compact' ? 12 : 12;
  const showFallbackAvatar = visibleAvatars.length === 0 && totalCount > 0;
  const shownAvatarCount = visibleAvatars.length + (showFallbackAvatar ? 1 : 0);
  const hiddenCount = Math.max(totalCount - shownAvatarCount, 0);

  if (totalCount === 0) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {visibleAvatars.map((avatarUri, index) => (
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
          <FaceHashAvatar name="Traveler" size={avatarSize} uri={avatarUri} />
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
              borderColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.white,
            },
          ]}>
          <FaceHashAvatar name={fallbackName} paletteKey={fallbackPaletteKey ?? fallbackName} size={avatarSize} uri={null} />
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
              borderColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.white,
            },
          ]}>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.countText}>
            +{hiddenCount}
          </Text>
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
    overflow: 'hidden',
    backgroundColor: designSystem.colors.surface,
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
    lineHeight: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
