import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

import { designSystem } from '@/constants/design-system';

type WandrAvatarProps = {
  name?: string | null;
  size: number;
  uri?: string | null;
  paletteKey?: string | null;
  style?: StyleProp<ViewStyle>;
};

type WandrAvatarImageSourceProps = {
  name?: string | null;
  paletteKey?: string | null;
  size?: number;
  uri?: string | null;
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

const GENERIC_AVATAR_NAMES = new Set(['', 'traveler', 'user', 'wandr', 'unknown']);

export function WandrAvatar({ name, size, uri, paletteKey, style }: WandrAvatarProps) {
  const resolvedUri = typeof uri === 'string' && uri.trim().length > 0 ? uri.trim() : null;
  const [imageFailed, setImageFailed] = useState(false);
  const avatarStyle = [styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style];
  const normalizedName = name?.trim() ?? '';
  const palette = useMemo(
    () => getAvatarPalette(paletteKey ?? resolvedUri ?? normalizedName),
    [normalizedName, paletteKey, resolvedUri]
  );
  const shouldRenderImage = Boolean(resolvedUri) && !imageFailed;
  const initials = getInitials(normalizedName);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedUri]);

  if (shouldRenderImage) {
    return (
      <View style={avatarStyle}>
        <Image
          contentFit="cover"
          onError={() => setImageFailed(true)}
          source={{ uri: resolvedUri ?? '' }}
          style={styles.image}
        />
      </View>
    );
  }

  return (
    <View style={[avatarStyle, styles.placeholder, { backgroundColor: palette.backgroundColor }]}>
      {initials ? (
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            styles.initials,
            {
              color: palette.textColor,
              fontSize: Math.max(12, size * 0.38),
            },
          ]}>
          {initials}
        </Text>
      ) : (
        <MaterialCommunityIcons
          color={palette.textColor}
          name="account"
          size={Math.max(18, size * 0.52)}
        />
      )}
    </View>
  );
}

export function getWandrAvatarImageSource({
  name,
  paletteKey,
  size = 56,
  uri,
}: WandrAvatarImageSourceProps): ImageSourcePropType {
  const resolvedUri = typeof uri === 'string' && uri.trim().length > 0 ? uri.trim() : null;

  if (resolvedUri) {
    return { uri: resolvedUri };
  }

  const normalizedName = name?.trim() ?? '';
  const palette = getAvatarPalette(paletteKey ?? normalizedName);
  const initials = getInitials(normalizedName) ?? 'WA';
  const fontSize = Math.max(12, size * 0.38);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" rx="${size / 2}" fill="${palette.backgroundColor}"/>`,
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${fontSize}" font-weight="700" fill="${palette.textColor}">${escapeSvgText(initials)}</text>`,
    '</svg>',
  ].join('');

  return { uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` };
}

function getInitials(name: string) {
  if (!name || GENERIC_AVATAR_NAMES.has(name.toLowerCase())) {
    return null;
  }

  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getAvatarPalette(paletteKey: string) {
  const normalizedKey = paletteKey.trim().toLowerCase() || 'wandr';
  let hash = 0;

  for (let index = 0; index < normalizedKey.length; index += 1) {
    hash = (hash * 31 + normalizedKey.charCodeAt(index)) >>> 0;
  }

  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function escapeSvgText(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: designSystem.colors.surfaceMuted,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
