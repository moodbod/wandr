import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

import type { ExploreExperience, ExploreHiddenGem } from '../constants/explore-content';
import { assertCurrentTravelerSlug, requireAdmin } from './authHelpers';
import { getPublicTravelerProfile } from './appProfiles';

type TripItineraryItem = {
  _id: Id<'bookings'>;
  _creationTime: number;
  experienceSlug: string;
  travelerSlug: string;
  tripId?: Id<'trips'>;
  bookedAt: number;
  kind: 'experience' | 'stay' | 'hiddenGem';
  experience: ExploreExperience;
  stay?: ReturnType<typeof normalizeStayForTrip> | null;
  checkIn?: number;
  checkOut?: number;
  totalPrice?: number;
  stayBookingDetails?: Doc<'reservations'>['stayBookingDetails'];
};

export const getCurrentTravelerProfile = query({
  args: {
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.travelerSlug) {
      return null;
    }

    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const profile = await getPublicTravelerProfile(ctx, travelerSlug);

    if (!profile) {
      return null;
    }

    return {
      slug: profile.slug,
      name: profile.name,
      email: profile.email,
      countryCode: profile.countryCode,
      countryLabel: profile.countryLabel,
      role: profile.role,
      homeCity: profile.homeCity,
      travelStyle: profile.travelStyle,
      onboardingCompletedAt: profile.onboardingCompletedAt,
      avatarUri: profile.avatarUri,
      regionCode: profile.regionCode,
      regionName: profile.regionName,
    };
  },
});


async function getFallbackTripId(ctx: QueryCtx, travelerSlug: string) {
  const trips = await ctx.db
    .query('trips')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .order('desc')
    .collect();

  return trips[0]?._id;
}

async function getResolvedTrip(ctx: QueryCtx, travelerSlug: string, tripId?: Id<'trips'>) {
  const resolvedTripId = tripId ?? (await getFallbackTripId(ctx, travelerSlug));

  if (!resolvedTripId) {
    return null;
  }

  const trip = await ctx.db.get(resolvedTripId);
  return trip?.travelerSlug === travelerSlug ? trip : null;
}

function isCoordinate(value: readonly number[] | undefined): value is readonly [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function normalizeStayForTrip(stay: Doc<'stays'>) {
  const coordinate = isCoordinate(stay.coordinate) ? stay.coordinate : ([0, 0] as const);

  return {
    ...stay,
    id: stay.slug,
    coordinate,
    priceLabel: `$${stay.pricePerNight}`,
  };
}

function stayToExperience(stay: ReturnType<typeof normalizeStayForTrip>): ExploreExperience {
  return {
    slug: stay.slug,
    badge: 'Stay',
    ctaLabel: 'View stay',
    title: stay.name,
    subtitle: stay.sleepSignal,
    description: stay.summary,
    imageUri: stay.imageUri,
    price: `$${stay.pricePerNight}`,
    priceSuffix: 'night',
    category: stay.routeVibe,
    countryCode: stay.countryCode,
    countryLabel: stay.countryLabel,
    planningLocationId: stay.planningLocationId,
    coordinate: stay.coordinate,
    geography: { region: stay.region, town: stay.town },
    locationLabel: stay.locationLabel,
    durationLabel: 'Overnight',
    galleryImages: stay.galleryImages,
    includes: stay.amenities,
  };
}

function getItineraryCoordinate(item: TripItineraryItem | null | undefined) {
  return item?.stay?.coordinate ?? item?.experience.coordinate;
}

function getHiddenGemSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hiddenGemToExperience(gem: Doc<'gems'>): ExploreExperience {
  return {
    slug: getHiddenGemSlug(gem.title),
    itemKind: 'hiddenGem',
    badge: gem.badge ?? 'Hidden Gem',
    ctaLabel: gem.primaryLabel ?? 'Add to trip',
    title: gem.title,
    subtitle: gem.locationLabel ?? gem.geography?.town ?? gem.geography?.region ?? 'Hidden gem',
    description: gem.summary ?? gem.description,
    imageUri: gem.imageUri,
    price: 'Free',
    priceSuffix: 'detour',
    category: 'Hidden Gem',
    coordinate: gem.coordinate as ExploreHiddenGem['coordinate'],
    geography: gem.geography,
    locationLabel: gem.locationLabel,
    tripFit: gem.tripFit,
    includes: gem.visitTips ?? [],
  };
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

function getOrderedRouteStops(itinerary: TripItineraryItem[]) {
  const withCoordinates = itinerary.filter(
    (item) => isCoordinate(getItineraryCoordinate(item))
  );
  const withoutCoordinates = itinerary.filter((item) => !isCoordinate(getItineraryCoordinate(item)));

  const remaining = [...withCoordinates];
  const ordered: TripItineraryItem[] = [];
  const firstStop = remaining.shift();
  if (firstStop) {
    ordered.push(firstStop);
  }
  let currentPoint = firstStop ? getItineraryCoordinate(firstStop) as readonly [number, number] : null;

  while (currentPoint && remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = getDistanceInKm(currentPoint, getItineraryCoordinate(remaining[0]) as readonly [number, number]);

    for (let index = 1; index < remaining.length; index += 1) {
      const distance = getDistanceInKm(currentPoint, getItineraryCoordinate(remaining[index]) as readonly [number, number]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [nextStop] = remaining.splice(nearestIndex, 1);
    ordered.push(nextStop);
    currentPoint = getItineraryCoordinate(nextStop) as readonly [number, number];
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

async function getFriendSummary(ctx: QueryCtx, travelerSlug: string) {
  const profile = await getPublicTravelerProfile(ctx, travelerSlug);

  return {
    name: profile?.name ?? travelerSlug,
    avatarUri: profile?.avatarUri ?? null,
    baseLabel: profile?.baseLabel ?? 'Traveler',
  };
}

async function getTripGroupDetails(
  ctx: QueryCtx,
  trip: Doc<'trips'>,
  travelerSlug: string
) {
  if (!trip.circleId) {
    return null;
  }

  const circleId = trip.circleId;
  const circle = await ctx.db.get(circleId);
  if (!circle) {
    return null;
  }

  const members = await ctx.db
    .query('members')
    .withIndex('by_circleId', (q) => q.eq('circleId', circleId))
    .collect();
  const memberProfiles = await Promise.all(
    members.map(async (member) => {
      const summary = await getFriendSummary(ctx, member.travelerSlug);

      return {
        travelerSlug: member.travelerSlug,
        name: summary.name,
        avatarUri: summary.avatarUri,
        baseLabel: summary.baseLabel,
        status: member.status,
        role: member.role,
      };
    })
  );

  return {
    circleId: circle._id,
    name: circle.name,
    destinationLabel: circle.destinationLabel,
    memberCount: members.filter((member) => member.status === 'active').length,
    invitedCount: members.filter((member) => member.status === 'invited').length,
    isHost: members.some(
      (member) => member.travelerSlug === travelerSlug && member.role === 'host' && member.status === 'active'
    ),
    members: memberProfiles,
  };
}

async function getResolvedItinerary(
  ctx: QueryCtx,
  travelerSlug: string,
  tripId?: Id<'trips'>
): Promise<TripItineraryItem[]> {
  const trip = await getResolvedTrip(ctx, travelerSlug, tripId);

  if (!trip) {
    return [];
  }

  let bookingsQuery = ctx.db
    .query('bookings')
    .withIndex('by_travelerSlug_and_experienceSlug', (q) => q.eq('travelerSlug', travelerSlug));

  const bookings = (await bookingsQuery.collect()).filter((b) => b.tripId === trip._id);

  const [allExperiences, allHiddenGems, allStays, reservations] = await Promise.all([
    ctx.db.query('experiences').collect(),
    ctx.db.query('gems').collect(),
    ctx.db.query('stays').collect(),
    ctx.db
      .query('reservations')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
      .collect(),
  ]);

  if (allExperiences.length === 0 && allStays.length === 0) {
    return [];
  }

  if (bookings.length === 0) {
    return [];
  }

  const resolvedItinerary = bookings
    .map<TripItineraryItem | null>((booking) => {
      const experience = allExperiences.find((item) => item.slug === booking.experienceSlug);

      if (experience) {
        return {
          ...booking,
          kind: 'experience',
          experience: experience as ExploreExperience,
        };
      }

      const hiddenGem = allHiddenGems.find((item) => getHiddenGemSlug(item.title) === booking.experienceSlug);

      if (hiddenGem) {
        return {
          ...booking,
          kind: 'hiddenGem',
          experience: hiddenGemToExperience(hiddenGem),
        };
      }

      const stay = allStays.find((item) => item.slug === booking.experienceSlug);

      if (!stay) {
        return null;
      }

      const normalizedStay = normalizeStayForTrip(stay);
      const stayBooking = reservations
        .filter((item) => item.staySlug === stay.slug)
        .sort((a, b) => b.bookedAt - a.bookedAt)[0];

      return {
        ...booking,
        kind: 'stay',
        experience: stayToExperience(normalizedStay),
        stay: normalizedStay,
        checkIn: stayBooking?.checkIn,
        checkOut: stayBooking?.checkOut,
        totalPrice: stayBooking?.totalPrice,
        stayBookingDetails: stayBooking?.stayBookingDetails,
      };
    })
    .filter((item): item is TripItineraryItem => item !== null);

  return getOrderedRouteStops(resolvedItinerary);
}

export const getUserItinerary = query({
  args: {
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    return await getResolvedItinerary(ctx, travelerSlug, args.tripId);
  },
});

export const getTripDashboard = query({
  args: {
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const resolvedTrip = await getResolvedTrip(ctx, travelerSlug, args.tripId);
    const itinerary = resolvedTrip ? await getResolvedItinerary(ctx, travelerSlug, resolvedTrip._id) : [];
    const visits = await ctx.db
      .query('visits')
      .withIndex('by_travelerSlug_and_arrivedAt', (q) => q.eq('travelerSlug', travelerSlug))
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
    const baseLocationLabel = locationItem?.stay?.locationLabel ?? locationItem?.experience.locationLabel;
    const centerCoordinate = getItineraryCoordinate(locationItem) ?? null;

    return {
      dayTitle: buildDayTitle(baseLocationLabel),
      locationLabel: baseLocationLabel,
      centerCoordinate,
      progressPercentage,
      stopCount: itinerary.length,
      completedCount,
      activeIndex,
      activeItem,
      tripId: resolvedTrip?._id ?? null,
      tripName: resolvedTrip
        ? resolvedTrip.name.toLowerCase() === 'default'
          ? 'My Trip'
          : resolvedTrip.name
        : null,
      visibility: resolvedTrip?.visibility ?? 'private',
      isGroupTrip: Boolean(resolvedTrip?.circleId),
      group: resolvedTrip?.circleId ? await getTripGroupDetails(ctx, resolvedTrip, travelerSlug) : null,
      items,
    };
  },
});

export const listUserTrips = query({
  args: { travelerSlug: v.string() },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const trips = await ctx.db
      .query('trips')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
      .order('desc')
      .collect();

    const tripsWithPreviews = await Promise.all(
      trips.map(async (trip) => {
        const itinerary = await getResolvedItinerary(ctx, travelerSlug, trip._id);
        const previewImage = itinerary[0]?.stay?.imageUri ?? itinerary[0]?.experience.imageUri ?? null;
        const centerCoordinate = itinerary[0] ? getItineraryCoordinate(itinerary[0]) ?? null : null;
        return {
          ...trip,
          name: trip.name.toLowerCase() === 'default' ? 'My Trip' : trip.name,
          visibility: trip.visibility ?? 'private',
          previewImage,
          centerCoordinate,
          isGroupTrip: Boolean(trip.circleId),
        };
      })
    );

    return tripsWithPreviews;
  },
});

export const getTripSettings = query({
  args: {
    travelerSlug: v.string(),
    tripId: v.id('trips'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.travelerSlug !== travelerSlug) {
      return null;
    }

    return {
      tripId: trip._id,
      name: trip.name.toLowerCase() === 'default' ? 'My Trip' : trip.name,
      visibility: trip.visibility ?? 'private',
      canChangeVisibility: true,
      isGroupTrip: Boolean(trip.circleId),
      invitedFriendSlugs: [],
      friends: [],
    };
  },
});

export const listTravelerHistory = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const visits = await ctx.db
      .query('visits')
      .withIndex('by_travelerSlug_and_arrivedAt', (q) => q.eq('travelerSlug', travelerSlug))
      .order('desc')
      .take(50);

    return await Promise.all(
      visits.map(async (visit) => {
        const experience = await ctx.db
          .query('experiences')
          .withIndex('by_slug', (q) => q.eq('slug', visit.experienceSlug))
          .unique();

        return {
          _id: visit._id,
          slug: visit.experienceSlug,
          title: experience?.title ?? visit.experienceSlug,
          subtitle: experience?.locationLabel ?? experience?.subtitle ?? 'Visited place',
          imageUri: experience?.imageUri ?? null,
          createdAt: visit.arrivedAt,
          kind: 'experience' as const,
          tripId: visit.tripId,
        };
      })
    );
  },
});

export const listTravelerBookings = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [bookings, reservations, trips] = await Promise.all([
      ctx.db
        .query('bookings')
        .withIndex('by_travelerSlug_and_bookedAt', (q) => q.eq('travelerSlug', travelerSlug))
        .order('desc')
        .take(50),
      ctx.db
        .query('reservations')
        .withIndex('by_travelerSlug_and_bookedAt', (q) => q.eq('travelerSlug', travelerSlug))
        .order('desc')
        .take(50),
      ctx.db
        .query('trips')
        .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
        .collect(),
    ]);

    const tripNameById = new Map(trips.map((trip) => [trip._id, trip.name]));

    const experiences = await Promise.all(
      bookings.map(async (booking) => {
        const experience = await ctx.db
          .query('experiences')
          .withIndex('by_slug', (q) => q.eq('slug', booking.experienceSlug))
          .unique();

        const bookingStatus = booking.status ?? 'confirmed';

        return {
          _id: booking._id,
          source: 'experienceBooking' as const,
          slug: booking.experienceSlug,
          title: experience?.title ?? booking.experienceSlug,
          subtitle: experience?.locationLabel ?? experience?.subtitle ?? 'Experience booking',
          imageUri: experience?.imageUri ?? null,
          bookedAt: booking.bookedAt,
          kind: 'experience' as const,
          status: bookingStatus,
          statusLabel: bookingStatus,
          tripId: booking.tripId,
          tripName: booking.tripId ? tripNameById.get(booking.tripId) ?? null : null,
        };
      })
    );

    const stays = await Promise.all(
      reservations.map(async (booking) => {
        const stay = await ctx.db
          .query('stays')
          .withIndex('by_slug', (q) => q.eq('slug', booking.staySlug))
          .unique();

        return {
          _id: booking._id,
          source: 'stayBooking' as const,
          slug: booking.staySlug,
          title: stay?.name ?? booking.staySlug,
          subtitle: stay?.locationLabel ?? 'Stay booking',
          imageUri: stay?.imageUri ?? null,
          bookedAt: booking.bookedAt,
          kind: 'stay' as const,
          status: booking.status,
          statusLabel: booking.status,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalPrice: booking.totalPrice,
          detailLabel: `${Math.max(1, Math.round((booking.checkOut - booking.checkIn) / 86_400_000))} night stay`,
        };
      })
    );

    return [...experiences, ...stays].sort((a, b) => b.bookedAt - a.bookedAt);
  },
});

export const listManagedBookings = query({
  args: {
    managerSlug: v.string(),
    status: v.optional(v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled'))),
  },
  handler: async (ctx, args) => {
    const manager = await requireAdmin(ctx);
    const managerSlug = manager.slug;
    const status = args.status;
    const [bookings, reservations] = await Promise.all([
      status
        ? ctx.db
            .query('bookings')
            .withIndex('by_status_and_bookedAt', (q) => q.eq('status', status))
            .order('desc')
            .take(80)
        : ctx.db.query('bookings').order('desc').take(80),
      status
        ? ctx.db
            .query('reservations')
            .withIndex('by_status_and_bookedAt', (q) => q.eq('status', status))
            .order('desc')
            .take(80)
        : ctx.db.query('reservations').order('desc').take(80),
    ]);

    const experiences = await Promise.all(
      bookings.map(async (booking) => {
        const [experience, trip] = await Promise.all([
          ctx.db
            .query('experiences')
            .withIndex('by_slug', (q) => q.eq('slug', booking.experienceSlug))
            .unique(),
          booking.tripId ? ctx.db.get(booking.tripId) : null,
        ]);
        const bookingStatus = booking.status ?? 'confirmed';

        if (experience?.managerSlug !== managerSlug) {
          return null;
        }

        return {
          _id: booking._id,
          source: 'experienceBooking' as const,
          slug: booking.experienceSlug,
          title: experience?.title ?? booking.experienceSlug,
          subtitle: experience?.locationLabel ?? experience?.subtitle ?? 'Experience booking',
          imageUri: experience?.imageUri ?? null,
          bookedAt: booking.bookedAt,
          kind: 'experience' as const,
          status: bookingStatus,
          statusLabel: bookingStatus,
          travelerSlug: booking.travelerSlug,
          tripId: booking.tripId,
          tripName: trip?.name ?? null,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalPrice: booking.totalPrice,
          detailLabel: trip?.name ? `Trip: ${trip.name}` : 'Experience request',
        };
      })
    );

    const stays = await Promise.all(
      reservations.map(async (booking) => {
        const stay = await ctx.db
          .query('stays')
          .withIndex('by_slug', (q) => q.eq('slug', booking.staySlug))
          .unique();

        if (stay?.managerSlug !== managerSlug) {
          return null;
        }

        return {
          _id: booking._id,
          source: 'stayBooking' as const,
          slug: booking.staySlug,
          title: stay?.name ?? booking.staySlug,
          subtitle: stay?.locationLabel ?? 'Stay booking',
          imageUri: stay?.imageUri ?? null,
          bookedAt: booking.bookedAt,
          kind: 'stay' as const,
          status: booking.status,
          statusLabel: booking.status,
          travelerSlug: booking.travelerSlug,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalPrice: booking.totalPrice,
          stayBookingDetails: booking.stayBookingDetails,
          detailLabel: booking.stayBookingDetails
            ? `${booking.stayBookingDetails.roomSummary} · ${booking.stayBookingDetails.guestSummary}`
            : `${Math.max(1, Math.round((booking.checkOut - booking.checkIn) / 86_400_000))} night stay`,
        };
      })
    );

    const ownedExperiences = experiences.filter((booking): booking is NonNullable<typeof booking> => Boolean(booking));
    const ownedStays = stays.filter((booking): booking is NonNullable<typeof booking> => Boolean(booking));

    return [...ownedExperiences, ...ownedStays].sort((a, b) => b.bookedAt - a.bookedAt).slice(0, 100);
  },
});

export const updateManagedBookingStatus = mutation({
  args: {
    bookingId: v.union(v.id('bookings'), v.id('reservations')),
    source: v.union(v.literal('experienceBooking'), v.literal('stayBooking')),
    status: v.union(v.literal('confirmed'), v.literal('cancelled')),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.source === 'experienceBooking') {
      const bookingId = args.bookingId as Id<'bookings'>;
      const booking = await ctx.db.get(bookingId);

      if (!booking) {
        return false;
      }

      await ctx.db.patch(bookingId, { status: args.status });
      return true;
    }

    const bookingId = args.bookingId as Id<'reservations'>;
    const booking = await ctx.db.get(bookingId);

    if (!booking) {
      return false;
    }

    await ctx.db.patch(bookingId, { status: args.status });
    return true;
  },
});

export const createTrip = mutation({
  args: {
    name: v.string(),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const tripId = await ctx.db.insert('trips', {
      name: args.name,
      travelerSlug,
      createdAt: Date.now(),
      status: 'active',
    });
    return tripId;
  },
});

export const updateTripSettings = mutation({
  args: {
    tripId: v.id('trips'),
    travelerSlug: v.string(),
    name: v.string(),
    visibility: v.union(v.literal('private'), v.literal('public')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.travelerSlug !== travelerSlug) {
      return false;
    }

    await ctx.db.patch(args.tripId, {
      name: args.name.trim() || trip.name,
      visibility: args.visibility,
    });

    return true;
  },
});

export const inviteFriendsToTrip = mutation({
  args: {
    tripId: v.id('trips'),
    travelerSlug: v.string(),
    friendSlugs: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.travelerSlug !== travelerSlug) {
      return false;
    }

    const now = Date.now();
    for (const friendSlug of [...new Set(args.friendSlugs)].filter((slug) => slug !== travelerSlug)) {
      await ctx.db.insert('invites', {
        tripId: args.tripId,
        inviterSlug: travelerSlug,
        inviteeSlug: friendSlug,
        status: 'invited',
        createdAt: now,
      });
    }

    return true;
  },
});

export const addExperienceToTrip = mutation({
  args: {
    experienceSlug: v.string(),
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const resolvedTripId =
      args.tripId ??
      (await getFallbackTripId(ctx, travelerSlug)) ??
      (await ctx.db.insert('trips', {
        name: 'My Trip',
        travelerSlug,
        createdAt: Date.now(),
        status: 'active',
      }));

    // Check if already in this trip
    const existing = await ctx.db
      .query('bookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) => 
        q.eq('travelerSlug', travelerSlug)
      )
      .collect();
    
    const matching = existing.find(b => b.experienceSlug === args.experienceSlug && b.tripId === resolvedTripId);
    if (matching) return matching._id;

    return await ctx.db.insert('bookings', {
      experienceSlug: args.experienceSlug,
      travelerSlug,
      tripId: resolvedTripId,
      bookedAt: Date.now(),
      status: 'pending',
    });
  },
});

export const removeExperienceFromTrip = mutation({
  args: {
    bookingId: v.id('bookings'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const booking = await ctx.db.get(args.bookingId);

    if (!booking || booking.travelerSlug !== travelerSlug) {
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
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const trip = await ctx.db.get(args.tripId);

    if (!trip || trip.travelerSlug !== travelerSlug) {
      return false;
    }

    const bookings = await ctx.db
      .query('bookings')
      .withIndex('by_tripId', (q) => q.eq('tripId', args.tripId))
      .collect();

    for (const booking of bookings) {
      if (booking.travelerSlug === travelerSlug) {
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
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    // Stays are booked using the same bookings table for simplicity in the itinerary
    const existingBooking = await ctx.db
      .query('bookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('experienceSlug', args.staySlug)
      )
      .unique();

    if (existingBooking) {
      if (args.tripId && existingBooking.tripId !== args.tripId) {
        await ctx.db.patch(existingBooking._id, { tripId: args.tripId });
      }
      return existingBooking._id;
    }

    return await ctx.db.insert('bookings', {
      experienceSlug: args.staySlug,
      travelerSlug,
      tripId: args.tripId,
      bookedAt: Date.now(),
    });
  },
});

export const recordTripArrival = mutation({
  args: {
    bookingId: v.id('bookings'),
    travelerSlug: v.string(),
    source: v.union(v.literal('gps'), v.literal('manual')),
    coordinate: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const booking = await ctx.db.get(args.bookingId);

    if (!booking || booking.travelerSlug !== travelerSlug) {
      return { created: false, experienceSlug: null as string | null };
    }

    const existingVisit = await ctx.db
      .query('visits')
      .withIndex('by_bookingId', (q) => q.eq('bookingId', args.bookingId))
      .unique();

    if (existingVisit) {
      return { created: false, experienceSlug: existingVisit.experienceSlug };
    }

    await ctx.db.insert('visits', {
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
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const review = args.review?.trim();
    const existingRating = await ctx.db
      .query('ratings')
      .withIndex('by_experienceSlug_and_travelerSlug', (q) =>
        q.eq('experienceSlug', args.experienceSlug).eq('travelerSlug', travelerSlug)
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

    return await ctx.db.insert('ratings', {
      experienceSlug: args.experienceSlug,
      travelerSlug,
      rating: args.rating,
      review: review && review.length > 0 ? review : undefined,
      createdAt: Date.now(),
    });
  },
});

export const createStayBooking = mutation({
  args: {
    staySlug: v.string(),
    travelerSlug: v.string(),
    checkIn: v.number(),
    checkOut: v.number(),
    totalPrice: v.number(),
    stayBookingDetails: v.optional(
      v.object({
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
      })
    ),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    // 1. Create the official property booking
    const bookingId = await ctx.db.insert('reservations', {
      staySlug: args.staySlug,
      travelerSlug,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      totalPrice: args.totalPrice,
      status: 'pending',
      bookedAt: Date.now(),
      stayBookingDetails: args.stayBookingDetails,
    });

    // 2. If a tripId is provided, also link it to the trip itinerary
    // This allows the stay to appear on the trip map and branching routes
    if (args.tripId) {
      await ctx.db.insert('bookings', {
        experienceSlug: args.staySlug,
        travelerSlug,
        tripId: args.tripId,
        bookedAt: Date.now(),
      });
    }

    return bookingId;
  },
});

export const listAllStays = query({
  args: {},
  handler: async (ctx) => {
    const stays = await ctx.db.query('stays').collect();
    return stays.map((stay) => ({
      ...stay,
      id: stay.slug,
      priceLabel: `$${stay.pricePerNight}`,
    }));
  },
});

export const listManagedStays = query({
  args: { managerSlug: v.string() },
  handler: async (ctx, args) => {
    const manager = await requireAdmin(ctx);
    const managerSlug = manager.slug;
    const stays = await ctx.db
      .query('stays')
      .withIndex('by_managerSlug', (q) => q.eq('managerSlug', managerSlug))
      .take(100);

    return stays.map((stay) => ({
      ...stay,
      id: stay.slug,
      priceLabel: `$${stay.pricePerNight}`,
    }));
  },
});

async function createUniqueStaySlug(ctx: MutationCtx, name: string) {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'stay';
  let slug = base;
  let suffix = 2;

  while (
    await ctx.db
      .query('stays')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export const createManagedStay = mutation({
  args: {
    managerSlug: v.string(),
    name: v.string(),
    locationLabel: v.string(),
    town: v.string(),
    region: v.string(),
    countryCode: v.optional(v.string()),
    countryLabel: v.optional(v.string()),
    planningLocationId: v.optional(v.string()),
    summary: v.string(),
    coordinate: v.array(v.number()),
    imageUri: v.string(),
    galleryImages: v.array(v.string()),
    priceUsd: v.number(),
    currencyCode: v.string(),
    rating: v.number(),
    reviewCount: v.number(),
    bookingNote: v.string(),
    stayStyle: v.union(v.literal('design'), v.literal('lodge'), v.literal('roadside'), v.literal('wellness')),
    routeVibe: v.union(v.literal('city reset'), v.literal('coast base'), v.literal('wildlife stop'), v.literal('desert night')),
    sleepSignal: v.string(),
    idealFor: v.array(v.string()),
    amenities: v.array(v.string()),
    nearbyHighlights: v.array(v.string()),
    bookingProfile: v.object({
      roomOptions: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          detail: v.string(),
          maxAdults: v.number(),
          maxChildren: v.number(),
          maxRooms: v.number(),
          bedOptions: v.array(
            v.object({
              id: v.string(),
              label: v.string(),
            })
          ),
        })
      ),
      arrivalOptions: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
        })
      ),
      defaultRoomOptionId: v.string(),
      defaultArrivalOptionId: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const manager = await requireAdmin(ctx);
    const slug = await createUniqueStaySlug(ctx, args.name);

    await ctx.db.insert('stays', {
      slug,
      managerSlug: manager.slug,
      name: args.name,
      locationLabel: args.locationLabel,
      town: args.town,
      region: args.region,
      countryCode: args.countryCode,
      countryLabel: args.countryLabel,
      planningLocationId: args.planningLocationId,
      coordinate: args.coordinate,
      imageUri: args.imageUri,
      galleryImages: args.galleryImages,
      pricePerNight: args.priceUsd,
      currencyCode: args.currencyCode,
      rating: args.rating,
      reviewCount: args.reviewCount,
      stayStyle: args.stayStyle,
      routeVibe: args.routeVibe,
      sleepSignal: args.sleepSignal,
      summary: args.summary,
      idealFor: args.idealFor,
      amenities: args.amenities,
      nearbyHighlights: args.nearbyHighlights,
      bookingProfile: args.bookingProfile,
      bookingNote: args.bookingNote,
    });

    return { roomId: args.bookingProfile.defaultRoomOptionId, slug };
  },
});

export const getStayBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const stay = await ctx.db
      .query('stays')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    return stay ? { ...stay, id: stay.slug, priceLabel: `$${stay.pricePerNight}` } : null;
  },
});

export const getTravelerStayBooking = query({
  args: {
    staySlug: v.string(),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const bookings = await ctx.db
      .query('reservations')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
      .collect();

    return bookings.find((booking) => booking.staySlug === args.staySlug) ?? null;
  },
});

export const listStayRatings = query({
  args: {
    staySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query('reviews')
      .withIndex('by_staySlug', (q) => q.eq('staySlug', args.staySlug))
      .order('desc')
      .take(50);

    return await Promise.all(
      ratings.map(async (rating) => {
        const profile = await getPublicTravelerProfile(ctx, rating.travelerSlug);

        return {
          ...rating,
          review: rating.review ?? '',
          travelerName: profile?.name ?? rating.travelerSlug,
          travelerAvatarUri: profile?.avatarUri ?? null,
          travelerRegionName: profile?.regionName ?? null,
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
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const review = args.review?.trim();
    const existingRating = await ctx.db
      .query('reviews')
      .withIndex('by_staySlug_and_travelerSlug', (q) =>
        q.eq('staySlug', args.staySlug).eq('travelerSlug', travelerSlug)
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

    return await ctx.db.insert('reviews', {
      staySlug: args.staySlug,
      travelerSlug,
      rating: args.rating,
      review: review && review.length > 0 ? review : undefined,
      createdAt: Date.now(),
    });
  },
});

export const getStayAvailability = query({
  args: { staySlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('reservations')
      .withIndex('by_staySlug', (q) => q.eq('staySlug', args.staySlug))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect();
  },
});
