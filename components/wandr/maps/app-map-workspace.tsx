import { StyleSheet, View } from 'react-native';

import { MapPreview } from '@/components/wandr/maps/map-preview';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { usePlanningLocation } from '@/hooks/use-planning-location';

export function AppMapWorkspace() {
  const currentLocation = useCurrentLocation();
  const { planningLocation } = usePlanningLocation();
  const centerCoordinate =
    currentLocation.coordinate ??
    planningLocation.centerCoordinate ??
    null;

  return (
    <View style={styles.root}>
      <MapPreview
        centerCoordinate={centerCoordinate}
        userCoordinate={currentLocation.coordinate}
        markers={[]}
        routeCoordinates={[]}
        showRoutes={false}
        zoomLevel={planningLocation.centerCoordinate ? 8 : 12}
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
