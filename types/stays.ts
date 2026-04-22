export type StayProperty = {
  id: string;
  slug: string;
  name: string;
  locationLabel: string;
  town: string;
  region: string;
  coordinate: readonly [number, number];
  imageUri: string;
  galleryImages: readonly string[];
  pricePerNight: number;
  priceLabel: string;
  rating: number;
  reviewCount: number;
  stayStyle: 'design' | 'lodge' | 'roadside' | 'wellness';
  routeVibe: 'city reset' | 'coast base' | 'wildlife stop' | 'desert night';
  sleepSignal: string;
  summary: string;
  idealFor: readonly string[];
  amenities: readonly string[];
  nearbyHighlights: readonly string[];
  bookingNote: string;
};

export type RankedStayProperty = StayProperty & {
  distanceFromRouteKm: number;
  distanceFromCurrentKm: number | null;
  matchScore: number;
  matchedStopLabel: string;
  matchedStopCoordinate: readonly [number, number];
};
