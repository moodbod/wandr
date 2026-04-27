import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';

import type { ExploreExperience } from '../constants/explore-content';
import type { StayBookingDetails, StayProperty } from '../types/stays';

type TripItineraryItem = {
  _id: Id<'experienceBookings'>;
  _creationTime: number;
  experienceSlug: string;
  travelerSlug: string;
  tripId?: Id<'trips'>;
  bookedAt: number;
  bookingType?: 'experience' | 'stay';
  checkIn?: number;
  checkOut?: number;
  totalPrice?: number;
  stayBookingDetails?: StayBookingDetails;
  kind: 'experience' | 'stay';
  experience: ExploreExperience;
  stay?: StayProperty | null;
};

async function getFallbackTripId(ctx: QueryCtx, travelerSlug: string) {
  const trips = await ctx.db
    .query('trips')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .order('desc')
    .collect();

  return trips[0]?._id;
}

async function getTripById(ctx: QueryCtx, tripId?: string) {
  if (!tripId) {
    return null;
  }

  return await ctx.db.get(tripId as Id<'trips'>);
}

function isCoordinate(value: readonly number[] | undefined): value is readonly [number, number] {
  return Array.isArray(value) && value.length === 2;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceInKm(from: readonly [number, number], to: readonly [number, number]) {
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

function getFirstCoordinate(
  itinerary: readonly TripItineraryItem[]
): readonly [number, number] | null {
  const sorted = [...itinerary].sort((a, b) => a.bookedAt - b.bookedAt);

  for (const item of sorted) {
    if (isCoordinate(item.experience.coordinate)) {
      return item.experience.coordinate;
    }
  }

  return null;
}

function getOrderedRouteStops(
  itinerary: TripItineraryItem[],
  origin: readonly [number, number]
) {
  const withCoordinates = itinerary.filter(
    (item): item is TripItineraryItem & { experience: ExploreExperience & { coordinate: readonly [number, number] } } =>
      isCoordinate(item.experience.coordinate)
  );
  const withoutCoordinates = itinerary.filter((item) => !isCoordinate(item.experience.coordinate));

  const remaining = [...withCoordinates];
  const ordered: TripItineraryItem[] = [];
  let currentPoint = origin;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = getDistanceInKm(currentPoint, remaining[0].experience.coordinate);

    for (let index = 1; index < remaining.length; index += 1) {
      const distance = getDistanceInKm(currentPoint, remaining[index].experience.coordinate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [nextStop] = remaining.splice(nearestIndex, 1);
    ordered.push(nextStop);
    currentPoint = nextStop.experience.coordinate;
  }

  return [...ordered, ...withoutCoordinates.sort((a, b) => a.bookedAt - b.bookedAt)];
}

function buildDayTitle(locationLabel?: string) {
  if (!locationLabel) {
    return 'Trip Day';
  }

  const firstSegment = locationLabel.split(',')[0]?.trim() ?? locationLabel;
  const firstWord = firstSegment.split(/\s+/)[0]?.trim();

  if (!firstWord) {
    return 'Trip Day';
  }

  return `${firstWord} Day`;
}

function buildStayExperience(stay: StayProperty): ExploreExperience {
  return {
    slug: stay.slug,
    badge: 'ROOM BOOKING',
    ctaLabel: 'View stay',
    title: stay.name,
    subtitle: stay.locationLabel,
    description: '',
    imageUri: stay.imageUri,
    price: `N$${stay.pricePerNight}`,
    priceSuffix: '/night',
    category: 'Stay',
    coordinate: isCoordinate(stay.coordinate) ? stay.coordinate : undefined,
    geography: {
      region: stay.region,
      town: stay.town,
    },
    locationLabel: stay.locationLabel,
    tripFit: [
      {
        label: 'Stay style',
        value: stay.stayStyle,
        detail: '',
        icon: 'users',
        tone: 'dark',
      },
    ],
    includes: stay.amenities.slice(0, 4),
  };
}

function buildExploreExperience(experience: Doc<'experiences'>): ExploreExperience {
  const { coordinate, ...rest } = experience;

  return {
    ...rest,
    coordinate: isCoordinate(coordinate) ? coordinate : undefined,
  };
}

function insertStayBookingsNearRoute(
  routeStops: TripItineraryItem[],
  stayStops: TripItineraryItem[],
  origin: readonly [number, number]
) {
  const staysWithCoordinates = stayStops.filter(
    (item): item is TripItineraryItem & { experience: ExploreExperience & { coordinate: readonly [number, number] } } =>
      isCoordinate(item.experience.coordinate)
  );
  const staysWithoutCoordinates = stayStops
    .filter((item) => !isCoordinate(item.experience.coordinate))
    .sort((a, b) => a.bookedAt - b.bookedAt);

  if (routeStops.length === 0) {
    return [
      ...getOrderedRouteStops(staysWithCoordinates, origin),
      ...staysWithoutCoordinates,
    ];
  }

  const anchoredStayGroups = new Map<number, TripItineraryItem[]>();

  const sortedAnchoredStays = staysWithCoordinates
    .map((stay) => {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      routeStops.forEach((stop, index) => {
        if (!isCoordinate(stop.experience.coordinate)) {
          return;
        }

        const distance = getDistanceInKm(stay.experience.coordinate, stop.experience.coordinate);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      return { stay, nearestIndex, nearestDistance };
    })
    .sort((a, b) => {
      if (a.nearestIndex !== b.nearestIndex) {
        return a.nearestIndex - b.nearestIndex;
      }
      if (a.nearestDistance !== b.nearestDistance) {
        return a.nearestDistance - b.nearestDistance;
      }
      return a.stay.bookedAt - b.stay.bookedAt;
    });

  sortedAnchoredStays.forEach(({ stay, nearestIndex }) => {
    const currentGroup = anchoredStayGroups.get(nearestIndex) ?? [];
    currentGroup.push(stay);
    anchoredStayGroups.set(nearestIndex, currentGroup);
  });

  const orderedItinerary: TripItineraryItem[] = [];

  routeStops.forEach((stop, index) => {
    orderedItinerary.push(stop);

    const nearbyStays = anchoredStayGroups.get(index);
    if (nearbyStays?.length) {
      orderedItinerary.push(...nearbyStays);
    }
  });

  return [...orderedItinerary, ...staysWithoutCoordinates];
}

async function getResolvedItinerary(ctx: QueryCtx, travelerSlug: string, tripId?: string): Promise<TripItineraryItem[]> {
  const resolvedTripId = tripId ?? (await getFallbackTripId(ctx, travelerSlug));

  if (!resolvedTripId) {
    return [];
  }

  let bookingsQuery = ctx.db
    .query('experienceBookings')
    .withIndex('by_travelerSlug_and_experienceSlug', (q) => q.eq('travelerSlug', travelerSlug));

  const bookings = (await bookingsQuery.collect()).filter((b) => b.tripId === resolvedTripId);

  const allExperiences = await ctx.db.query('experiences').collect();
  const allStays = await ctx.db.query('stays').collect();

  if (allExperiences.length === 0 && allStays.length === 0) {
    return [];
  }

  if (bookings.length === 0) {
    return [];
  }

  const resolvedItinerary = bookings
    .map<TripItineraryItem | null>((booking) => {
      const experience = allExperiences.find((item) => item.slug === booking.experienceSlug);
      const stay = allStays.find((item) => item.slug === booking.experienceSlug);

      if (stay && (booking.bookingType === 'stay' || !experience)) {
        return {
          ...booking,
          kind: 'stay',
          experience: buildStayExperience(stay as unknown as StayProperty),
          stay: stay as unknown as StayProperty,
        };
      }

      if (!experience) {
        return null;
      }

      return {
        ...booking,
        kind: 'experience',
        experience: buildExploreExperience(experience),
        stay: null,
      };
    })
    .filter((item): item is TripItineraryItem => item !== null);

  const origin = getFirstCoordinate(resolvedItinerary);
  const routeStops = resolvedItinerary.filter((item) => item.kind === 'experience');
  const stayStops = resolvedItinerary.filter((item) => item.kind === 'stay');
  const orderedRouteStops =
    origin !== null
      ? getOrderedRouteStops(routeStops, origin)
      : [...routeStops].sort((a, b) => a.bookedAt - b.bookedAt);

  if (origin === null) {
    return [...orderedRouteStops, ...stayStops.sort((a, b) => a.bookedAt - b.bookedAt)];
  }

  return insertStayBookingsNearRoute(orderedRouteStops, stayStops, origin);
}

async function getDatasetCenterCoordinate(ctx: QueryCtx): Promise<readonly [number, number] | null> {
  const experiences = await ctx.db.query('experiences').collect();
  const firstExperience = experiences.find((experience) => isCoordinate(experience.coordinate));
  const firstExperienceCoordinate = firstExperience && isCoordinate(firstExperience.coordinate)
    ? firstExperience.coordinate
    : null;

  if (firstExperienceCoordinate) {
    return firstExperienceCoordinate;
  }

  const stays = await ctx.db.query('stays').collect();
  const firstStay = stays.find((stay) => isCoordinate(stay.coordinate));
  const firstStayCoordinate = firstStay && isCoordinate(firstStay.coordinate) ? firstStay.coordinate : null;

  return firstStayCoordinate ?? null;
}

export const getUserItinerary = query({
  args: {
    travelerSlug: v.string(),
    tripId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await getResolvedItinerary(ctx, args.travelerSlug, args.tripId);
  },
});

export const getTripDashboard = query({
  args: {
    travelerSlug: v.string(),
    tripId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolvedTripId = args.tripId ?? (await getFallbackTripId(ctx, args.travelerSlug));
    const trip = await getTripById(ctx, resolvedTripId);
    const itinerary = await getResolvedItinerary(ctx, args.travelerSlug, args.tripId);
    const visits = await ctx.db
      .query('tripVisits')
      .withIndex('by_travelerSlug_and_arrivedAt', (q) => q.eq('travelerSlug', args.travelerSlug))
      .collect();

    const visitByBookingId = new Map(visits.map((visit) => [visit.bookingId, visit]));
    const completedCount = itinerary.reduce(
      (count, item) => count + (visitByBookingId.has(item._id) ? 1 : 0),
      0
    );
    const activeIndex = itinerary.findIndex((item) => !visitByBookingId.has(item._id));
    const progressPercentage =
      itinerary.length > 0 ? Math.round((completedCount / itinerary.length) * 100) : 0;

    const items = itinerary.map((item, index) => {
      const visit = visitByBookingId.get(item._id);
      const isCompleted = Boolean(visit);
      const isActive = activeIndex >= 0 && index === activeIndex;

      return {
        ...item,
        visitedAt: visit?.arrivedAt,
        status: isCompleted
          ? ('completed' as const)
          : isActive
            ? ('active' as const)
            : ('upcoming' as const),
      };
    });

    const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
    const locationItem = activeItem ?? items[items.length - 1] ?? null;
    const baseLocationLabel = locationItem?.experience.locationLabel ?? trip?.name ?? 'Trip';
    const centerCoordinate =
      locationItem?.experience.coordinate ??
      (await getDatasetCenterCoordinate(ctx)) ??
      null;

    return {
      dayTitle: buildDayTitle(baseLocationLabel),
      locationLabel: baseLocationLabel,
      centerCoordinate,
      progressPercentage,
      stopCount: itinerary.length,
      completedCount,
      activeIndex,
      activeItem,
      tripId: resolvedTripId ?? null,
      tripName: trip?.name ?? null,
      items,
    };
  },
});

export const getCurrentTravelerProfile = query({
  args: {},
  handler: async (ctx) => {
    const trips = await ctx.db.query('trips').collect();
    const mostRecentTrip = [...trips].sort((a, b) => b.createdAt - a.createdAt)[0];

    const travelers = await ctx.db.query('appUsers').collect();
    const sortedTravelers = [...travelers].sort((a, b) => a.name.localeCompare(b.name));
    const traveler =
      (mostRecentTrip
        ? sortedTravelers.find((candidate) => candidate.slug === mostRecentTrip.travelerSlug)
        : null) ?? sortedTravelers[0];

    if (!traveler) {
      return null;
    }

    const profile = await ctx.db
      .query('travelerProfiles')
      .withIndex('by_slug', (q) => q.eq('travelerSlug', traveler.slug))
      .unique();

    return {
      slug: traveler.slug,
      name: traveler.name,
      countryCode: traveler.countryCode,
      countryLabel: traveler.countryLabel,
      avatarUri: profile?.avatarUri ?? null,
      regionCode: profile?.regionCode ?? null,
      regionName: profile?.regionName ?? null,
    };
  },
});

export const listUserTrips = query({
  args: { travelerSlug: v.string() },
  handler: async (ctx, args) => {
    const trips = await ctx.db
      .query('trips')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', args.travelerSlug))
      .order('desc')
      .collect();

    const tripsWithPreviews = await Promise.all(
      trips.map(async (trip) => {
        const itinerary = await getResolvedItinerary(ctx, args.travelerSlug, trip._id);
        const previewImage = itinerary[0]?.experience.imageUri ?? null;
        return {
          ...trip,
          name: trip.name.toLowerCase() === 'default' ? 'My Trip' : trip.name,
          previewImage,
        };
      })
    );

    return tripsWithPreviews;
  },
});

export const createTrip = mutation({
  args: {
    name: v.string(),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const tripId = await ctx.db.insert('trips', {
      name: args.name,
      travelerSlug: args.travelerSlug,
      createdAt: Date.now(),
      status: 'active',
    });
    return tripId;
  },
});

export const addExperienceToTrip = mutation({
  args: {
    experienceSlug: v.string(),
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    const resolvedTripId =
      args.tripId ??
      (await getFallbackTripId(ctx, args.travelerSlug)) ??
      (await ctx.db.insert('trips', {
        name: 'My Trip',
        travelerSlug: args.travelerSlug,
        createdAt: Date.now(),
        status: 'active',
      }));

    // Check if already in this trip
    const existing = await ctx.db
      .query('experienceBookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) => 
        q.eq('travelerSlug', args.travelerSlug)
      )
      .collect();
    
    const matching = existing.find(b => b.experienceSlug === args.experienceSlug && b.tripId === resolvedTripId);
    if (matching) return matching._id;

    return await ctx.db.insert('experienceBookings', {
      experienceSlug: args.experienceSlug,
      travelerSlug: args.travelerSlug,
      tripId: resolvedTripId,
      bookedAt: Date.now(),
      bookingType: 'experience',
    });
  },
});

export const removeExperienceFromTrip = mutation({
  args: {
    bookingId: v.id('experienceBookings'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);

    if (!booking || booking.travelerSlug !== args.travelerSlug) {
      return false;
    }

    await ctx.db.delete(args.bookingId);
    return true;
  },
});

export const deleteTrip = mutation({
  args: {
    tripId: v.id('trips'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);

    if (!trip || trip.travelerSlug !== args.travelerSlug) {
      return false;
    }

    const bookings = await ctx.db
      .query('experienceBookings')
      .withIndex('by_tripId', (q) => q.eq('tripId', args.tripId))
      .collect();

    for (const booking of bookings) {
      if (booking.travelerSlug === args.travelerSlug) {
        await ctx.db.delete(booking._id);
      }
    }

    await ctx.db.delete(args.tripId);
    return true;
  },
});

export const bookStay = mutation({
  args: {
    staySlug: v.string(),
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    // Stays are booked using the same experienceBookings table for simplicity in the itinerary
    const existingBooking = await ctx.db
      .query('experienceBookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) =>
        q.eq('travelerSlug', args.travelerSlug).eq('experienceSlug', args.staySlug)
      )
      .unique();

    if (existingBooking) {
      if (args.tripId && existingBooking.tripId !== args.tripId) {
        await ctx.db.patch(existingBooking._id, { tripId: args.tripId });
      }
      return existingBooking._id;
    }

    return await ctx.db.insert('experienceBookings', {
      experienceSlug: args.staySlug,
      travelerSlug: args.travelerSlug,
      tripId: args.tripId,
      bookedAt: Date.now(),
      bookingType: 'stay',
    });
  },
});

export const recordTripArrival = mutation({
  args: {
    bookingId: v.id('experienceBookings'),
    travelerSlug: v.string(),
    source: v.union(v.literal('gps'), v.literal('manual')),
    coordinate: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);

    if (!booking || booking.travelerSlug !== args.travelerSlug) {
      return { created: false, experienceSlug: null as string | null };
    }

    const existingVisit = await ctx.db
      .query('tripVisits')
      .withIndex('by_bookingId', (q) => q.eq('bookingId', args.bookingId))
      .unique();

    if (existingVisit) {
      return { created: false, experienceSlug: existingVisit.experienceSlug };
    }

    await ctx.db.insert('tripVisits', {
      bookingId: booking._id,
      tripId: booking.tripId,
      travelerSlug: booking.travelerSlug,
      experienceSlug: booking.experienceSlug,
      arrivedAt: Date.now(),
      arrivalSource: args.source,
      coordinate: args.coordinate,
    });

    return { created: true, experienceSlug: booking.experienceSlug };
  },
});

export const submitExperienceRating = mutation({
  args: {
    experienceSlug: v.string(),
    travelerSlug: v.string(),
    rating: v.number(),
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const review = args.review?.trim();
    const existingRating = await ctx.db
      .query('experienceRatings')
      .withIndex('by_experienceSlug_and_travelerSlug', (q) =>
        q.eq('experienceSlug', args.experienceSlug).eq('travelerSlug', args.travelerSlug)
      )
      .unique();

    if (existingRating) {
      await ctx.db.patch(existingRating._id, {
        rating: args.rating,
        review: review && review.length > 0 ? review : undefined,
        createdAt: Date.now(),
      });

      return existingRating._id;
    }

    return await ctx.db.insert('experienceRatings', {
      experienceSlug: args.experienceSlug,
      travelerSlug: args.travelerSlug,
      rating: args.rating,
      review: review && review.length > 0 ? review : undefined,
      createdAt: Date.now(),
    });
  },
});

export const listStayRatings = query({
  args: {
    staySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query('stayRatings')
      .withIndex('by_staySlug', (q) => q.eq('staySlug', args.staySlug))
      .order('desc')
      .take(20);

    return await Promise.all(
      ratings.map(async (rating) => {
        const travelerProfile = await ctx.db
          .query('travelerProfiles')
          .withIndex('by_slug', (q) => q.eq('travelerSlug', rating.travelerSlug))
          .unique();

        return {
          _id: rating._id,
          rating: rating.rating,
          review: rating.review ?? '',
          createdAt: rating.createdAt,
          travelerSlug: rating.travelerSlug,
          travelerName: travelerProfile?.name ?? rating.travelerSlug,
          travelerAvatarUri: travelerProfile?.avatarUri ?? null,
          travelerRegionName: travelerProfile?.regionName ?? null,
        };
      })
    );
  },
});

export const submitStayRating = mutation({
  args: {
    staySlug: v.string(),
    travelerSlug: v.string(),
    rating: v.number(),
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const review = args.review?.trim();
    const existingRating = await ctx.db
      .query('stayRatings')
      .withIndex('by_staySlug_and_travelerSlug', (q) =>
        q.eq('staySlug', args.staySlug).eq('travelerSlug', args.travelerSlug)
      )
      .unique();

    if (existingRating) {
      await ctx.db.patch(existingRating._id, {
        rating: args.rating,
        review: review && review.length > 0 ? review : undefined,
        createdAt: Date.now(),
      });

      return existingRating._id;
    }

    return await ctx.db.insert('stayRatings', {
      staySlug: args.staySlug,
      travelerSlug: args.travelerSlug,
      rating: args.rating,
      review: review && review.length > 0 ? review : undefined,
      createdAt: Date.now(),
    });
  },
});

export const listAllStays = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('stays').collect();
  },
});

export const getStayBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('stays')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
  },
});

export const createStayBooking = mutation({
  args: {
    staySlug: v.string(),
    travelerSlug: v.string(),
    checkIn: v.number(),
    checkOut: v.number(),
    totalPrice: v.number(),
    stayBookingDetails: v.object({
      guestCounts: v.object({
        adults: v.number(),
        children: v.number(),
      }),
      roomCount: v.number(),
      roomTypeId: v.string(),
      roomTypeLabel: v.string(),
      bedOptionId: v.string(),
      bedOptionLabel: v.string(),
      arrivalWindowId: v.string(),
      arrivalWindowLabel: v.string(),
      specialRequest: v.optional(v.string()),
      guestSummary: v.string(),
      roomSummary: v.string(),
    }),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existingStayBookings = await ctx.db
      .query('stayBookings')
      .withIndex('by_staySlug', (q) => q.eq('staySlug', args.staySlug))
      .collect();

    const travelerStayBookings = existingStayBookings.filter(
      (booking) => booking.travelerSlug === args.travelerSlug && booking.status === 'pending'
    );

    let bookingId: Id<'stayBookings'>;

    if (travelerStayBookings.length > 0) {
      const [primaryBooking, ...duplicateBookings] = [...travelerStayBookings].sort(
        (a, b) => b.bookedAt - a.bookedAt
      );

      await ctx.db.patch(primaryBooking._id, {
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        totalPrice: args.totalPrice,
        bookedAt: now,
        stayBookingDetails: args.stayBookingDetails,
      });
      bookingId = primaryBooking._id;

      for (const duplicateBooking of duplicateBookings) {
        await ctx.db.delete(duplicateBooking._id);
      }
    } else {
      bookingId = await ctx.db.insert('stayBookings', {
        staySlug: args.staySlug,
        travelerSlug: args.travelerSlug,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        totalPrice: args.totalPrice,
        status: 'pending',
        bookedAt: now,
        stayBookingDetails: args.stayBookingDetails,
      });
    }

    if (args.tripId) {
      const existingExperienceBookings = await ctx.db
        .query('experienceBookings')
        .withIndex('by_travelerSlug_and_experienceSlug', (q) =>
          q.eq('travelerSlug', args.travelerSlug).eq('experienceSlug', args.staySlug)
        )
        .collect();

      if (existingExperienceBookings.length > 0) {
        const [primaryBooking, ...duplicateBookings] = [...existingExperienceBookings].sort(
          (a, b) => b.bookedAt - a.bookedAt
        );

        await ctx.db.patch(primaryBooking._id, {
          tripId: args.tripId,
          bookedAt: now,
          bookingType: 'stay',
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          totalPrice: args.totalPrice,
          stayBookingDetails: args.stayBookingDetails,
        });

        for (const duplicateBooking of duplicateBookings) {
          await ctx.db.delete(duplicateBooking._id);
        }
      } else {
        await ctx.db.insert('experienceBookings', {
          experienceSlug: args.staySlug,
          travelerSlug: args.travelerSlug,
          tripId: args.tripId,
          bookedAt: now,
          bookingType: 'stay',
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          totalPrice: args.totalPrice,
          stayBookingDetails: args.stayBookingDetails,
        });
      }
    }

    return bookingId;
  },
});

export const getStayAvailability = query({
  args: { staySlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('stayBookings')
      .withIndex('by_staySlug', (q) => q.eq('staySlug', args.staySlug))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect();
  },
});
