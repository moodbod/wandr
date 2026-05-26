import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { recordAdminAuditEvent } from './adminAudit';
import { getAuthUserRole, type AuthUserProfile } from './appProfiles';
import { requireAdmin } from './authHelpers';

const userRoleValidator = v.union(v.literal('traveler'), v.literal('admin'));
const roleFilterValidator = v.union(v.literal('traveler'), v.literal('admin'), v.literal('all'));
const requestStatusValidator = v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled'));
const requestSourceValidator = v.union(v.literal('experienceBooking'), v.literal('stayBooking'));

type UserRole = 'traveler' | 'admin';
type RequestStatus = 'pending' | 'confirmed' | 'cancelled';
type Coordinate = readonly [number, number];

function normalizeSearch(value?: string) {
  const search = value?.trim().toLowerCase() ?? '';
  return search.length > 0 ? search : null;
}

function getUserRole(user: Doc<'users'> | null | undefined): UserRole {
  return getAuthUserRole(user as AuthUserProfile | null | undefined);
}

function matchesUserSearch(user: Doc<'users'>, search: string | null) {
  if (!search) {
    return true;
  }

  return [user.name, user.email, user.slug]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(search));
}

function toUserRow(user: Doc<'users'>) {
  return {
    userId: user._id,
    name: user.name ?? user.email?.split('@')[0] ?? 'Traveler',
    email: user.email ?? null,
    slug: user.slug ?? null,
    role: getUserRole(user),
    onboardingCompleted: Boolean(user.onboardingCompletedAt && user.slug),
    countryLabel: user.countryLabel ?? null,
    createdAt: user._creationTime,
  };
}

function paginateRows<T>(rows: T[], cursor?: number, limit?: number) {
  const safeLimit = Math.min(Math.max(Math.round(limit ?? 40), 1), 80);
  const start = Math.max(Math.round(cursor ?? 0), 0);
  const page = rows.slice(start, start + safeLimit);
  const nextCursor = start + safeLimit < rows.length ? start + safeLimit : null;

  return {
    page,
    continueCursor: nextCursor,
    isDone: nextCursor === null,
  };
}

function emptyContentCount() {
  return { archived: 0, draft: 0, live: 0, total: 0 };
}

function countContentStatus<T extends { status?: 'draft' | 'live' | 'archived' }>(rows: T[]) {
  const counts = emptyContentCount();

  for (const row of rows) {
    const status = row.status ?? 'live';
    counts[status] += 1;
    counts.total += 1;
  }

  return counts;
}

function countByStatus<T extends { status?: RequestStatus }>(rows: T[]) {
  const counts = { pending: 0, confirmed: 0, cancelled: 0, total: 0 };

  for (const row of rows) {
    const status = row.status ?? 'confirmed';
    counts[status] += 1;
    counts.total += 1;
  }

  return counts;
}

function isActionableExperienceBooking(booking: Doc<'bookings'>) {
  return (
    booking.requestKind !== 'itineraryStop' &&
    booking.requestKind !== 'stayItineraryMirror' &&
    booking.contentKind !== 'location' &&
    booking.contentKind !== 'stay'
  );
}

function isCoordinate(coordinate: readonly number[] | null | undefined): coordinate is Coordinate {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1])
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceInKm(from: Coordinate, to: Coordinate) {
  const earthRadiusKm = 6371;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getRouteDistanceKm(coordinates: Coordinate[]) {
  let distance = 0;
  let previous: Coordinate | null = null;

  for (const coordinate of coordinates) {
    if (previous && (previous[0] !== coordinate[0] || previous[1] !== coordinate[1])) {
      distance += getDistanceInKm(previous, coordinate);
    }
    previous = coordinate;
  }

  return distance;
}

function getBookingCoordinate(
  booking: Doc<'bookings'>,
  lookups: {
    experiences: Map<string, Doc<'experiences'>>;
    locations: Map<string, Doc<'locations'>>;
    stays: Map<string, Doc<'stays'>>;
  }
): Coordinate | null {
  const contentKind = booking.contentKind ?? 'experience';
  const contentSlug = booking.contentSlug ?? booking.experienceSlug;

  if (contentKind === 'location') {
    const coordinate = lookups.locations.get(contentSlug)?.coordinate;
    return isCoordinate(coordinate) ? coordinate : null;
  }

  if (contentKind === 'stay') {
    const coordinate = lookups.stays.get(contentSlug)?.coordinate;
    return isCoordinate(coordinate) ? coordinate : null;
  }

  const coordinate = lookups.experiences.get(contentSlug)?.coordinate;
  return isCoordinate(coordinate) ? coordinate : null;
}

function getReservationCoordinate(reservation: Doc<'reservations'>, stays: Map<string, Doc<'stays'>>) {
  const coordinate = stays.get(reservation.staySlug)?.coordinate;
  return isCoordinate(coordinate) ? coordinate : null;
}

function getGroupedDistanceKm<T>(
  rows: T[],
  getGroupKey: (row: T) => string | null,
  getSortValue: (row: T) => number,
  getCoordinate: (row: T) => Coordinate | null
) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const groupKey = getGroupKey(row);
    if (!groupKey) {
      continue;
    }

    const items = grouped.get(groupKey) ?? [];
    items.push(row);
    grouped.set(groupKey, items);
  }

  let distance = 0;
  for (const items of grouped.values()) {
    const coordinates = items
      .sort((a, b) => getSortValue(a) - getSortValue(b))
      .map(getCoordinate)
      .filter((coordinate): coordinate is Coordinate => Boolean(coordinate));
    distance += getRouteDistanceKm(coordinates);
  }

  return distance;
}

function roundDistance(value: number) {
  return Math.round(value * 10) / 10;
}

async function getTripName(ctx: QueryCtx | MutationCtx, tripId?: Id<'trips'>) {
  if (!tripId) {
    return null;
  }

  const trip = await ctx.db.get(tripId);
  return trip?.name ?? null;
}

async function toExperienceRequestRow(ctx: QueryCtx, booking: Doc<'bookings'>) {
  const contentSlug = booking.contentSlug ?? booking.experienceSlug;
  const [experience, tripName] = await Promise.all([
    ctx.db
      .query('experiences')
      .withIndex('by_slug', (q) => q.eq('slug', contentSlug))
      .unique(),
    getTripName(ctx, booking.tripId),
  ]);
  const status = booking.status ?? 'confirmed';

  return {
    _id: booking._id,
    source: 'experienceBooking' as const,
    slug: contentSlug,
    title: experience?.title ?? contentSlug,
    subtitle: experience?.locationLabel ?? experience?.subtitle ?? 'Experience request',
    imageUri: experience?.imageUri ?? null,
    bookedAt: booking.bookedAt,
    kind: 'experience' as const,
    status,
    travelerSlug: booking.travelerSlug,
    tripId: booking.tripId ?? null,
    tripName,
    scheduledFor: booking.scheduledFor ?? null,
    partySize: booking.partySize ?? null,
    travelerNote: booking.travelerNote ?? null,
    currencyCode: booking.currencyCode ?? null,
    priceSnapshot: booking.priceSnapshot ?? null,
    detailLabel: tripName ? `Trip: ${tripName}` : 'Experience request',
  };
}

async function toStayRequestRow(ctx: QueryCtx, booking: Doc<'reservations'>) {
  const [stay, tripName] = await Promise.all([
    ctx.db
      .query('stays')
      .withIndex('by_slug', (q) => q.eq('slug', booking.staySlug))
      .unique(),
    getTripName(ctx, booking.tripId),
  ]);

  return {
    _id: booking._id,
    source: 'stayBooking' as const,
    slug: booking.staySlug,
    title: stay?.name ?? booking.staySlug,
    subtitle: stay?.locationLabel ?? 'Stay request',
    imageUri: stay?.imageUri ?? null,
    bookedAt: booking.bookedAt,
    kind: 'stay' as const,
    status: booking.status,
    travelerSlug: booking.travelerSlug,
    tripId: booking.tripId ?? null,
    tripName,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalPrice: booking.totalPrice,
    stayBookingDetails: booking.stayBookingDetails ?? null,
    detailLabel: booking.stayBookingDetails
      ? `${booking.stayBookingDetails.roomSummary} - ${booking.stayBookingDetails.guestSummary}`
      : `${Math.max(1, Math.round((booking.checkOut - booking.checkIn) / 86_400_000))} night stay`,
  };
}

function toAuditRow(event: Doc<'adminAuditEvents'>) {
  return {
    _id: event._id,
    actorSlug: event.actorSlug,
    actorName: event.actorName ?? null,
    action: event.action,
    targetKind: event.targetKind,
    targetId: event.targetId,
    targetLabel: event.targetLabel ?? null,
    summary: event.summary,
    createdAt: event.createdAt,
  };
}

function getRequestedRoomCount(details?: Doc<'reservations'>['stayBookingDetails']) {
  return Math.max(1, Math.round(details?.roomCount ?? 1));
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

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [
      users,
      locations,
      experiences,
      stays,
      bookings,
      reservations,
      trips,
      visits,
      circles,
      messages,
      notices,
      photos,
      auditEvents,
    ] = await Promise.all([
      ctx.db.query('users').take(500),
      ctx.db.query('locations').take(500),
      ctx.db.query('experiences').take(500),
      ctx.db.query('stays').take(500),
      ctx.db.query('bookings').take(500),
      ctx.db.query('reservations').take(500),
      ctx.db.query('trips').take(500),
      ctx.db.query('visits').take(500),
      ctx.db.query('circles').take(500),
      ctx.db.query('messages').take(500),
      ctx.db.query('notices').take(500),
      ctx.db.query('photos').take(500),
      ctx.db.query('adminAuditEvents').withIndex('by_createdAt').order('desc').take(8),
    ]);
    const actionableBookings = bookings.filter(isActionableExperienceBooking);
    const allRequests = [...actionableBookings, ...reservations];
    const requestCounts = countByStatus(allRequests);
    const photoCounts = {
      pending: photos.filter((photo) => photo.status === 'pending').length,
      approved: photos.filter((photo) => photo.status === 'approved').length,
      rejected: photos.filter((photo) => photo.status === 'rejected').length,
      total: photos.length,
    };
    const adminCount = users.filter((user) => getUserRole(user) === 'admin').length;
    const experienceBySlug = new Map(experiences.map((experience) => [experience.slug, experience]));
    const stayBySlug = new Map(stays.map((stay) => [stay.slug, stay]));
    const locationBySlug = new Map(locations.map((location) => [location.slug, location]));
    const coordinateLookups = { experiences: experienceBySlug, locations: locationBySlug, stays: stayBySlug };
    const plannedDistanceKm =
      getGroupedDistanceKm(
        bookings,
        (booking) => booking.tripId ?? null,
        (booking) => booking.bookedAt,
        (booking) => getBookingCoordinate(booking, coordinateLookups)
      ) +
      getGroupedDistanceKm(
        reservations,
        (reservation) => reservation.tripId ?? null,
        (reservation) => reservation.bookedAt,
        (reservation) => getReservationCoordinate(reservation, stayBySlug)
      );
    const bookingById = new Map(bookings.map((booking) => [booking._id, booking]));
    const coveredDistanceKm = getGroupedDistanceKm(
      visits,
      (visit) => visit.tripId ?? visit.travelerSlug,
      (visit) => visit.arrivedAt,
      (visit) => {
        if (isCoordinate(visit.coordinate)) {
          return visit.coordinate;
        }

        const booking = bookingById.get(visit.bookingId);
        return booking ? getBookingCoordinate(booking, coordinateLookups) : null;
      }
    );
    const tripCounts = {
      total: trips.length,
      active: trips.filter((trip) => trip.status === 'active').length,
      completed: trips.filter((trip) => trip.status === 'completed').length,
      archived: trips.filter((trip) => trip.status === 'archived').length,
      public: trips.filter((trip) => trip.visibility === 'public').length,
      group: trips.filter((trip) => Boolean(trip.circleId)).length,
    };
    const contentTotals = {
      locations: locations.length,
      experiences: experiences.length,
      stays: stays.length,
      all: locations.length + experiences.length + stays.length,
    };

    return {
      users: {
        total: users.length,
        admins: adminCount,
        travelers: users.length - adminCount,
      },
      content: {
        locations: countContentStatus(locations),
        experiences: countContentStatus(experiences),
        stays: countContentStatus(stays),
      },
      requests: requestCounts,
      photos: photoCounts,
      platform: {
        trips: tripCounts,
        itinerary: {
          totalStops: bookings.length,
          experienceRequests: actionableBookings.length,
          itineraryStops: bookings.filter((booking) => booking.requestKind === 'itineraryStop').length,
          stayMirrors: bookings.filter((booking) => booking.requestKind === 'stayItineraryMirror').length,
          stayReservations: reservations.length,
        },
        engagement: {
          visits: visits.length,
          visitedTravelers: new Set(visits.map((visit) => visit.travelerSlug)).size,
          circles: circles.length,
          openCircles: circles.filter((circle) => circle.visibility === 'open').length,
          messages: messages.length,
          notices: notices.length,
          unreadNotices: notices.filter((notice) => !notice.readAt).length,
          photos: photos.length,
        },
        content: contentTotals,
        distance: {
          coveredKm: roundDistance(coveredDistanceKm),
          plannedKm: roundDistance(plannedDistanceKm),
        },
      },
      recentEvents: auditEvents.map(toAuditRow),
    };
  },
});

export const listUsers = query({
  args: {
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
    role: v.optional(roleFilterValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const search = normalizeSearch(args.search);
    const users = await ctx.db.query('users').order('desc').take(500);
    const rows = users
      .filter((user) => (args.role && args.role !== 'all' ? getUserRole(user) === args.role : true))
      .filter((user) => matchesUserSearch(user, search))
      .map(toUserRow);

    return paginateRows(rows, args.cursor, args.limit);
  },
});

export const updateUserRole = mutation({
  args: {
    role: userRoleValidator,
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    if (args.userId === admin.userId) {
      throw new ConvexError('Admins cannot change their own role.');
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError('User not found.');
    }

    const previousRole = getUserRole(user);
    if (previousRole === args.role) {
      return toUserRow(user);
    }

    await ctx.db.patch(args.userId, { role: args.role });
    await recordAdminAuditEvent(ctx, {
      actor: admin,
      action: 'role.update',
      targetKind: 'user',
      targetId: args.userId,
      targetLabel: user.slug ?? user.email ?? user.name ?? 'User',
      summary: `Changed user role from ${previousRole} to ${args.role}.`,
    });

    const updated = await ctx.db.get(args.userId);
    if (!updated) {
      throw new ConvexError('User not found.');
    }

    return toUserRow(updated);
  },
});

export const listRequests = query({
  args: {
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
    status: v.optional(v.union(requestStatusValidator, v.literal('all'))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = args.status === 'all' ? undefined : args.status;
    const [bookingDocs, reservationDocs] = await Promise.all([
      ctx.db.query('bookings').order('desc').take(250),
      ctx.db.query('reservations').order('desc').take(250),
    ]);
    const bookings = bookingDocs
      .filter(isActionableExperienceBooking)
      .filter((booking) => !status || (booking.status ?? 'confirmed') === status);
    const reservations = reservationDocs.filter((reservation) => !status || reservation.status === status);
    const rows = [
      ...(await Promise.all(bookings.map((booking) => toExperienceRequestRow(ctx, booking)))),
      ...(await Promise.all(reservations.map((reservation) => toStayRequestRow(ctx, reservation)))),
    ].sort((a, b) => b.bookedAt - a.bookedAt);

    return paginateRows(rows, args.cursor, args.limit);
  },
});

export const updateRequestStatus = mutation({
  args: {
    requestId: v.union(v.id('bookings'), v.id('reservations')),
    source: requestSourceValidator,
    status: v.union(v.literal('confirmed'), v.literal('cancelled')),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    if (args.source === 'experienceBooking') {
      const bookingId = args.requestId as Id<'bookings'>;
      const booking = await ctx.db.get(bookingId);
      if (!booking || !isActionableExperienceBooking(booking)) {
        throw new ConvexError('Request not found.');
      }

      await ctx.db.patch(bookingId, { status: args.status });
      await recordAdminAuditEvent(ctx, {
        actor: admin,
        action: 'request.status',
        targetKind: 'booking',
        targetId: bookingId,
        targetLabel: booking.contentSlug ?? booking.experienceSlug,
        summary: `Marked experience request ${args.status}.`,
      });
      return true;
    }

    const reservationId = args.requestId as Id<'reservations'>;
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw new ConvexError('Request not found.');
    }

    const stay = await ctx.db
      .query('stays')
      .withIndex('by_slug', (q) => q.eq('slug', reservation.staySlug))
      .unique();

    if (!stay) {
      throw new ConvexError('Stay not found.');
    }

    if (args.status === 'confirmed') {
      await assertStayCapacityAvailable(ctx, {
        stay,
        staySlug: reservation.staySlug,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        roomTypeId: reservation.roomTypeId ?? reservation.stayBookingDetails?.roomTypeId,
        roomCount: getRequestedRoomCount(reservation.stayBookingDetails),
        excludeReservationId: reservation._id,
      });
    }

    await ctx.db.patch(reservationId, { status: args.status });
    const mirrorBookings = await ctx.db
      .query('bookings')
      .withIndex('by_reservationId', (q) => q.eq('reservationId', reservation._id))
      .take(20);

    for (const mirrorBooking of mirrorBookings) {
      await ctx.db.patch(mirrorBooking._id, { status: args.status });
    }

    await recordAdminAuditEvent(ctx, {
      actor: admin,
      action: 'request.status',
      targetKind: 'reservation',
      targetId: reservationId,
      targetLabel: reservation.staySlug,
      summary: `Marked stay request ${args.status}.`,
    });
    return true;
  },
});

export const listAuditEvents = query({
  args: {
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const events = await ctx.db
      .query('adminAuditEvents')
      .withIndex('by_createdAt')
      .order('desc')
      .take(200);

    return paginateRows(events.map(toAuditRow), args.cursor, args.limit);
  },
});
