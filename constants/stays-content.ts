import type { TripDashboard } from '@/types/trip';
import type { RankedStayProperty, StayProperty } from '@/types/stays';

const routeOrigin = [17.0832, -22.5609] as const;

export const stayProperties: readonly StayProperty[] = [
  {
    id: 'olive-grove-lofts',
    slug: 'olive-grove-lofts',
    name: 'Olive Grove Lofts',
    locationLabel: 'Windhoek West',
    town: 'Windhoek',
    region: 'Khomas',
    coordinate: [17.0788, -22.5661],
    imageUri: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 148,
    priceLabel: '$148',
    rating: 4.8,
    reviewCount: 214,
    stayStyle: 'design',
    routeVibe: 'city reset',
    sleepSignal: 'Good first or last night before a long drive.',
    summary: 'A calm, design-led base close to cafés, fuel stops, and an easy airport run.',
    idealFor: ['arrival night', 'remote work', 'short city reset'],
    amenities: ['fast wifi', 'breakfast', 'secure parking', 'late check-in'],
    nearbyHighlights: ['Independence Avenue', 'craft walk', 'coffee courtyard'],
    bookingNote: 'Best when you want a smooth city landing without overcommitting your first day.',
  },
  {
    id: 'naankuse-bush-lodge',
    slug: 'naankuse-bush-lodge',
    name: 'Naankuse Bush Lodge',
    locationLabel: 'Near Naankuse Reserve',
    town: 'Windhoek',
    region: 'Khomas',
    coordinate: [17.232, -22.434],
    imageUri: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 196,
    priceLabel: '$196',
    rating: 4.7,
    reviewCount: 143,
    stayStyle: 'lodge',
    routeVibe: 'wildlife stop',
    sleepSignal: 'Smart if your trip opens with wildlife outside Windhoek.',
    summary: 'Bush-facing suites with enough comfort to feel restorative after a flight or reserve drive.',
    idealFor: ['wildlife day', 'quiet reset', 'couples'],
    amenities: ['pool', 'game-drive desk', 'parking', 'dinner service'],
    nearbyHighlights: ['reserve entrance', 'sunset deck', 'animal rehabilitation center'],
    bookingNote: 'Worth it when you want your first sleep to already feel like the trip has started.',
  },
  {
    id: 'jetty-quarter-house',
    slug: 'jetty-quarter-house',
    name: 'Jetty Quarter House',
    locationLabel: 'Swakopmund Jetty',
    town: 'Swakopmund',
    region: 'Erongo',
    coordinate: [14.5038, -22.6784],
    imageUri: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 182,
    priceLabel: '$182',
    rating: 4.9,
    reviewCount: 321,
    stayStyle: 'design',
    routeVibe: 'coast base',
    sleepSignal: 'Best base for multiple Swakopmund activities without repacking.',
    summary: 'A polished coastal stay a short walk from the jetty, restaurants, and beach air after a driving day.',
    idealFor: ['2-3 night coast stop', 'food route', 'walkable base'],
    amenities: ['breakfast', 'ocean-view lounge', 'parking', 'laundry'],
    nearbyHighlights: ['Jetty district', 'old town', 'beach promenade'],
    bookingNote: 'A strong choice if your route stacks Swakopmund, dunes, and Walvis Bay together.',
  },
  {
    id: 'lagoon-tide-suites',
    slug: 'lagoon-tide-suites',
    name: 'Lagoon Tide Suites',
    locationLabel: 'Walvis Bay Lagoon',
    town: 'Walvis Bay',
    region: 'Erongo',
    coordinate: [14.5062, -22.9551],
    imageUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 164,
    priceLabel: '$164',
    rating: 4.6,
    reviewCount: 188,
    stayStyle: 'wellness',
    routeVibe: 'coast base',
    sleepSignal: 'Helpful when you want sunrise lagoon access before getting back on the road.',
    summary: 'Quiet lagoon-side suites with easy departures for Sandwich Harbour and coastal mornings.',
    idealFor: ['sunrise starts', 'lagoon kayaking', 'one-night stopover'],
    amenities: ['spa corner', 'secure parking', 'breakfast', 'airport transfer'],
    nearbyHighlights: ['lagoon boardwalk', 'flamingo lookout', 'harbour road'],
    bookingNote: 'Ideal if you prefer a calmer sleep than central Swakopmund.',
  },
  {
    id: 'spitzkoppe-star-camp',
    slug: 'spitzkoppe-star-camp',
    name: 'Spitzkoppe Star Camp',
    locationLabel: 'Spitzkoppe Massif',
    town: 'Spitzkoppe',
    region: 'Erongo',
    coordinate: [15.1962, -21.8235],
    imageUri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 138,
    priceLabel: '$138',
    rating: 4.8,
    reviewCount: 117,
    stayStyle: 'roadside',
    routeVibe: 'desert night',
    sleepSignal: 'A memorable overnight when you want the route itself to feel cinematic.',
    summary: 'Simple but unforgettable sleep under granite domes and exceptionally dark skies.',
    idealFor: ['stargazing', 'one-night route break', 'photography'],
    amenities: ['guided stargazing', 'braai area', 'parking', 'sunrise access'],
    nearbyHighlights: ['arch rock', 'sunset hill', 'night sky platform'],
    bookingNote: 'Less luxury, more atmosphere. Best when the trip needs one iconic overnight.',
  },
  {
    id: 'damaraland-courtyard-lodge',
    slug: 'damaraland-courtyard-lodge',
    name: 'Damaraland Courtyard Lodge',
    locationLabel: 'Near Twyfelfontein',
    town: 'Khorixas',
    region: 'Kunene',
    coordinate: [14.382, -20.5901],
    imageUri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 172,
    priceLabel: '$172',
    rating: 4.7,
    reviewCount: 166,
    stayStyle: 'lodge',
    routeVibe: 'wildlife stop',
    sleepSignal: 'Useful when Damaraland becomes a real overnight, not just a pass-through.',
    summary: 'A grounded lodge for splitting the long coast-to-north drive and waking up close to the rock art circuit.',
    idealFor: ['self-drive pacing', 'heritage stop', '2-day northwest loop'],
    amenities: ['dinner service', 'parking', 'pool', 'guide desk'],
    nearbyHighlights: ['Twyfelfontein', 'desert elephant routes', 'rock formations'],
    bookingNote: 'Best for reducing fatigue on the northwest leg of the route.',
  },
  {
    id: 'etosha-waterhole-lodge',
    slug: 'etosha-waterhole-lodge',
    name: 'Etosha Waterhole Lodge',
    locationLabel: 'Okaukuejo Gate Area',
    town: 'Etosha',
    region: 'Oshikoto',
    coordinate: [15.9061, -19.1799],
    imageUri: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1549366021-9f761d450615?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 224,
    priceLabel: '$224',
    rating: 4.9,
    reviewCount: 402,
    stayStyle: 'lodge',
    routeVibe: 'wildlife stop',
    sleepSignal: 'The obvious move if your route includes an Etosha sunrise or late waterhole session.',
    summary: 'A high-confidence safari sleep with early gate access and enough comfort to recover between drives.',
    idealFor: ['safari nights', 'families', 'sunrise game drive'],
    amenities: ['pool', 'safari desk', 'breakfast', 'family rooms'],
    nearbyHighlights: ['Okaukuejo waterhole', 'gate road', 'wildlife briefing deck'],
    bookingNote: 'Strongest when Etosha is one of the trip anchors, not just a quick stop.',
  },
  {
    id: 'sesriem-dune-house',
    slug: 'sesriem-dune-house',
    name: 'Sesriem Dune House',
    locationLabel: 'Sesriem Gate',
    town: 'Sossusvlei',
    region: 'Hardap',
    coordinate: [15.349, -24.7312],
    imageUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 236,
    priceLabel: '$236',
    rating: 4.8,
    reviewCount: 259,
    stayStyle: 'wellness',
    routeVibe: 'desert night',
    sleepSignal: 'Makes the early dune start actually doable and worth it.',
    summary: 'Minimal-luxury suites right where you want them for sunrise access and a slow desert evening.',
    idealFor: ['sunrise launch', 'honeymoon energy', 'one iconic splurge'],
    amenities: ['sunset deck', 'pool', 'breakfast packs', 'parking'],
    nearbyHighlights: ['Sesriem Gate', 'Deadvlei drive', 'sunset dune ridge'],
    bookingNote: 'High value if you want the desert light without a punishing wake-up from far away.',
  },
  {
    id: 'namibrand-sky-lodge',
    slug: 'namibrand-sky-lodge',
    name: 'NamibRand Sky Lodge',
    locationLabel: 'NamibRand Reserve',
    town: 'NamibRand',
    region: 'Hardap',
    coordinate: [16.1019, -25.0465],
    imageUri: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80&fit=crop',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&fit=crop',
    ],
    pricePerNight: 268,
    priceLabel: '$268',
    rating: 4.9,
    reviewCount: 145,
    stayStyle: 'wellness',
    routeVibe: 'desert night',
    sleepSignal: 'For a route segment that deserves a real dark-sky overnight.',
    summary: 'The most atmospheric sleep in the set: silent desert, star decks, and a long exhale after the road.',
    idealFor: ['dark sky stay', 'slow travel', 'post-Sossusvlei reset'],
    amenities: ['star deck', 'full board', 'guided astronomy', 'parking'],
    nearbyHighlights: ['dark sky reserve', 'sunset drive', 'dune plain'],
    bookingNote: 'Choose this when the overnight itself should be part of the story, not just logistics.',
  },
];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceInKm(from: readonly [number, number], to: readonly [number, number]) {
  const earthRadiusKm = 6371;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRouteStops(trip?: TripDashboard | null) {
  const tripStops =
    trip?.items
      .filter(
        (item): item is TripDashboard['items'][number] & {
          experience: TripDashboard['items'][number]['experience'] & {
            coordinate: readonly [number, number];
          };
        } => Array.isArray(item.experience.coordinate) && item.experience.coordinate.length === 2
      )
      .map((item) => ({
        label: item.experience.locationLabel ?? item.experience.title,
        coordinate: item.experience.coordinate,
      })) ?? [];

  if (tripStops.length > 0) {
    return tripStops;
  }

  return [{ label: 'Windhoek route start', coordinate: routeOrigin }];
}

export function rankStayProperties(args: {
  trip?: TripDashboard | null;
  currentCoordinate?: readonly [number, number] | null;
}) {
  const routeStops = getRouteStops(args.trip);

  return [...stayProperties]
    .map<RankedStayProperty>((stay) => {
      const closestStop = routeStops.reduce((best, stop) => {
        const distance = getDistanceInKm(stay.coordinate, stop.coordinate);
        if (!best || distance < best.distance) {
          return { stop, distance };
        }
        return best;
      }, null as { stop: { label: string; coordinate: readonly [number, number] }; distance: number } | null)!;

      const distanceFromCurrentKm = args.currentCoordinate
        ? getDistanceInKm(stay.coordinate, args.currentCoordinate)
        : null;

      const matchScore =
        closestStop.distance +
        (distanceFromCurrentKm ?? 0) * 0.35 +
        (stay.stayStyle === 'roadside' ? -8 : 0) +
        (stay.routeVibe === 'desert night' ? -4 : 0);

      return {
        ...stay,
        distanceFromRouteKm: closestStop.distance,
        distanceFromCurrentKm,
        matchScore,
        matchedStopLabel: closestStop.stop.label,
        matchedStopCoordinate: closestStop.stop.coordinate,
      };
    })
    .sort((a, b) => a.matchScore - b.matchScore);
}

export function getStayBySlug(slug?: string | string[]) {
  if (!slug || Array.isArray(slug)) {
    return null;
  }

  return stayProperties.find((stay) => stay.slug === slug) ?? null;
}

export function formatDistance(distanceKm: number) {
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }

  return `${Math.round(distanceKm)} km`;
}
