type BookingComAccommodationDoc = {
  accommodationId: number;
  slug: string;
  name: string;
  locationLabel: string;
  town: string;
  region: string;
  countryCode?: string;
  countryLabel?: string;
  planningLocationId?: string;
  coordinate: number[];
  imageUri: string;
  galleryImages: string[];
  pricePerNight?: number;
  currencyCode?: string;
  rating?: number;
  reviewCount?: number;
  accommodationType?: string;
  description?: string;
  amenities: string[];
  roomNames: string[];
  paymentMethods: string[];
  policies?: string;
};

function asCoordinate(value: number[]) {
  if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
    return [value[0], value[1]] as [number, number];
  }
  return [0, 0] as [number, number];
}

export function toPublicBookingComStay(stay: BookingComAccommodationDoc) {
  const amenities = stay.amenities.length ? stay.amenities : ['Booking.com accommodation'];
  const roomNames = stay.roomNames.length ? stay.roomNames : ['Rooms available'];
  const description =
    stay.description ??
    `${stay.name} is available through Booking.com. Check live availability for current rates and room options.`;

  return {
    id: stay.slug,
    slug: stay.slug,
    source: 'bookingCom' as const,
    bookingComAccommodationId: stay.accommodationId,
    name: stay.name,
    locationLabel: stay.locationLabel,
    town: stay.town,
    region: stay.region,
    countryCode: stay.countryCode,
    countryLabel: stay.countryLabel,
    planningLocationId: stay.planningLocationId,
    coordinate: asCoordinate(stay.coordinate),
    imageUri: stay.imageUri,
    galleryImages: stay.galleryImages.length ? stay.galleryImages : [stay.imageUri],
    pricePerNight: stay.pricePerNight ?? 0,
    priceLabel: stay.pricePerNight ? `$${stay.pricePerNight}` : 'Check availability',
    priceDisplayLabel: stay.pricePerNight ? undefined : 'Check availability',
    currencyCode: stay.currencyCode ?? 'USD',
    rating: stay.rating ?? 4.5,
    reviewCount: stay.reviewCount ?? 0,
    stayStyle: 'design' as const,
    routeVibe: 'city reset' as const,
    sleepSignal: stay.accommodationType ?? 'Booking.com stay',
    summary: description,
    idealFor: roomNames.slice(0, 4),
    amenities,
    nearbyHighlights: [
      stay.locationLabel,
      ...(stay.policies ? [stay.policies] : []),
    ].slice(0, 4),
    bookingProfile: undefined,
    bookingNote: 'Live rates, rooms, and policies are confirmed with Booking.com before checkout.',
    bookingProvider: 'bookingCom',
  };
}
