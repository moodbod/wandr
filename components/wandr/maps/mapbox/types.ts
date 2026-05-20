import { type StyleProp, type ViewStyle } from 'react-native';

export type MapMarker = {
  id: string;
  coordinate: readonly [number, number];
  experienceSlug?: string;
  itemKind?: 'experience' | 'stay' | 'hiddenGem';
  imageUri?: string;
  label?: string;
  popularityScore?: number;
  priceLabel?: string;
  tone?: 'accent' | 'dark';
  status?: 'completed' | 'active' | 'upcoming';
};

export type MapPreviewProps = {
  centerCoordinate?: readonly [number, number] | null;
  userCoordinate?: readonly [number, number] | null;
  userAvatarPaletteKey?: string | null;
  userAvatarUri?: string | null;
  userHeading?: number | null;
  userName?: string | null;
  viewportPadding?: {
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
  };
  markers?: readonly MapMarker[];
  routeCoordinates?: readonly (readonly [number, number])[];
  zoomLevel?: number;
  showRoutes?: boolean;
  recenterToUserSignal?: number;
  colorSchemeMode?: 'system' | 'dark' | 'light';
  markerVariant?: 'default' | 'routeWidget';
  persistKey?: string;
  onInteract?: () => void;
  onMapPress?: (coordinate: readonly [number, number]) => void;
  onMarkerPress?: (marker: MapMarker) => void;
  style?: StyleProp<ViewStyle>;
};
