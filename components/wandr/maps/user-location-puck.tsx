import { StyleSheet, View } from 'react-native';

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
          <View
            style={[
              isNavigation ? styles.navigationHeadingPointer : styles.avatarHeadingPointer,
              isNavigation && isStale ? styles.navigationHeadingPointerStale : null,
            ]}
          />
        </View>
      ) : null}
      {isNavigation ? (
        <View
          style={[
            styles.navigationDotShell,
            isMoving(speed) ? styles.navigationDotMoving : null,
            isStale ? styles.navigationDotShellStale : null,
          ]}
        >
          <View style={[styles.navigationDot, isStale ? styles.navigationDotStale : null]} />
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
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  avatarHeadingPointer: {
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
  navigationHeadingPointer: {
    width: 0,
    height: 0,
    marginTop: 3,
    borderLeftWidth: 17,
    borderRightWidth: 17,
    borderBottomWidth: 45,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(29,139,255,0.24)',
  },
  navigationHeadingPointerStale: {
    borderBottomColor: 'rgba(107,114,128,0.22)',
  },
  accuracyRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(29,139,255,0.22)',
    backgroundColor: 'rgba(29,139,255,0.10)',
  },
  accuracyRingStale: {
    borderColor: 'rgba(107,114,128,0.28)',
    backgroundColor: 'rgba(107,114,128,0.10)',
  },
  navigationDotShell: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.white,
    boxShadow: '0 4px 12px rgba(0,0,0,0.28)',
  },
  navigationDotMoving: {
    transform: [{ scale: 1.06 }],
  },
  navigationDotShellStale: {
    backgroundColor: '#F1F5F9',
  },
  navigationDot: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#1D8BFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  navigationDotStale: {
    backgroundColor: '#6B7280',
  },
  avatarShadow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    boxShadow: '0 6px 12px rgba(0,0,0,0.18)',
  },
});
