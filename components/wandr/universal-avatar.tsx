import type { ComponentProps } from 'react';

import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';

type UniversalAvatarProps = {
  name?: string | null;
  size: number;
  uri?: string | null;
  paletteKey?: string | null;
  style?: ComponentProps<typeof FaceHashAvatar>['style'];
};

export function UniversalAvatar({ name, size, uri, paletteKey, style }: UniversalAvatarProps) {
  return <FaceHashAvatar name={name?.trim() || 'Wandr'} paletteKey={paletteKey} size={size} uri={uri} style={style} />;
}
