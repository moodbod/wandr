import { StyleSheet, View } from 'react-native';

import { WandrAvatar } from '@/components/wandr/avatar';
import { designSystem } from '@/constants/design-system';

type UserLocationPuckProps = {
  avatarPaletteKey?: string | null;
  avatarUri?: string | null;
  heading?: number | null;
  name?: string | null;
};

export function UserLocationPuck({ avatarPaletteKey, avatarUri, heading, name }: UserLocationPuckProps) {
  const normalizedHeading = normalizeHeading(heading);

  return (
    <View pointerEvents="none" style={styles.root}>
      {normalizedHeading !== null ? (
        <View style={[styles.headingLayer, { transform: [{ rotate: `${normalizedHeading}deg` }] }]}>
          <View style={styles.headingPointer} />
        </View>
      ) : null}
      <View style={styles.avatarShadow}>
        <WandrAvatar name={name} paletteKey={avatarPaletteKey} size={42} uri={avatarUri} />
      </View>
    </View>
  );
}

function normalizeHeading(heading?: number | null) {
  if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

const styles = StyleSheet.create({
  root: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  headingPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: designSystem.colors.lime,
    boxShadow: '0 0 10px rgba(198,239,174,0.54)',
  },
  avatarShadow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    boxShadow: '0 6px 12px rgba(0,0,0,0.18)',
  },
});
