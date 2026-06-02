import { lazy, Suspense, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { MapPreviewProps } from '@/components/wandr/maps/mapbox/types';

const MapPreview = lazy(() =>
  import('@/components/wandr/maps/map-preview').then((module) => ({
    default: module.MapPreview,
  }))
);

type MapFrameProps = MapPreviewProps & {
  children?: ReactNode;
  mapContainerStyle?: StyleProp<ViewStyle>;
  shellStyle?: StyleProp<ViewStyle>;
};

export function MapFrame({
  children,
  mapContainerStyle,
  shellStyle,
  style,
  ...mapProps
}: MapFrameProps) {
  return (
    <View style={[styles.shell, shellStyle]}>
      <View style={[styles.mapContainer, mapContainerStyle]}>
        <Suspense fallback={<View style={styles.mapFallback} />}>
          <MapPreview {...mapProps} style={[{ flex: 1 }, style]} />
        </Suspense>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  mapContainer: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
    display: 'flex',
  },
  mapFallback: {
    flex: 1,
    backgroundColor: '#172319',
  },
});
