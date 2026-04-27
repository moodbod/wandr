export type SeedStay = {
  slug: string;
  name: string;
  locationLabel: string;
  town: string;
  region: string;
  coordinate: readonly [number, number];
  imageUri: string;
  galleryImages: readonly string[];
  pricePerNight: number;
  currencyCode: string;
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
  bookingNote: string;
  bookingUrl?: string;
  bookingProvider?: string;
};

export const seedStays: readonly SeedStay[] = [];
