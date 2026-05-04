import type { ComponentProps } from 'react';

import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';

type UniversalAvatarProps = {
  name?: string | null;
  size: number;
  uri?: string | null;
  seed?: string | null;
  style?: ComponentProps<typeof FaceHashAvatar>['style'];
};

export function UniversalAvatar({ name, size, uri, seed, style }: UniversalAvatarProps) {
  return <FaceHashAvatar name={name?.trim() || 'Wandr'} seed={seed} size={size} uri={uri} style={style} />;
}
