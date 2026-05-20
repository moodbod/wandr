import { StyleSheet, View } from 'react-native';

import { MapPreview } from '@/components/wandr/maps/map-preview';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';

export function AppMapWorkspace() {
  const currentLocation = useCurrentLocation();
  const traveler = useCurrentTraveler();
  const centerCoordinate = currentLocation.coordinate ?? null;

  return (
    <View style={styles.root}>
      <MapPreview
        centerCoordinate={centerCoordinate}
        userCoordinate={currentLocation.coordinate}
        userAvatarPaletteKey={traveler?.slug}
        userAvatarUri={traveler?.avatarUri}
        userName={traveler?.name}
        markers={[]}
        persistKey="app-background"
        routeCoordinates={[]}
        showRoutes={false}
        zoomLevel={12}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    position: 'relative',
  },
});
