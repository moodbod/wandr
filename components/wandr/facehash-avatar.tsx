import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Avatar } from 'react-native-elements';

import { designSystem } from '@/constants/design-system';
import { shouldUseFaceHashAvatar } from '@/lib/avatar';

type FaceHashAvatarProps = {
  name: string;
  size: number;
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function FaceHashAvatar({ name, size, uri, style }: FaceHashAvatarProps) {
  const usePlaceholder = shouldUseFaceHashAvatar(uri);
  const avatarStyle = [styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style];
  const fontSize = Math.max(12, size * 0.38);

  if (usePlaceholder) {
    return (
      <View style={[avatarStyle, styles.placeholder]}>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.title, { fontSize, lineHeight: fontSize }]}>
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
    color: designSystem.colors.darkGreen,
    fontWeight: '600',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
