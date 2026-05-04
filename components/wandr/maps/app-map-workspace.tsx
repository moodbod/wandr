import { StyleSheet, View } from 'react-native';

import ActiveFriendCallOverlay from '@/components/wandr/friends/active-friend-call-overlay';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { usePlanningLocation } from '@/hooks/use-planning-location';

export function AppMapWorkspace() {
  const { activeCallId } = useActiveFriendCall();
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
      {activeCallId ? <ActiveFriendCallOverlay /> : null}
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
