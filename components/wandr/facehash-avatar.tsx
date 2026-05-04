import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Avatar } from 'react-native-elements';

import { designSystem } from '@/constants/design-system';
import { shouldUseFaceHashAvatar } from '@/lib/avatar';

type FaceHashAvatarProps = {
  name: string;
  size: number;
  uri?: string | null;
  seed?: string | null;
  style?: StyleProp<ViewStyle>;
};

const AVATAR_PALETTE = [
  { backgroundColor: '#dff3b0', textColor: '#183700' },
  { backgroundColor: '#bfe9d8', textColor: '#063627' },
  { backgroundColor: '#c9ddff', textColor: '#102a62' },
  { backgroundColor: '#ffd7a8', textColor: '#5a2a00' },
  { backgroundColor: '#f5c7d8', textColor: '#59162f' },
  { backgroundColor: '#d8d1ff', textColor: '#261868' },
  { backgroundColor: '#ffe27a', textColor: '#3f3100' },
  { backgroundColor: '#b8eee8', textColor: '#053b38' },
] as const;

export function FaceHashAvatar({ name, size, uri, seed, style }: FaceHashAvatarProps) {
  const usePlaceholder = shouldUseFaceHashAvatar(uri);
  const avatarStyle = [styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style];
  const fontSize = Math.max(12, size * 0.38);
  const palette = getAvatarPalette(seed ?? uri ?? name);

  if (usePlaceholder) {
    return (
      <View style={[avatarStyle, styles.placeholder, { backgroundColor: palette.backgroundColor }]}>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.title, { color: palette.textColor, fontSize, lineHeight: size }]}>
          {getInitials(name)}
        </Text>
      </View>
    );
  }

  return (
    <Avatar
      rounded
      size={size}
      source={{ uri: uri ?? '' }}
      containerStyle={avatarStyle}
    />
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

function getAvatarPalette(seed: string) {
  const normalizedSeed = seed.trim().toLowerCase() || 'wandr';
  let hash = 0;

  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = (hash * 31 + normalizedSeed.charCodeAt(index)) >>> 0;
  }

  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: designSystem.colors.surfaceMuted,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
