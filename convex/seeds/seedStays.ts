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

export const seedStays: readonly SeedStay[] = [
  {
    slug: 'city-bowl-garden-house',
    name: 'City Bowl Garden House',
    locationLabel: 'Gardens, Cape Town',
    town: 'Cape Town',
    region: 'Western Cape',
    coordinate: [18.4142, -33.9348],
    imageUri: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 186,
    currencyCode: 'USD',
    rating: 4.8,
    reviewCount: 238,
    stayStyle: 'design',
    routeVibe: 'city reset',
    sleepSignal: 'Best first sleep if Table Mountain and the city bowl are your starting anchors.',
    summary: 'A calm city-base stay with quick access to Kloof Street, the mountain roads, and easy Waterfront transfers.',
    idealFor: ['arrival night', 'Table Mountain start', 'food route'],
    amenities: ['fast wifi', 'breakfast', 'secure parking', 'late check-in'],
    nearbyHighlights: ['Kloof Street', 'Company’s Garden', 'Table Mountain road'],
    bookingNote: 'Choose this when you want Cape Town itself to be the first chapter, not just a launchpad.',
  },
  {
    slug: 'waterfront-silo-stay',
    name: 'Waterfront Silo Stay',
    locationLabel: 'V&A Waterfront',
    town: 'Cape Town',
    region: 'Western Cape',
    coordinate: [18.4219, -33.9087],
    imageUri: 'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 312,
    currencyCode: 'USD',
    rating: 4.9,
    reviewCount: 319,
    stayStyle: 'design',
    routeVibe: 'city reset',
    sleepSignal: 'Strong for travelers who want restaurants, ferries, museums, and harbour walks within one base.',
    summary: 'A polished waterfront base near restaurants, ferry departures, Zeitz MOCAA, and sunset harbour edges.',
    idealFor: ['first Cape Town night', 'food and museums', 'Robben Island ferry'],
    amenities: ['harbour views', 'breakfast', 'concierge desk', 'walkable dining'],
    nearbyHighlights: ['Robben Island ferry', 'Zeitz MOCAA', 'Cape Wheel'],
    bookingNote: 'Worth it when convenience matters more than driving in and out of the city bowl.',
  },
  {
    slug: 'constantia-green-suite',
    name: 'Constantia Green Suite',
    locationLabel: 'Constantia Valley',
    town: 'Cape Town',
    region: 'Western Cape',
    coordinate: [18.4386, -34.0164],
    imageUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 228,
    currencyCode: 'USD',
    rating: 4.7,
    reviewCount: 174,
    stayStyle: 'wellness',
    routeVibe: 'city reset',
    sleepSignal: 'A quieter base when Kirstenbosch, Constantia, and softer mornings matter.',
    summary: 'Leafy, calmer, and close to gardens and wine estates without losing access to the city.',
    idealFor: ['garden walks', 'slow mornings', 'couples'],
    amenities: ['pool', 'garden patio', 'breakfast', 'secure parking'],
    nearbyHighlights: ['Kirstenbosch', 'Constantia wine estates', 'Cecilia Forest'],
    bookingNote: 'Best when the route leans green and relaxed rather than nightlife-heavy.',
  },
  {
    slug: 'stellenbosch-courtyard-inn',
    name: 'Stellenbosch Courtyard Inn',
    locationLabel: 'Historic Stellenbosch',
    town: 'Stellenbosch',
    region: 'Western Cape',
    coordinate: [18.8619, -33.9346],
    imageUri: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 204,
    currencyCode: 'USD',
    rating: 4.8,
    reviewCount: 201,
    stayStyle: 'design',
    routeVibe: 'coast base',
    sleepSignal: 'Best when the Winelands becomes an overnight instead of a rushed day trip.',
    summary: 'A compact town stay for cellar doors, oak-lined streets, and a slower branch from Cape Town.',
    idealFor: ['Winelands night', 'food route', 'walkable town'],
    amenities: ['breakfast', 'parking', 'courtyard bar', 'late check-in'],
    nearbyHighlights: ['Dorp Street', 'wine estates', 'Jonkershoek road'],
    bookingNote: 'Choose this if the wine day deserves a proper night rather than a return transfer.',
  },
];
