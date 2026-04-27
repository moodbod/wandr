export type StayOption = {
  id: string;
  label: string;
};

export type StayBedOption = StayOption;

export type StayRoomOption = {
  id: string;
  label: string;
  detail: string;
  maxAdults: number;
  maxChildren: number;
  maxRooms: number;
  bedOptions: readonly StayBedOption[];
};

export type StayArrivalOption = StayOption;

export type StayBookingProfile = {
  roomOptions: readonly StayRoomOption[];
  arrivalOptions: readonly StayArrivalOption[];
  defaultRoomOptionId: string;
  defaultArrivalOptionId: string;
};

export type StayGuestCounts = {
  adults: number;
  children: number;
};

export type StayBookingDetails = {
  guestCounts: StayGuestCounts;
  roomCount: number;
  roomTypeId: string;
  roomTypeLabel: string;
  bedOptionId: string;
  bedOptionLabel: string;
  arrivalWindowId: string;
  arrivalWindowLabel: string;
  specialRequest?: string;
  guestSummary: string;
  roomSummary: string;
};

export type StayProperty = {
  id: string;
  slug: string;
  name: string;
  bookingPhone?: string;
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
  guestJournals?: readonly {
    name: string;
    avatarUri: string;
    visitedAtLabel: string;
    quote: string;
  }[];
  bookingProfile?: StayBookingProfile;
  bookingNote: string;
};

export type RankedStayProperty = StayProperty & {
  distanceFromRouteKm: number;
  distanceFromCurrentKm: number | null;
  matchScore: number;
  matchedStopLabel: string;
  matchedStopCoordinate: readonly [number, number];
};
