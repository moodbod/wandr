import { type StyleProp, type ViewStyle } from 'react-native';

export type MapMarker = {
  id: string;
  coordinate: readonly [number, number];
  experienceSlug?: string;
  itemKind?: 'location' | 'experience' | 'stay' | 'hiddenGem';
  imageUri?: string;
  label?: string;
  popularityScore?: number;
  priceLabel?: string;
  tone?: 'accent' | 'dark';
  status?: 'completed' | 'active' | 'upcoming';
};

export type SharedMapUserLocation = {
  travelerSlug: string;
  name: string;
  avatarUri?: string | null;
  baseLabel?: string | null;
  coordinate: readonly [number, number];
  heading?: number | null;
  speed?: number | null;
  updatedAt?: number;
  expiresAt?: number;
};

export type MapPreviewProps = {
  centerCoordinate?: readonly [number, number] | null;
  userCoordinate?: readonly [number, number] | null;
  userAvatarPaletteKey?: string | null;
  userAvatarUri?: string | null;
  userAccuracy?: number | null;
  userHeading?: number | null;
  userIsStale?: boolean;
  userName?: string | null;
  userPuckVariant?: 'navigation' | 'avatar';
  userSpeed?: number | null;
  userStaleReason?: 'cached' | 'timeout' | 'permissionDenied' | 'unavailable' | null;
  userUpdatedAt?: number | null;
  viewportPadding?: {
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
  };
  markers?: readonly MapMarker[];
  sharedUserLocations?: readonly SharedMapUserLocation[];
  routeCoordinates?: readonly (readonly [number, number])[];
  zoomLevel?: number;
  showRoutes?: boolean;
  recenterToUserSignal?: number;
  followUserLocation?: boolean;
  colorSchemeMode?: 'system' | 'dark' | 'light';
  interactionEnabled?: boolean;
  markerVariant?: 'default' | 'routeWidget';
  persistKey?: string;
  onInteract?: () => void;
  onMapPress?: (coordinate: readonly [number, number]) => void;
  onMarkerPress?: (marker: MapMarker) => void;
  style?: StyleProp<ViewStyle>;
};
