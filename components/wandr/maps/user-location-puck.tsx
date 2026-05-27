import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { WandrAvatar } from '@/components/wandr/avatar';
import { designSystem } from '@/constants/design-system';

type UserLocationPuckProps = {
  accuracy?: number | null;
  avatarPaletteKey?: string | null;
  avatarUri?: string | null;
  heading?: number | null;
  isStale?: boolean;
  name?: string | null;
  speed?: number | null;
  variant?: 'navigation' | 'avatar';
};

export function UserLocationPuck({
  accuracy,
  avatarPaletteKey,
  avatarUri,
  heading,
  isStale = false,
  name,
  speed,
  variant = 'avatar',
}: UserLocationPuckProps) {
  const normalizedHeading = normalizeHeading(heading);
  const isNavigation = variant === 'navigation';
  const accuracyDiameter = isNavigation ? getAccuracyDiameter(accuracy) : 0;
  const resolvedAvatarUri = typeof avatarUri === 'string' && avatarUri.trim().length > 0 ? avatarUri.trim() : null;
  const showNavigationAvatar = isNavigation && Boolean(resolvedAvatarUri);
  const accentColor = isStale ? '#6B7280' : '#0A84FF';
  const coneFillColor = isStale ? 'rgba(107,114,128,0.22)' : 'rgba(10,132,255,0.22)';
  const coneStrokeColor = isStale ? 'rgba(107,114,128,0.26)' : 'rgba(10,132,255,0.26)';

  return (
    <View pointerEvents="none" style={isNavigation ? styles.navigationRoot : styles.avatarRoot}>
      {isNavigation && accuracyDiameter > 0 ? (
        <View
          style={[
            styles.accuracyRing,
            isStale ? styles.accuracyRingStale : null,
            { height: accuracyDiameter, width: accuracyDiameter, borderRadius: accuracyDiameter / 2 },
          ]}
        />
      ) : null}
      {normalizedHeading !== null ? (
        <View style={[styles.headingLayer, { transform: [{ rotate: `${normalizedHeading}deg` }] }]}>
          {isNavigation ? (
            <Svg
              height={70}
              style={styles.navigationHeadingCone}
              viewBox="0 0 64 70"
              width={64}
            >
              <Path
                d="M32 4 C45 19 54 39 58 64 C49 58 40 55 32 55 C24 55 15 58 6 64 C10 39 19 19 32 4 Z"
                fill={coneFillColor}
                stroke={coneStrokeColor}
                strokeWidth={1.5}
              />
            </Svg>
          ) : (
            <Svg
              height={44}
              style={styles.avatarHeadingCone}
              viewBox="0 0 42 44"
              width={42}
            >
              <Path
                d="M21 3 C30 14 36 27 39 41 C33 37 27 35 21 35 C15 35 9 37 3 41 C6 27 12 14 21 3 Z"
                fill={coneFillColor}
                stroke={coneStrokeColor}
                strokeWidth={1.3}
              />
            </Svg>
          )}
        </View>
      ) : null}
      {isNavigation ? (
        <View
          style={[
            styles.navigationDotShell,
            isMoving(speed) ? styles.navigationDotMoving : null,
            showNavigationAvatar ? styles.navigationAvatarShell : null,
            isStale ? styles.navigationDotShellStale : null,
          ]}
        >
          {showNavigationAvatar ? (
            <WandrAvatar
              name={name}
              paletteKey={avatarPaletteKey}
              size={28}
              style={[styles.navigationAvatar, { borderColor: accentColor }]}
              uri={resolvedAvatarUri}
            />
          ) : (
            <View style={[styles.navigationDot, { backgroundColor: accentColor }]} />
          )}
        </View>
      ) : (
        <View style={styles.avatarShadow}>
          <WandrAvatar name={name} paletteKey={avatarPaletteKey} size={42} uri={avatarUri} />
        </View>
      )}
    </View>
  );
}

function normalizeHeading(heading?: number | null) {
  if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

function getAccuracyDiameter(accuracy?: number | null) {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy <= 0) {
    return 0;
  }

  return Math.max(46, Math.min(82, 34 + accuracy * 0.45));
}

function isMoving(speed?: number | null) {
  return typeof speed === 'number' && Number.isFinite(speed) && speed >= 1.2;
}

const styles = StyleSheet.create({
  avatarRoot: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationRoot: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  avatarHeadingCone: {
    marginTop: 2,
  },
  navigationHeadingCone: {
    marginTop: 2,
  },
  accuracyRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.20)',
    backgroundColor: 'rgba(10,132,255,0.10)',
  },
  accuracyRingStale: {
    borderColor: 'rgba(107,114,128,0.28)',
    backgroundColor: 'rgba(107,114,128,0.10)',
  },
  navigationDotShell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    boxShadow: '0 3px 10px rgba(0,0,0,0.26)',
  },
  navigationDotMoving: {
    transform: [{ scale: 1.06 }],
  },
  navigationAvatarShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    boxShadow: '0 4px 12px rgba(0,0,0,0.24)',
  },
  navigationDotShellStale: {
    backgroundColor: '#F1F5F9',
  },
  navigationDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  navigationAvatar: {
    borderWidth: 2,
    backgroundColor: designSystem.colors.white,
  },
  avatarShadow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    boxShadow: '0 6px 12px rgba(0,0,0,0.18)',
  },
});
