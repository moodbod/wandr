import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MapPreview } from '@/components/wandr/maps/map-preview';

type MapFrameProps = ComponentProps<typeof MapPreview> & {
  children?: ReactNode;
  mapContainerStyle?: StyleProp<ViewStyle>;
  shellStyle?: StyleProp<ViewStyle>;
};

export function MapFrame({
  children,
  mapContainerStyle,
  shellStyle,
  ...mapProps
}: MapFrameProps) {
  return (
    <View style={[styles.shell, shellStyle]}>
      <View style={[styles.mapContainer, mapContainerStyle]}>
        <MapPreview {...mapProps} style={{ flex: 1 }} />
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
    ...StyleSheet.absoluteFillObject,
    display: 'flex',
  },
});
