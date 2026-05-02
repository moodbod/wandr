export type MapMarker = {
  id: string;
  coordinate: readonly [number, number];
  experienceSlug?: string;
  itemKind?: 'experience' | 'stay';
  imageUri?: string;
  label?: string;
  popularityScore?: number;
  priceLabel?: string;
  tone?: 'accent' | 'dark';
  status?: 'completed' | 'active' | 'upcoming';
};

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MarkerCluster = {
  id: string;
  coordinate: readonly [number, number];
  count: number;
  markers: MapMarker[];
};

export type MarkerDisplayItem =
  | { kind: 'marker'; marker: MapMarker }
  | { kind: 'cluster'; cluster: MarkerCluster };

export type MapPreviewProps = {
  centerCoordinate?: readonly [number, number] | null;
  userCoordinate?: readonly [number, number] | null;
  userHeading?: number | null;
  markers?: readonly MapMarker[];
  routeCoordinates?: readonly (readonly [number, number])[];
  zoomLevel?: number;
  showRoutes?: boolean;
  colorSchemeMode?: 'system' | 'dark' | 'light';
  markerVariant?: 'default' | 'routeWidget';
  onInteract?: () => void;
  onMarkerPress?: (marker: MapMarker) => void;
};
