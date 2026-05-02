import { designSystem } from '@/constants/design-system';

import { getMapboxModule } from './mapbox-module';

type MapRouteOverlaysProps = {
  upcomingRouteCoords: readonly { latitude: number; longitude: number }[];
  stayBranchCoords: Record<string, readonly { latitude: number; longitude: number }[]>;
};

export function MapRouteOverlays({ upcomingRouteCoords, stayBranchCoords }: MapRouteOverlaysProps) {
  return (
    <>
      {upcomingRouteCoords.length > 0 ? (
        <RouteLine id="upcoming-route" coordinates={upcomingRouteCoords} />
      ) : null}
      {Object.entries(stayBranchCoords).map(([id, coords]) => (
        <RouteLine key={`branch-${id}`} id={`branch-${id}`} coordinates={coords} />
      ))}
    </>
  );
}

function RouteLine({
  coordinates,
  id,
}: {
  coordinates: readonly { latitude: number; longitude: number }[];
  id: string;
}) {
  const MapboxGL = getMapboxModule();

  if (!MapboxGL) {
    return null;
  }

  const shape = {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: coordinates.map((coordinate) => [coordinate.longitude, coordinate.latitude]),
    },
    properties: {},
  };

  return (
    <MapboxGL.ShapeSource id={`${id}-source`} shape={shape}>
      <MapboxGL.LineLayer
        id={`${id}-line`}
        style={{
          lineCap: 'round',
          lineJoin: 'round',
          lineColor: designSystem.colors.lime,
          lineWidth: 4,
          lineDasharray: [2.5, 2],
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
