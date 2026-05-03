import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
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

  return (
    <Avatar
      rounded
      size={size}
      source={usePlaceholder ? undefined : { uri: uri ?? '' }}
      title={getInitials(name)}
      containerStyle={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}
      overlayContainerStyle={styles.overlay}
      titleStyle={[styles.title, { fontSize: Math.max(12, size * 0.38), lineHeight: Math.max(14, size * 0.44) }]}
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
  overlay: {
    backgroundColor: designSystem.colors.surfaceMuted,
  },
  title: {
    color: designSystem.colors.darkGreen,
    fontWeight: '600',
  },
});
