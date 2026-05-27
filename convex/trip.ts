import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

import type { ExploreExperience, ExploreHiddenGem } from '../constants/explore-content';
import { recordAdminAuditEvent } from './adminAudit';
import { assertCurrentTravelerSlug, requireAdmin } from './authHelpers';
import { getPublicTravelerProfile } from './appProfiles';

type TripItineraryItem = {
  _id: Id<'bookings'>;
  _creationTime: number;
  experienceSlug: string;
  contentKind?: 'location' | 'experience' | 'stay';
  contentSlug?: string;
  travelerSlug: string;
  tripId?: Id<'trips'>;
  reservationId?: Id<'reservations'>;
  bookedAt: number;
  requestKind?: 'experienceRequest' | 'itineraryStop' | 'stayItineraryMirror';
  scheduledFor?: number;
  partySize?: number;
  travelerNote?: string;
  currencyCode?: string;
  priceSnapshot?: number;
  kind: 'location' | 'experience' | 'stay' | 'hiddenGem';
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


async function getFallbackTripId(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  const trips = await ctx.db
    .query('trips')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .order('desc')
    .take(1);

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

async function getCanonicalTripForItinerary(ctx: QueryCtx | MutationCtx, trip: Doc<'trips'>) {
  if (!trip.circleId) {
    return trip;
  }

  const circle = await ctx.db.get(trip.circleId);
  const canonicalTripId = circle?.tripId ?? trip.sourceTripId;

  if (!canonicalTripId || canonicalTripId === trip._id) {
    return trip;
  }

  const canonicalTrip = await ctx.db.get(canonicalTripId);
  return canonicalTrip?.circleId === trip.circleId ? canonicalTrip : trip;
}

function assertCanMutateTrip(trip: Doc<'trips'>, travelerSlug: string) {
  if (trip.travelerSlug !== travelerSlug) {
    throw new Error('Trip not found.');
  }

  if (trip.circleId && trip.groupRole === 'member') {
    throw new Error('Only the group host can update this shared trip.');
  }
}

function normalizePartySize(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(99, Math.max(1, Math.round(value)));
}

function normalizeCurrencyCode(value?: string) {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized.slice(0, 8) : undefined;
}

function normalizeRequestNote(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 500) : undefined;
}

function normalizePriceSnapshot(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.round(value * 100) / 100;
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
  if (!isCoordinate(stay.coordinate)) {
    return null;
  }

  return {
    ...stay,
    id: stay.slug,
    coordinate: stay.coordinate,
    priceLabel: `$${stay.pricePerNight}`,
  };
}

function normalizeLocationForTrip(location: Doc<'locations'>) {
  if (!isCoordinate(location.coordinate)) {
    return null;
  }

  return {
    ...location,
    id: location.slug,
    coordinate: location.coordinate,
  };
}

function locationToExperience(location: NonNullable<ReturnType<typeof normalizeLocationForTrip>>): ExploreExperience {
  return {
    slug: location.slug,
    itemKind: 'location',
    badge: location.badge ?? 'Location',
    ctaLabel: 'Add to trip',
    title: location.title,
    subtitle: location.locationLabel,
    description: location.summary ?? location.description,
    imageUri: location.imageUri,
    price: 'Free',
    priceSuffix: 'stop',
    category: location.category,
    countryCode: location.countryCode,
    countryLabel: location.countryLabel,
    planningLocationId: location.planningLocationId,
    coordinate: location.coordinate,
    geography: { region: location.region, town: location.town },
    locationLabel: location.locationLabel,
    durationLabel: 'Trip stop',
    galleryImages: location.galleryImages,
    includes: location.visitTips,
    sections: location.sections,
    summary: location.summary ?? location.description,
    visitTips: location.visitTips,
    primaryLabel: 'Add to trip',
  };
}

function stayToExperience(stay: NonNullable<ReturnType<typeof normalizeStayForTrip>>): ExploreExperience {
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

function isLiveContent(status?: 'draft' | 'live' | 'archived') {
  return status === undefined || status === 'live';
}

function isPublicProviderContent(item: { businessProfileId?: Id<'businessProfiles'>; reviewStatus?: 'draft' | 'submitted' | 'approved' | 'rejected' }) {
  return !item.businessProfileId || item.reviewStatus === 'approved';
}

function hiddenGemToExperience(gem: Doc<'gems'>): ExploreExperience {
  return {
    slug: getHiddenGemSlug(gem.title),
    itemKind: 'location',
    badge: gem.badge ?? 'Location',
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

function hiddenGemExperienceToLocationExperience(experience: Doc<'experiences'>): ExploreExperience {
  return {
    slug: experience.slug,
    itemKind: 'location',
    badge: experience.badge ?? 'Location',
    ctaLabel: experience.primaryLabel ?? 'Add to trip',
    title: experience.title,
    subtitle: experience.locationLabel ?? experience.subtitle,
    description: experience.summary ?? experience.description,
    imageUri: experience.imageUri,
    price: 'Free',
    priceSuffix: 'stop',
    category: experience.category ?? 'Point of interest',
    countryCode: experience.countryCode,
    countryLabel: experience.countryLabel,
    planningLocationId: experience.planningLocationId,
    coordinate: experience.coordinate as ExploreExperience['coordinate'],
    geography: experience.geography,
    locationLabel: experience.locationLabel,
    tripFit: experience.tripFit,
    includes: experience.visitTips ?? experience.includes,
    sections: experience.sections,
    summary: experience.summary,
    visitTips: experience.visitTips,
    primaryLabel: experience.primaryLabel ?? 'Add to trip',
    galleryImages: experience.galleryImages,
  };
}

async function getAddableCatalogItem(ctx: QueryCtx | MutationCtx, slug: string) {
  const location = await ctx.db
    .query('locations')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();

  if (location && location.status === 'live') {
    return { kind: 'location' as const, value: location };
  }

  const experience = await ctx.db
    .query('experiences')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();

  if (experience && experience.itemKind !== 'hiddenGem' && isLiveContent(experience.status) && isPublicProviderContent(experience)) {
    return { kind: 'experience' as const, value: experience };
  }

  if (experience?.itemKind === 'hiddenGem' && isLiveContent(experience.status) && isPublicProviderContent(experience)) {
    return { kind: 'location' as const, value: experience };
  }

  const gems = await ctx.db.query('gems').take(500);
  const hiddenGem = gems.find((gem) => getHiddenGemSlug(gem.title) === slug);
  return hiddenGem ? { kind: 'location' as const, value: hiddenGem } : null;
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
    .take(100);
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

function slugifyGroupName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'trip';
}

async function ensureTripCircle(
  ctx: MutationCtx,
  trip: Doc<'trips'>,
  travelerSlug: string,
  name: string
) {
  const now = Date.now();
  const groupName = name.trim() || (trip.name.toLowerCase() === 'default' ? 'My Trip' : trip.name);
  const existingCircle = trip.circleId ? await ctx.db.get(trip.circleId) : null;
  let circleId = existingCircle?._id;

  if (!circleId) {
    circleId = await ctx.db.insert('circles', {
      slug: `${slugifyGroupName(groupName)}-${now.toString(36)}`,
      name: `${groupName} group`,
      destinationLabel: groupName,
      heroLabel: 'Open trip',
      status: 'active',
      visibility: 'open',
      createdBySlug: travelerSlug,
      tripId: trip._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('members', {
      circleId,
      travelerSlug,
      role: 'host',
      status: 'active',
      joinedAt: now,
      note: 'Created from trip settings',
    });

    await ctx.db.insert('messages', {
      circleId,
      senderSlug: travelerSlug,
      kind: 'system',
      body: 'This trip is open for invited friends.',
      createdAt: now,
    });
  } else {
    const existingCircleId = circleId;
    await ctx.db.patch(existingCircleId, {
      name: existingCircle?.name ?? `${groupName} group`,
      destinationLabel: existingCircle?.destinationLabel ?? groupName,
      status: 'active',
      visibility: 'open',
      tripId: trip._id,
      updatedAt: now,
    });

    const hostMembership = await ctx.db
      .query('members')
      .withIndex('by_circleId_and_travelerSlug', (q) =>
        q.eq('circleId', existingCircleId).eq('travelerSlug', travelerSlug)
      )
      .unique();

    if (!hostMembership) {
      await ctx.db.insert('members', {
        circleId,
        travelerSlug,
        role: 'host',
        status: 'active',
        joinedAt: now,
        note: 'Created from trip settings',
      });
    } else if (hostMembership.status !== 'active' || hostMembership.role !== 'host') {
      await ctx.db.patch(hostMembership._id, {
        role: 'host',
        status: 'active',
        joinedAt: now,
      });
    }
  }

  await ctx.db.patch(trip._id, {
    circleId,
    groupRole: 'host',
    visibility: 'public',
  });

  return circleId;
}

async function getResolvedItinerary(
  ctx: QueryCtx,
  travelerSlug: string,
  tripId?: Id<'trips'>
): Promise<TripItineraryItem[]> {
  const viewerTrip = await getResolvedTrip(ctx, travelerSlug, tripId);

  if (!viewerTrip) {
    return [];
  }

  const trip = await getCanonicalTripForItinerary(ctx, viewerTrip);
  const bookings = await ctx.db
    .query('bookings')
    .withIndex('by_tripId', (q) => q.eq('tripId', trip._id))
    .take(200);

  const [allLocations, allExperiences, allHiddenGems, allStays, reservations] = await Promise.all([
    ctx.db.query('locations').take(500),
    ctx.db.query('experiences').take(500),
    ctx.db.query('gems').take(500),
    ctx.db.query('stays').take(500),
    ctx.db
      .query('reservations')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', trip.travelerSlug))
      .take(100),
  ]);

  if (allLocations.length === 0 && allExperiences.length === 0 && allStays.length === 0) {
    return [];
  }

  if (bookings.length === 0) {
    return [];
  }

  const reservationById = new Map(reservations.map((reservation) => [reservation._id, reservation]));
  const getStayReservation = (booking: Doc<'bookings'>, staySlug: string) => {
    if (booking.reservationId) {
      return reservationById.get(booking.reservationId) ?? null;
    }

    return reservations
      .filter(
        (reservation) =>
          reservation.staySlug === staySlug &&
          reservation.status !== 'cancelled' &&
          (!reservation.tripId || reservation.tripId === trip._id)
      )
      .sort((a, b) => b.bookedAt - a.bookedAt)[0] ?? null;
  };

  const resolvedItinerary = bookings
    .map<TripItineraryItem | null>((booking) => {
      const contentSlug = booking.contentSlug ?? booking.experienceSlug;
      const contentKind = booking.contentKind;

      if (contentKind === 'location') {
        const location = allLocations.find((item) => item.slug === contentSlug);
        if (location) {
          const normalizedLocation = normalizeLocationForTrip(location);
          if (normalizedLocation) {
            return {
              ...booking,
              kind: 'location',
              experience: locationToExperience(normalizedLocation),
            };
          }
        }

        const legacyGem = allHiddenGems.find((item) => getHiddenGemSlug(item.title) === contentSlug);
        if (legacyGem) {
          return {
            ...booking,
            kind: 'location',
            experience: hiddenGemToExperience(legacyGem),
          };
        }
      }

      if (contentKind === 'stay') {
        const stay = allStays.find((item) => item.slug === contentSlug);
        if (!stay) {
          return null;
        }

        const normalizedStay = normalizeStayForTrip(stay);
        if (!normalizedStay) {
          return null;
        }
        const stayBooking = getStayReservation(booking, stay.slug);

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
      }

      const experience = allExperiences.find((item) => item.slug === contentSlug && item.itemKind !== 'hiddenGem');

      if (experience) {
        return {
          ...booking,
          kind: 'experience',
          experience: experience as ExploreExperience,
        };
      }

      const location = allLocations.find((item) => item.slug === contentSlug);
      if (location) {
        const normalizedLocation = normalizeLocationForTrip(location);
        if (normalizedLocation) {
          return {
            ...booking,
            kind: 'location',
            experience: locationToExperience(normalizedLocation),
          };
        }
      }

      const hiddenGemExperience = allExperiences.find((item) => item.slug === contentSlug && item.itemKind === 'hiddenGem');
      if (hiddenGemExperience) {
        return {
          ...booking,
          kind: 'location',
          experience: hiddenGemExperienceToLocationExperience(hiddenGemExperience),
        };
      }

      const hiddenGem = allHiddenGems.find((item) => getHiddenGemSlug(item.title) === contentSlug);

      if (hiddenGem) {
        return {
          ...booking,
          kind: 'location',
          experience: hiddenGemToExperience(hiddenGem),
        };
      }

      const stay = allStays.find((item) => item.slug === contentSlug);

      if (!stay) {
        return null;
      }

      const normalizedStay = normalizeStayForTrip(stay);
      if (!normalizedStay) {
        return null;
      }
      const stayBooking = getStayReservation(booking, stay.slug);

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
      .take(200);

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
      .take(100);

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

    const [connections, invites, circleMembers] = await Promise.all([
      ctx.db
        .query('connections')
        .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
        .take(500),
      ctx.db
        .query('invites')
        .withIndex('by_tripId', (q) => q.eq('tripId', args.tripId))
        .take(100),
      trip.circleId
        ? ctx.db
            .query('members')
            .withIndex('by_circleId', (q) => q.eq('circleId', trip.circleId!))
            .take(100)
        : Promise.resolve([]),
    ]);
    const friends = await Promise.all(
      connections.map(async (connection) => {
        const summary = await getFriendSummary(ctx, connection.friendSlug);
        return {
          slug: connection.friendSlug,
          name: summary.name,
          avatarUri: summary.avatarUri,
          baseLabel: summary.baseLabel,
          phoneNumber: null,
        };
      })
    );
    const hasInvitedMembers = invites.some((invite) => invite.status === 'invited') ||
      circleMembers.some((member) => member.travelerSlug !== travelerSlug);

    return {
      tripId: trip._id,
      name: trip.name.toLowerCase() === 'default' ? 'My Trip' : trip.name,
      visibility: trip.circleId ? 'public' : trip.visibility ?? 'private',
      canChangeVisibility: !hasInvitedMembers && !trip.circleId,
      isGroupTrip: Boolean(trip.circleId),
      invitedFriendSlugs: [
        ...new Set([
          ...invites.filter((invite) => invite.status === 'invited').map((invite) => invite.inviteeSlug),
          ...circleMembers
            .filter((member) => member.status === 'invited' && member.travelerSlug !== travelerSlug)
            .map((member) => member.travelerSlug),
        ]),
      ],
      friends,
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
    const [bookings, reservations, trips, locations] = await Promise.all([
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
        .take(100),
      ctx.db.query('locations').take(200),
    ]);

    const tripNameById = new Map(trips.map((trip) => [trip._id, trip.name]));
    const tripById = new Map(trips.map((trip) => [trip._id, trip]));

    const experiences = await Promise.all(
      bookings.map(async (booking) => {
        const contentKind = booking.contentKind ?? 'experience';
        const contentSlug = booking.contentSlug ?? booking.experienceSlug;
        const trip = booking.tripId ? tripById.get(booking.tripId) ?? null : null;

        if (trip?.circleId && trip.groupRole === 'member') {
          return null;
        }

        if (contentKind === 'location') {
          const location = locations.find((item) => item.slug === contentSlug);
          return {
            _id: booking._id,
            source: 'experienceBooking' as const,
            slug: contentSlug,
            title: location?.title ?? contentSlug,
            subtitle: location?.locationLabel ?? 'Trip stop',
            imageUri: location?.imageUri ?? null,
            bookedAt: booking.bookedAt,
            kind: 'location' as const,
            status: 'planned' as const,
            statusLabel: 'planned',
            tripId: booking.tripId,
            tripName: booking.tripId ? tripNameById.get(booking.tripId) ?? null : null,
            requestKind: booking.requestKind,
            scheduledFor: booking.scheduledFor,
            partySize: booking.partySize,
            travelerNote: booking.travelerNote,
            currencyCode: booking.currencyCode,
            priceSnapshot: booking.priceSnapshot,
          };
        }

        if (contentKind === 'stay') {
          return null;
        }

        const experience = await ctx.db
          .query('experiences')
          .withIndex('by_slug', (q) => q.eq('slug', contentSlug))
          .unique();

        const bookingStatus = booking.status ?? 'confirmed';

        return {
          _id: booking._id,
          source: 'experienceBooking' as const,
          slug: contentSlug,
          title: experience?.title ?? contentSlug,
          subtitle: experience?.locationLabel ?? experience?.subtitle ?? 'Experience booking',
          imageUri: experience?.imageUri ?? null,
          bookedAt: booking.bookedAt,
          kind: 'experience' as const,
          status: bookingStatus,
          statusLabel: bookingStatus,
          tripId: booking.tripId,
          tripName: booking.tripId ? tripNameById.get(booking.tripId) ?? null : null,
          requestKind: booking.requestKind,
          scheduledFor: booking.scheduledFor,
          partySize: booking.partySize,
          travelerNote: booking.travelerNote,
          currencyCode: booking.currencyCode,
          priceSnapshot: booking.priceSnapshot,
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
          tripId: booking.tripId,
          tripName: booking.tripId ? tripNameById.get(booking.tripId) ?? null : null,
          detailLabel: `${Math.max(1, Math.round((booking.checkOut - booking.checkIn) / 86_400_000))} night stay`,
        };
      })
    );

    return [
      ...experiences.filter((booking): booking is NonNullable<typeof booking> => Boolean(booking)),
      ...stays,
    ].sort((a, b) => b.bookedAt - a.bookedAt);
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

        if (
          booking.requestKind === 'itineraryStop' ||
          booking.requestKind === 'stayItineraryMirror' ||
          booking.contentKind === 'location' ||
          booking.contentKind === 'stay' ||
          (trip?.circleId && trip.groupRole === 'member')
        ) {
          return null;
        }

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
          requestKind: booking.requestKind ?? 'experienceRequest',
          scheduledFor: booking.scheduledFor,
          partySize: booking.partySize,
          travelerNote: booking.travelerNote,
          currencyCode: booking.currencyCode,
          priceSnapshot: booking.priceSnapshot,
          detailLabel: trip?.name ? `Trip: ${trip.name}` : 'Experience request',
        };
      })
    );

    const stays = await Promise.all(
      reservations.map(async (booking) => {
        const [stay, trip] = await Promise.all([
          ctx.db
            .query('stays')
            .withIndex('by_slug', (q) => q.eq('slug', booking.staySlug))
            .unique(),
          booking.tripId ? ctx.db.get(booking.tripId) : null,
        ]);

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
          tripId: booking.tripId,
          tripName: trip?.name ?? null,
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
    const manager = await requireAdmin(ctx);
    if (args.source === 'experienceBooking') {
      const bookingId = args.bookingId as Id<'bookings'>;
      const booking = await ctx.db.get(bookingId);

      if (!booking) {
        return false;
      }

      const experience = await ctx.db
        .query('experiences')
        .withIndex('by_slug', (q) => q.eq('slug', booking.experienceSlug))
        .unique();

      if (!experience || experience.managerSlug !== manager.slug) {
        return false;
      }

      await ctx.db.patch(bookingId, { status: args.status });
      await recordAdminAuditEvent(ctx, {
        actor: manager,
        action: 'request.status',
        targetKind: 'booking',
        targetId: bookingId,
        targetLabel: booking.contentSlug ?? booking.experienceSlug,
        summary: `Marked experience request ${args.status}.`,
      });
      return true;
    }

    const bookingId = args.bookingId as Id<'reservations'>;
    const booking = await ctx.db.get(bookingId);

    if (!booking) {
      return false;
    }

    const stay = await ctx.db
      .query('stays')
      .withIndex('by_slug', (q) => q.eq('slug', booking.staySlug))
      .unique();

    if (!stay || stay.managerSlug !== manager.slug) {
      return false;
    }

    if (args.status === 'confirmed') {
      await assertStayCapacityAvailable(ctx, {
        stay,
        staySlug: booking.staySlug,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        roomTypeId: booking.roomTypeId ?? booking.stayBookingDetails?.roomTypeId,
        roomCount: getRequestedRoomCount(booking.stayBookingDetails),
        excludeReservationId: booking._id,
      });
    }

    await ctx.db.patch(bookingId, { status: args.status });
    const mirrorBookings = await ctx.db
      .query('bookings')
      .withIndex('by_reservationId', (q) => q.eq('reservationId', booking._id))
      .take(20);

    for (const mirrorBooking of mirrorBookings) {
      await ctx.db.patch(mirrorBooking._id, { status: args.status });
    }

    await recordAdminAuditEvent(ctx, {
      actor: manager,
      action: 'request.status',
      targetKind: 'reservation',
      targetId: bookingId,
      targetLabel: booking.staySlug,
      summary: `Marked stay request ${args.status}.`,
    });

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

    const nextName = args.name.trim() || trip.name;
    if (args.visibility === 'public') {
      await ensureTripCircle(ctx, trip, travelerSlug, nextName);
      await ctx.db.patch(args.tripId, { name: nextName });
    } else if (trip.circleId) {
      return false;
    } else {
      await ctx.db.patch(args.tripId, {
        name: nextName,
        visibility: 'private',
      });
    }

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

    const connections = await ctx.db
      .query('connections')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
      .take(500);
    const friendSet = new Set(connections.map((connection) => connection.friendSlug));
    const friendSlugs = [...new Set(args.friendSlugs)].filter(
      (slug) => slug !== travelerSlug && friendSet.has(slug)
    );

    if (friendSlugs.length === 0) {
      return false;
    }

    const circleId = await ensureTripCircle(ctx, trip, travelerSlug, trip.name);
    const now = Date.now();
    for (const friendSlug of friendSlugs) {
      const existingMembership = await ctx.db
        .query('members')
        .withIndex('by_circleId_and_travelerSlug', (q) =>
          q.eq('circleId', circleId).eq('travelerSlug', friendSlug)
        )
        .unique();

      if (!existingMembership) {
        await ctx.db.insert('members', {
          circleId,
          travelerSlug: friendSlug,
          role: 'member',
          status: 'invited',
          joinedAt: now,
          note: 'Invited from trip settings',
        });
      } else if (existingMembership.status !== 'active') {
        await ctx.db.patch(existingMembership._id, {
          status: 'invited',
          joinedAt: now,
          note: 'Invited from trip settings',
        });
      }

      const existingInvite = await ctx.db
        .query('invites')
        .withIndex('by_tripId_and_inviteeSlug', (q) =>
          q.eq('tripId', args.tripId).eq('inviteeSlug', friendSlug)
        )
        .unique();
      const inviteId = existingInvite?._id ?? await ctx.db.insert('invites', {
        tripId: args.tripId,
        circleId,
        inviterSlug: travelerSlug,
        inviteeSlug: friendSlug,
        status: 'invited',
        createdAt: now,
      });

      if (existingInvite && existingInvite.status !== 'accepted') {
        await ctx.db.patch(existingInvite._id, {
          circleId,
          status: 'invited',
        });
      }

      const recentNotifications = await ctx.db
        .query('notices')
        .withIndex('by_recipientSlug_and_createdAt', (q) => q.eq('recipientSlug', friendSlug))
        .order('desc')
        .take(100);
      const hasPendingNotification = recentNotifications.some(
        (notification) =>
          notification.kind === 'trip_invite' &&
          notification.actorSlug === travelerSlug &&
          notification.entityId === inviteId &&
          notification.actionStatus !== 'approved' &&
          notification.actionStatus !== 'declined'
      );

      if (!hasPendingNotification) {
        await ctx.db.insert('notices', {
          recipientSlug: friendSlug,
          actorSlug: travelerSlug,
          kind: 'trip_invite',
          title: `${trip.name.toLowerCase() === 'default' ? 'My Trip' : trip.name} invite`,
          body: 'Accept to add this group trip to your trips and open the chat.',
          href: '/notifications',
          entityId: inviteId,
          entityLabel: trip.name.toLowerCase() === 'default' ? 'My Trip' : trip.name,
          actionStatus: 'pending',
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(circleId, { updatedAt: now });
    return true;
  },
});

export const addExperienceToTrip = mutation({
  args: {
    experienceSlug: v.string(),
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
    scheduledFor: v.optional(v.number()),
    partySize: v.optional(v.number()),
    travelerNote: v.optional(v.string()),
    currencyCode: v.optional(v.string()),
    priceSnapshot: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const addableContent = await getAddableCatalogItem(ctx, args.experienceSlug);
    if (!addableContent) {
      throw new Error('Location not found.');
    }

    let resolvedTripId = args.tripId;
    let resolvedTrip: Doc<'trips'> | null = null;

    if (resolvedTripId) {
      resolvedTrip = await ctx.db.get(resolvedTripId);
      if (!resolvedTrip) {
        throw new Error('Trip not found.');
      }
      assertCanMutateTrip(resolvedTrip, travelerSlug);
    } else {
      const fallbackTripId = await getFallbackTripId(ctx, travelerSlug);
      const fallbackTrip = fallbackTripId ? await ctx.db.get(fallbackTripId) : null;
      if (fallbackTrip && !(fallbackTrip.circleId && fallbackTrip.groupRole === 'member')) {
        resolvedTrip = fallbackTrip;
        resolvedTripId = fallbackTrip._id;
      } else {
        resolvedTripId = await ctx.db.insert('trips', {
          name: 'My Trip',
          travelerSlug,
          createdAt: Date.now(),
          status: 'active',
        });
      }
    }

    if (!resolvedTripId) {
      throw new Error('Trip not found.');
    }

    const requestKind = addableContent.kind === 'location' ? 'itineraryStop' : 'experienceRequest';
    const scheduledFor =
      typeof args.scheduledFor === 'number' && Number.isFinite(args.scheduledFor)
        ? args.scheduledFor
        : undefined;
    const requestFields: {
      contentKind: 'location' | 'experience';
      contentSlug: string;
      tripId: Id<'trips'>;
      status: 'pending' | 'confirmed';
      requestKind: 'experienceRequest' | 'itineraryStop';
      scheduledFor?: number;
      partySize?: number;
      travelerNote?: string;
      currencyCode?: string;
      priceSnapshot?: number;
      paymentMode?: 'cash';
      paymentStatus?: 'unpaid';
      platformFeeAmount?: number;
      providerReceivableAmount?: number;
    } = {
      contentKind: addableContent.kind,
      contentSlug: args.experienceSlug,
      tripId: resolvedTripId,
      status: addableContent.kind === 'location' ? ('confirmed' as const) : ('pending' as const),
      requestKind,
    };
    const partySize = normalizePartySize(args.partySize);
    const travelerNote = normalizeRequestNote(args.travelerNote);
    const currencyCode = normalizeCurrencyCode(args.currencyCode);
    const priceSnapshot = normalizePriceSnapshot(args.priceSnapshot);
    if (scheduledFor !== undefined) requestFields.scheduledFor = scheduledFor;
    if (partySize !== undefined) requestFields.partySize = partySize;
    if (travelerNote !== undefined) requestFields.travelerNote = travelerNote;
    if (currencyCode !== undefined) requestFields.currencyCode = currencyCode;
    if (priceSnapshot !== undefined) requestFields.priceSnapshot = priceSnapshot;
    if (addableContent.kind === 'experience') {
      requestFields.paymentMode = 'cash';
      requestFields.paymentStatus = 'unpaid';
      requestFields.platformFeeAmount = 0;
      requestFields.providerReceivableAmount = (priceSnapshot ?? 0) * (partySize ?? 1);
    }

    // Check if already in this trip
    const existing = await ctx.db
      .query('bookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) => 
        q.eq('travelerSlug', travelerSlug).eq('experienceSlug', args.experienceSlug)
      )
      .take(20);
    
    const matching = existing.find(b => b.experienceSlug === args.experienceSlug && b.tripId === resolvedTripId);
    if (matching) {
      await ctx.db.patch(matching._id, requestFields);
      return matching._id;
    }

    return await ctx.db.insert('bookings', {
      experienceSlug: args.experienceSlug,
      travelerSlug,
      bookedAt: Date.now(),
      ...requestFields,
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

    const trip = booking.tripId ? await ctx.db.get(booking.tripId) : null;
    if (trip?.circleId && trip.groupRole === 'member') {
      throw new Error('Only the group host can update this shared trip.');
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

    if (trip.circleId && trip.groupRole === 'member') {
      return false;
    }

    const bookings = await ctx.db
      .query('bookings')
      .withIndex('by_tripId', (q) => q.eq('tripId', args.tripId))
      .take(200);

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
    const stay = await ctx.db
      .query('stays')
      .withIndex('by_slug', (q) => q.eq('slug', args.staySlug))
      .unique();

    if (!stay || !isLiveContent(stay.status) || !isPublicProviderContent(stay)) {
      throw new Error('Stay not found.');
    }

    let resolvedTripId = args.tripId;

    if (args.tripId) {
      const trip = await ctx.db.get(args.tripId);
      if (!trip) {
        throw new Error('Trip not found.');
      }
      assertCanMutateTrip(trip, travelerSlug);
    } else {
      resolvedTripId =
        (await getFallbackTripId(ctx, travelerSlug)) ??
        (await ctx.db.insert('trips', {
          name: 'My Trip',
          travelerSlug,
          createdAt: Date.now(),
          status: 'active',
        }));
    }

    // Stays are booked using the same bookings table for simplicity in the itinerary
    const existingBooking = await ctx.db
      .query('bookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('experienceSlug', args.staySlug)
      )
      .unique();

    if (existingBooking) {
      if (resolvedTripId && existingBooking.tripId !== resolvedTripId) {
        await ctx.db.patch(existingBooking._id, { tripId: resolvedTripId });
      }
      return existingBooking._id;
    }

    return await ctx.db.insert('bookings', {
      experienceSlug: args.staySlug,
      contentKind: 'stay',
      contentSlug: args.staySlug,
      travelerSlug,
      tripId: resolvedTripId,
      bookedAt: Date.now(),
      paymentMode: 'cash',
      paymentStatus: 'unpaid',
      platformFeeAmount: 0,
      providerReceivableAmount: stay.pricePerNight,
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

function getRequestedRoomCount(details?: Doc<'reservations'>['stayBookingDetails']) {
  return Math.max(1, Math.round(details?.roomCount ?? 1));
}

async function findEditableStayReservation(
  ctx: MutationCtx,
  args: {
    travelerSlug: string;
    staySlug: string;
    tripId: Id<'trips'>;
  }
) {
  const reservations = await ctx.db
    .query('reservations')
    .withIndex('by_travelerSlug_and_staySlug_and_bookedAt', (q) =>
      q.eq('travelerSlug', args.travelerSlug).eq('staySlug', args.staySlug)
    )
    .order('desc')
    .take(20);

  return (
    reservations.find(
      (reservation) =>
        reservation.status !== 'cancelled' &&
        (!reservation.tripId || reservation.tripId === args.tripId)
    ) ?? null
  );
}

async function assertStayCapacityAvailable(
  ctx: MutationCtx,
  args: {
    stay: Doc<'stays'>;
    staySlug: string;
    checkIn: number;
    checkOut: number;
    roomTypeId?: string;
    roomCount: number;
    excludeReservationId?: Id<'reservations'>;
  }
) {
  if (!args.roomTypeId) {
    return;
  }

  const roomOption = args.stay.bookingProfile?.roomOptions.find((room) => room.id === args.roomTypeId);
  if (!roomOption) {
    throw new Error('Choose a valid room type.');
  }

  const overlapping = await ctx.db
    .query('reservations')
    .withIndex('by_staySlug_and_status_and_checkIn', (q) =>
      q.eq('staySlug', args.staySlug).eq('status', 'confirmed').lt('checkIn', args.checkOut)
    )
    .take(200);

  const reservedRooms = overlapping
    .filter(
      (reservation) =>
        reservation._id !== args.excludeReservationId &&
        reservation.checkOut > args.checkIn &&
        (reservation.roomTypeId ?? reservation.stayBookingDetails?.roomTypeId) === args.roomTypeId
    )
    .reduce(
      (total, reservation) =>
        total + Math.max(1, reservation.roomCount ?? reservation.stayBookingDetails?.roomCount ?? 1),
      0
    );

  if (reservedRooms + args.roomCount > roomOption.maxRooms) {
    throw new Error('This room type is fully booked for those dates.');
  }
}

async function findStayItineraryMirror(
  ctx: MutationCtx,
  args: {
    reservationId: Id<'reservations'>;
    tripId: Id<'trips'>;
    travelerSlug: string;
    staySlug: string;
  }
) {
  const linkedMirrors = await ctx.db
    .query('bookings')
    .withIndex('by_reservationId', (q) => q.eq('reservationId', args.reservationId))
    .take(1);

  if (linkedMirrors[0]) {
    return linkedMirrors[0];
  }

  const tripBookings = await ctx.db
    .query('bookings')
    .withIndex('by_tripId', (q) => q.eq('tripId', args.tripId))
    .take(200);

  return (
    tripBookings.find(
      (booking) =>
        booking.travelerSlug === args.travelerSlug &&
        (booking.contentKind === 'stay' || booking.bookingType === 'stay') &&
        booking.experienceSlug === args.staySlug
    ) ?? null
  );
}

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
    const stay = await ctx.db
      .query('stays')
      .withIndex('by_slug', (q) => q.eq('slug', args.staySlug))
      .unique();

    if (!stay || !isLiveContent(stay.status) || !isPublicProviderContent(stay)) {
      throw new Error('Stay not found.');
    }

    if (args.checkOut <= args.checkIn) {
      throw new Error('Choose valid stay dates.');
    }

    if (args.totalPrice < 0) {
      throw new Error('Invalid booking total.');
    }

    let resolvedTripId = args.tripId;

    if (resolvedTripId) {
      const trip = await ctx.db.get(resolvedTripId);
      if (!trip) {
        throw new Error('Trip not found.');
      }
      assertCanMutateTrip(trip, travelerSlug);
    } else {
      const fallbackTripId = await getFallbackTripId(ctx, travelerSlug);
      const fallbackTrip = fallbackTripId ? await ctx.db.get(fallbackTripId) : null;
      if (fallbackTrip && !(fallbackTrip.circleId && fallbackTrip.groupRole === 'member')) {
        resolvedTripId = fallbackTrip._id;
      } else {
        resolvedTripId = await ctx.db.insert('trips', {
          name: 'My Trip',
          travelerSlug,
          createdAt: Date.now(),
          status: 'active',
        });
      }
    }

    if (!resolvedTripId) {
      throw new Error('Trip not found.');
    }

    const now = Date.now();
    const roomTypeId = args.stayBookingDetails?.roomTypeId;
    const roomCount = getRequestedRoomCount(args.stayBookingDetails);
    const existingReservation = await findEditableStayReservation(ctx, {
      travelerSlug,
      staySlug: args.staySlug,
      tripId: resolvedTripId,
    });

    await assertStayCapacityAvailable(ctx, {
      stay,
      staySlug: args.staySlug,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      roomTypeId,
      roomCount,
      excludeReservationId: existingReservation?._id,
    });

    const reservationFields: {
      staySlug: string;
      travelerSlug: string;
      tripId: Id<'trips'>;
      checkIn: number;
      checkOut: number;
      totalPrice: number;
      status: 'pending';
      bookedAt: number;
      roomTypeId?: string;
      roomCount: number;
      stayBookingDetails?: Doc<'reservations'>['stayBookingDetails'];
      paymentMode: 'cash';
      paymentStatus: 'unpaid';
      platformFeeAmount: number;
      providerReceivableAmount: number;
    } = {
      staySlug: args.staySlug,
      travelerSlug,
      tripId: resolvedTripId,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      totalPrice: args.totalPrice,
      status: 'pending',
      bookedAt: now,
      roomCount,
      paymentMode: 'cash',
      paymentStatus: 'unpaid',
      platformFeeAmount: 0,
      providerReceivableAmount: args.totalPrice,
    };
    if (roomTypeId) reservationFields.roomTypeId = roomTypeId;
    if (args.stayBookingDetails) reservationFields.stayBookingDetails = args.stayBookingDetails;

    const reservationId =
      existingReservation?._id ?? (await ctx.db.insert('reservations', reservationFields));

    if (existingReservation) {
      await ctx.db.patch(existingReservation._id, reservationFields);
    }

    const mirrorFields: {
      experienceSlug: string;
      contentKind: 'stay';
      contentSlug: string;
      travelerSlug: string;
      tripId: Id<'trips'>;
      reservationId: Id<'reservations'>;
      bookedAt: number;
      status: 'pending';
      bookingType: 'stay';
      requestKind: 'stayItineraryMirror';
      checkIn: number;
      checkOut: number;
      totalPrice: number;
      roomTypeId?: string;
      stayBookingDetails?: Doc<'bookings'>['stayBookingDetails'];
      paymentMode: 'cash';
      paymentStatus: 'unpaid';
      platformFeeAmount: number;
      providerReceivableAmount: number;
    } = {
      experienceSlug: args.staySlug,
      contentKind: 'stay',
      contentSlug: args.staySlug,
      travelerSlug,
      tripId: resolvedTripId,
      reservationId,
      bookedAt: now,
      status: 'pending',
      bookingType: 'stay',
      requestKind: 'stayItineraryMirror',
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      totalPrice: args.totalPrice,
      paymentMode: 'cash',
      paymentStatus: 'unpaid',
      platformFeeAmount: 0,
      providerReceivableAmount: args.totalPrice,
    };
    if (roomTypeId) mirrorFields.roomTypeId = roomTypeId;
    if (args.stayBookingDetails) mirrorFields.stayBookingDetails = args.stayBookingDetails;

    const existingMirror = await findStayItineraryMirror(ctx, {
      reservationId,
      tripId: resolvedTripId,
      travelerSlug,
      staySlug: args.staySlug,
    });

    if (existingMirror) {
      await ctx.db.patch(existingMirror._id, mirrorFields);
    } else {
      await ctx.db.insert('bookings', mirrorFields);
    }

    return reservationId;
  },
});

export const listAllStays = query({
  args: {},
  handler: async (ctx) => {
    const stays = await ctx.db.query('stays').take(200);
    return stays
      .filter((stay) => isLiveContent(stay.status) && isPublicProviderContent(stay))
      .map((stay) => ({
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
      status: 'draft',
      createdByAdminSlug: manager.slug,
      updatedByAdminSlug: manager.slug,
    });
    await recordAdminAuditEvent(ctx, {
      actor: manager,
      action: 'content.create',
      targetKind: 'stay',
      targetId: slug,
      targetLabel: args.name,
      summary: 'Created stay draft.',
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

    return stay && isLiveContent(stay.status) && isPublicProviderContent(stay)
      ? { ...stay, id: stay.slug, priceLabel: `$${stay.pricePerNight}` }
      : null;
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
      .withIndex('by_travelerSlug_and_staySlug_and_bookedAt', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('staySlug', args.staySlug)
      )
      .order('desc')
      .take(20);

    return bookings.find((booking) => booking.status !== 'cancelled') ?? bookings[0] ?? null;
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
      .withIndex('by_staySlug_and_status_and_checkIn', (q) =>
        q.eq('staySlug', args.staySlug).eq('status', 'confirmed')
      )
      .take(100);
  },
});
