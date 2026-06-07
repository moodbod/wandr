import { v } from 'convex/values';
import { makeFunctionReference } from 'convex/server';
import type { Doc, Id } from './_generated/dataModel';
import { action, internalAction, internalMutation, internalQuery, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { requireAdmin, assertCurrentTravelerSlug } from './authHelpers';
import {
  bookingComPost,
  normalizeAccommodationsResponse,
  normalizeAvailabilityResponse,
  normalizeCreateOrderResponse,
  normalizePreviewResponse,
  sanitizeForStorage,
  type BookingComAvailabilityProduct,
} from './bookingComApi';
import { toPublicBookingComStay } from './bookingComMapping';

const DAY_MS = 86_400_000;
const MAX_SYNC_BATCH = 100;

const bookingComInternal = {
  assertAdminSyncAccess: makeFunctionReference<'mutation'>('bookingCom:assertAdminSyncAccess'),
  getOrderById: makeFunctionReference<'query'>('bookingCom:getOrderById'),
  markSyncFinished: makeFunctionReference<'mutation'>('bookingCom:markSyncFinished'),
  markSyncStarted: makeFunctionReference<'mutation'>('bookingCom:markSyncStarted'),
  persistCreatedOrder: makeFunctionReference<'mutation'>('bookingCom:persistCreatedOrder'),
  persistOrderSync: makeFunctionReference<'mutation'>('bookingCom:persistOrderSync'),
  upsertAccommodations: makeFunctionReference<'mutation'>('bookingCom:upsertAccommodations'),
};

const bookingComStatusValidator = v.union(
  v.literal('pending'),
  v.literal('booked'),
  v.literal('stayed'),
  v.literal('cancelled'),
  v.literal('modified'),
  v.literal('failed'),
  v.literal('unknown')
);

const paymentStatusValidator = v.union(
  v.literal('unpaid'),
  v.literal('pending'),
  v.literal('paid'),
  v.literal('refunded'),
  v.literal('failed')
);

const productAllocationValidator = v.optional(v.any());

const orderProductValidator = v.object({
  id: v.string(),
  allocation: productAllocationValidator,
});

const guestsValidator = v.object({
  number_of_adults: v.number(),
  children: v.optional(v.array(v.number())),
  number_of_rooms: v.number(),
});

const bookerValidator = v.object({
  country: v.string(),
  platform: v.union(v.literal('desktop'), v.literal('mobile')),
  travel_purpose: v.optional(v.string()),
  user_groups: v.optional(v.array(v.string())),
});

const createBookerValidator = v.object({
  address: v.optional(
    v.object({
      address_line: v.optional(v.string()),
      city: v.optional(v.string()),
      country: v.string(),
      post_code: v.optional(v.string()),
    })
  ),
  company: v.optional(v.string()),
  email: v.string(),
  language: v.optional(v.string()),
  name: v.object({
    first_name: v.string(),
    last_name: v.string(),
  }),
  telephone: v.string(),
});

const paymentValidator = v.object({
  method: v.string(),
  timing: v.string(),
  include_receipt: v.optional(v.boolean()),
  card: v.optional(
    v.object({
      cardholder: v.string(),
      cvc: v.string(),
      expiry_date: v.string(),
      number: v.string(),
    })
  ),
  wallet: v.optional(v.any()),
  airplus: v.optional(v.any()),
  business_information: v.optional(v.any()),
});

const priceSnapshotValidator = v.optional(
  v.object({
    currencyCode: v.string(),
    total: v.number(),
    base: v.optional(v.number()),
    taxesAndFees: v.optional(v.number()),
  })
);

function isSyncEnabled() {
  return process.env.BOOKING_COM_SYNC_ENABLED === 'true';
}

function msFromDate(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function clampLimit(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 100;
  }
  return Math.min(500, Math.max(1, Math.round(value)));
}

function normalizeCountryCode(value?: string) {
  const normalized = value?.trim().toUpperCase();
  return normalized || undefined;
}

function statusForReservation(status: 'pending' | 'booked' | 'stayed' | 'cancelled' | 'modified' | 'failed' | 'unknown') {
  if (status === 'cancelled' || status === 'failed') {
    return 'cancelled' as const;
  }
  if (status === 'booked' || status === 'stayed' || status === 'modified') {
    return 'confirmed' as const;
  }
  return 'pending' as const;
}

function paymentStatusFromTiming(timing?: string) {
  if (timing === 'pay_at_the_property') {
    return 'unpaid' as const;
  }
  return 'pending' as const;
}

function toPublicOrder(order: Doc<'bookingComOrders'>) {
  return {
    _id: order._id,
    bookingComOrderId: order.bookingComOrderId,
    bookingComReservationId: order.bookingComReservationId,
    reservationId: order.reservationId,
    mirrorBookingId: order.mirrorBookingId,
    accommodationId: order.accommodationId,
    accommodationSlug: order.accommodationSlug,
    travelerSlug: order.travelerSlug,
    tripId: order.tripId,
    status: order.status,
    checkIn: order.checkIn,
    checkOut: order.checkOut,
    bookedAt: order.bookedAt,
    updatedAt: order.updatedAt,
    syncedAt: order.syncedAt,
    currencyCode: order.currencyCode,
    totalPrice: order.totalPrice,
    commissionAmount: order.commissionAmount,
    commissionCurrencyCode: order.commissionCurrencyCode,
    commissionStatus: order.commissionStatus,
    paymentStatus: order.paymentStatus,
    paymentTiming: order.paymentTiming,
    paymentMethod: order.paymentMethod,
    receiptUrl: order.receiptUrl,
    pincode: order.pincode,
    cancellationPolicy: order.cancellationPolicy,
    priceSnapshot: order.priceSnapshot,
  };
}

async function getFallbackTripId(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  const trips = await ctx.db
    .query('trips')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .order('desc')
    .take(1);

  return trips[0]?._id;
}

async function resolveWritableTrip(ctx: MutationCtx, travelerSlug: string, tripId?: Id<'trips'>) {
  if (tripId) {
    const trip = await ctx.db.get(tripId);
    if (!trip || trip.travelerSlug !== travelerSlug) {
      throw new Error('Trip not found.');
    }
    if (trip.circleId && trip.groupRole === 'member') {
      throw new Error('Only the group host can update this shared trip.');
    }
    return trip._id;
  }

  const fallbackTripId = await getFallbackTripId(ctx, travelerSlug);
  const fallbackTrip = fallbackTripId ? await ctx.db.get(fallbackTripId) : null;
  if (fallbackTrip && !(fallbackTrip.circleId && fallbackTrip.groupRole === 'member')) {
    return fallbackTrip._id;
  }

  return await ctx.db.insert('trips', {
    name: 'My Trip',
    travelerSlug,
    createdAt: Date.now(),
    status: 'active',
  });
}

export const listCachedAccommodations = query({
  args: {
    countryCode: v.optional(v.string()),
    cityId: v.optional(v.number()),
    regionId: v.optional(v.number()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit);
    const countryCode = normalizeCountryCode(args.countryCode);
    const search = args.search?.trim().toLowerCase();
    let rows: Doc<'bookingComAccommodations'>[];

    if (typeof args.cityId === 'number') {
      rows = await ctx.db
        .query('bookingComAccommodations')
        .withIndex('by_status_and_cityId', (q) => q.eq('status', 'live').eq('cityId', args.cityId))
        .take(limit);
    } else if (typeof args.regionId === 'number') {
      rows = await ctx.db
        .query('bookingComAccommodations')
        .withIndex('by_status_and_regionId', (q) => q.eq('status', 'live').eq('regionId', args.regionId))
        .take(limit);
    } else if (countryCode) {
      rows = await ctx.db
        .query('bookingComAccommodations')
        .withIndex('by_status_and_countryCode', (q) => q.eq('status', 'live').eq('countryCode', countryCode))
        .take(limit);
    } else {
      rows = await ctx.db
        .query('bookingComAccommodations')
        .withIndex('by_status', (q) => q.eq('status', 'live'))
        .take(limit);
    }

    const filtered = search ? rows.filter((row) => row.searchText.includes(search)) : rows;
    return filtered.map(toPublicBookingComStay);
  },
});

export const getCachedAccommodation = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const stay = await ctx.db
      .query('bookingComAccommodations')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    if (!stay || stay.status !== 'live') {
      return null;
    }

    return toPublicBookingComStay(stay);
  },
});

export const searchAvailability = action({
  args: {
    accommodationId: v.number(),
    checkIn: v.string(),
    checkOut: v.string(),
    guests: guestsValidator,
    currency: v.string(),
    bookerCountry: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await bookingComPost('/accommodations/availability', {
      accommodation: args.accommodationId,
      booker: {
        country: args.bookerCountry.toLowerCase(),
        platform: 'mobile',
      },
      checkin: args.checkIn,
      checkout: args.checkOut,
      currency: args.currency.toUpperCase(),
      extras: ['extra_charges', 'products'],
      guests: args.guests,
    });

    return normalizeAvailabilityResponse(response);
  },
});

export const previewOrder = action({
  args: {
    accommodationId: v.number(),
    checkIn: v.string(),
    checkOut: v.string(),
    products: v.array(orderProductValidator),
    booker: bookerValidator,
    currency: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await bookingComPost('/orders/preview', {
      accommodation: {
        id: args.accommodationId,
        checkin: args.checkIn,
        checkout: args.checkOut,
        products: args.products,
      },
      booker: args.booker,
      currency: args.currency.toUpperCase(),
    });

    return normalizePreviewResponse(response);
  },
});

export const createOrder = action({
  args: {
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
    orderToken: v.string(),
    accommodation: v.object({
      accommodationId: v.number(),
      accommodationSlug: v.string(),
      checkIn: v.string(),
      checkOut: v.string(),
      products: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          allocation: productAllocationValidator,
          priceTotal: v.number(),
          currencyCode: v.string(),
        })
      ),
      remarks: v.optional(
        v.object({
          special_requests: v.optional(v.string()),
          estimated_arrival_time: v.optional(v.object({ hour: v.number() })),
        })
      ),
    }),
    booker: createBookerValidator,
    payment: paymentValidator,
  },
  handler: async (ctx, args) => {
    const response = await bookingComPost('/orders/create', {
      accommodation: {
        products: args.accommodation.products.map((product) => ({
          id: product.id,
          allocation: product.allocation,
        })),
        remarks: args.accommodation.remarks,
      },
      booker: args.booker,
      order_token: args.orderToken,
      payment: args.payment,
    });
    const created = normalizeCreateOrderResponse(response);
    const firstProduct = args.accommodation.products[0];

    const orderId: Id<'bookingComOrders'> = await ctx.runMutation(bookingComInternal.persistCreatedOrder, {
      travelerSlug: args.travelerSlug,
      tripId: args.tripId,
      bookingComOrderId: created.orderId,
      bookingComReservationId: created.reservationId,
      accommodationId: args.accommodation.accommodationId,
      accommodationSlug: args.accommodation.accommodationSlug,
      checkIn: msFromDate(args.accommodation.checkIn),
      checkOut: msFromDate(args.accommodation.checkOut),
      status: created.status,
      currencyCode: firstProduct?.currencyCode ?? 'USD',
      totalPrice: firstProduct?.priceTotal ?? 0,
      paymentMethod: args.payment.method,
      paymentTiming: args.payment.timing,
      paymentStatus: paymentStatusFromTiming(args.payment.timing),
      receiptUrl: created.receiptUrl,
      pincode: created.pincode,
      priceSnapshot: {
        currencyCode: firstProduct?.currencyCode ?? 'USD',
        total: firstProduct?.priceTotal ?? 0,
      },
      sanitizedOrderSnapshot: created.sanitizedSnapshot,
    });

    const publicOrder = await ctx.runQuery(bookingComInternal.getOrderById, { orderId });
    return publicOrder;
  },
});

export const syncOrder = action({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const response = await bookingComPost('/orders/details/accommodations', {
      orders: [args.orderId],
      extras: ['accommodation_details', 'policies', 'extra_charges'],
    });
    const data = Array.isArray((response as { data?: unknown }).data) ? (response as { data: unknown[] }).data[0] : response;
    const status = normalizeExternalStatus(data);
    const commission = extractCommission(data);

    const updated = await ctx.runMutation(bookingComInternal.persistOrderSync, {
      bookingComOrderId: args.orderId,
      status,
      commissionAmount: commission.amount,
      commissionCurrencyCode: commission.currencyCode,
      commissionStatus: commission.status,
      sanitizedOrderSnapshot: sanitizeForStorage(response),
    });

    return updated;
  },
});

export const startStaticCacheSync = action({
  args: {
    countries: v.optional(v.array(v.string())),
    cityIds: v.optional(v.array(v.number())),
    regionIds: v.optional(v.array(v.number())),
    maxPages: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(bookingComInternal.assertAdminSyncAccess, {});
    const maxPages = Math.min(50, Math.max(1, Math.round(args.maxPages ?? 3)));
    const targets = await buildSyncTargets(args);
    let totalSynced = 0;

    for (const target of targets) {
      const scopeKey = `${target.scope}:${target.value}`;
      await ctx.runMutation(bookingComInternal.markSyncStarted, {
        scope: target.scope,
        scopeKey,
      });

      let page: string | undefined;
      let pagesSynced = 0;
      try {
        do {
          const payload = buildDetailsPayload(target, page);
          const response = await bookingComPost('/accommodations/details', payload);
          const syncedAt = Date.now();
          const accommodations = normalizeAccommodationsResponse(response, syncedAt);
          totalSynced += accommodations.length;
          await ctx.runMutation(bookingComInternal.upsertAccommodations, {
            accommodations,
            syncedAt,
          });
          page = getNextPage(response);
          pagesSynced += 1;
        } while (page && pagesSynced < maxPages);

        await ctx.runMutation(bookingComInternal.markSyncFinished, {
          scope: target.scope,
          scopeKey,
          page,
          status: 'succeeded',
          totalSynced,
        });
      } catch (error: any) {
        await ctx.runMutation(bookingComInternal.markSyncFinished, {
          scope: target.scope,
          scopeKey,
          status: 'failed',
          totalSynced,
          lastError: error.message ?? 'Booking.com sync failed.',
        });
        throw error;
      }
    }

    return { targets: targets.length, totalSynced };
  },
});

export const continueStaticCacheSync = action({
  args: {
    scope: v.union(v.literal('country'), v.literal('city'), v.literal('region')),
    value: v.union(v.string(), v.number()),
    page: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(bookingComInternal.assertAdminSyncAccess, {});
    const target = { scope: args.scope, value: args.value };
    const response = await bookingComPost('/accommodations/details', buildDetailsPayload(target, args.page));
    const syncedAt = Date.now();
    const accommodations = normalizeAccommodationsResponse(response, syncedAt);
    await ctx.runMutation(bookingComInternal.upsertAccommodations, {
      accommodations,
      syncedAt,
    });
    return { totalSynced: accommodations.length, nextPage: getNextPage(response) };
  },
});

export const refreshChangedAccommodations = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isSyncEnabled()) {
      await ctx.runMutation(bookingComInternal.markSyncStarted, {
        scope: 'changes',
        scopeKey: 'daily',
        status: 'disabled',
      });
      return { skipped: true, reason: 'disabled' };
    }

    const countries = (process.env.BOOKING_COM_SYNC_COUNTRIES ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (countries.length === 0) {
      return { skipped: true, reason: 'no countries configured' };
    }

    const lastChange = new Date(Date.now() - DAY_MS).toISOString().replace(/\.\d{3}Z$/, '+00:00');
    const response = await bookingComPost('/accommodations/details/changes', {
      last_change: lastChange,
      filters: { countries },
    });
    const changedIds = extractChangedAccommodationIds(response);
    let totalSynced = 0;

    for (let index = 0; index < changedIds.length; index += MAX_SYNC_BATCH) {
      const batch = changedIds.slice(index, index + MAX_SYNC_BATCH);
      const details = await bookingComPost('/accommodations/details', {
        accommodations: batch,
        extras: ['description', 'facilities', 'payment', 'photos', 'policies', 'rooms'],
      });
      const syncedAt = Date.now();
      const accommodations = normalizeAccommodationsResponse(details, syncedAt);
      totalSynced += accommodations.length;
      await ctx.runMutation(bookingComInternal.upsertAccommodations, { accommodations, syncedAt });
    }

    await ctx.runMutation(bookingComInternal.markSyncFinished, {
      scope: 'changes',
      scopeKey: 'daily',
      status: 'succeeded',
      totalSynced,
      lastChange,
    });

    return { totalChanged: changedIds.length, totalSynced };
  },
});

export const assertAdminSyncAccess = internalMutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});

export const upsertAccommodations = internalMutation({
  args: {
    syncedAt: v.number(),
    accommodations: v.array(
      v.object({
        accommodationId: v.number(),
        slug: v.string(),
        status: v.union(v.literal('live'), v.literal('closed'), v.literal('unknown')),
        name: v.string(),
        locationLabel: v.string(),
        town: v.string(),
        region: v.string(),
        countryCode: v.optional(v.string()),
        countryLabel: v.optional(v.string()),
        planningLocationId: v.optional(v.string()),
        cityId: v.optional(v.number()),
        regionId: v.optional(v.number()),
        coordinate: v.array(v.number()),
        imageUri: v.string(),
        galleryImages: v.array(v.string()),
        pricePerNight: v.optional(v.number()),
        currencyCode: v.optional(v.string()),
        rating: v.optional(v.number()),
        reviewCount: v.optional(v.number()),
        accommodationType: v.optional(v.string()),
        description: v.optional(v.string()),
        amenities: v.array(v.string()),
        roomNames: v.array(v.string()),
        paymentMethods: v.array(v.string()),
        policies: v.optional(v.string()),
        searchText: v.string(),
        sourceUpdatedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let upserted = 0;
    for (const accommodation of args.accommodations.slice(0, MAX_SYNC_BATCH)) {
      const existing = await ctx.db
        .query('bookingComAccommodations')
        .withIndex('by_accommodationId', (q) => q.eq('accommodationId', accommodation.accommodationId))
        .unique();

      const fields = {
        ...accommodation,
        countryCode: accommodation.countryCode?.toUpperCase(),
        lastSyncedAt: args.syncedAt,
      };

      if (existing) {
        await ctx.db.patch(existing._id, fields);
      } else {
        await ctx.db.insert('bookingComAccommodations', fields);
      }
      upserted += 1;
    }

    return upserted;
  },
});

export const markSyncStarted = internalMutation({
  args: {
    scope: v.union(v.literal('global'), v.literal('country'), v.literal('city'), v.literal('region'), v.literal('changes')),
    scopeKey: v.string(),
    status: v.optional(v.union(v.literal('queued'), v.literal('running'), v.literal('succeeded'), v.literal('failed'), v.literal('disabled'))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('bookingComSyncState')
      .withIndex('by_scope_and_scopeKey', (q) => q.eq('scope', args.scope).eq('scopeKey', args.scopeKey))
      .unique();
    const fields = {
      scope: args.scope,
      scopeKey: args.scopeKey,
      status: args.status ?? ('running' as const),
      lastStartedAt: now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert('bookingComSyncState', fields);
  },
});

export const markSyncFinished = internalMutation({
  args: {
    scope: v.union(v.literal('global'), v.literal('country'), v.literal('city'), v.literal('region'), v.literal('changes')),
    scopeKey: v.string(),
    status: v.union(v.literal('succeeded'), v.literal('failed'), v.literal('disabled')),
    page: v.optional(v.string()),
    lastChange: v.optional(v.string()),
    lastError: v.optional(v.string()),
    totalSynced: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('bookingComSyncState')
      .withIndex('by_scope_and_scopeKey', (q) => q.eq('scope', args.scope).eq('scopeKey', args.scopeKey))
      .unique();
    const fields = {
      status: args.status,
      page: args.page,
      lastChange: args.lastChange,
      lastError: args.lastError,
      totalSynced: args.totalSynced,
      lastFinishedAt: now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert('bookingComSyncState', {
      scope: args.scope,
      scopeKey: args.scopeKey,
      lastStartedAt: now,
      ...fields,
    });
  },
});

export const persistCreatedOrder = internalMutation({
  args: {
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
    bookingComOrderId: v.string(),
    bookingComReservationId: v.optional(v.string()),
    accommodationId: v.number(),
    accommodationSlug: v.string(),
    checkIn: v.number(),
    checkOut: v.number(),
    status: bookingComStatusValidator,
    currencyCode: v.string(),
    totalPrice: v.number(),
    paymentMethod: v.optional(v.string()),
    paymentTiming: v.optional(v.string()),
    paymentStatus: v.optional(paymentStatusValidator),
    receiptUrl: v.optional(v.string()),
    pincode: v.optional(v.string()),
    cancellationPolicy: v.optional(v.string()),
    priceSnapshot: priceSnapshotValidator,
    sanitizedOrderSnapshot: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const resolvedTripId = await resolveWritableTrip(ctx, travelerSlug, args.tripId);
    const now = Date.now();
    const reservationStatus = statusForReservation(args.status);
    const existingOrder = await ctx.db
      .query('bookingComOrders')
      .withIndex('by_bookingComOrderId', (q) => q.eq('bookingComOrderId', args.bookingComOrderId))
      .unique();

    const reservationFields = {
      staySlug: args.accommodationSlug,
      travelerSlug,
      tripId: resolvedTripId,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      status: reservationStatus,
      paymentMode: 'platform' as const,
      paymentStatus: args.paymentStatus ?? paymentStatusFromTiming(args.paymentTiming),
      platformFeeAmount: 0,
      providerReceivableAmount: args.totalPrice,
      externalPaymentProvider: 'bookingCom',
      externalSource: 'bookingCom' as const,
      externalOrderId: args.bookingComOrderId,
      externalReservationId: args.bookingComReservationId,
      externalAccommodationId: args.accommodationId,
      externalSyncedAt: now,
      totalPrice: args.totalPrice,
      bookedAt: now,
      roomCount: 1,
    };

    const reservationId =
      existingOrder?.reservationId ?? (await ctx.db.insert('reservations', reservationFields));
    if (existingOrder?.reservationId) {
      await ctx.db.patch(existingOrder.reservationId, reservationFields);
    }

    const mirrorFields = {
      experienceSlug: args.accommodationSlug,
      contentKind: 'stay' as const,
      contentSlug: args.accommodationSlug,
      travelerSlug,
      tripId: resolvedTripId,
      reservationId,
      bookedAt: now,
      status: reservationStatus,
      bookingType: 'stay' as const,
      requestKind: 'stayItineraryMirror' as const,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      totalPrice: args.totalPrice,
      paymentMode: 'platform' as const,
      paymentStatus: args.paymentStatus ?? paymentStatusFromTiming(args.paymentTiming),
      platformFeeAmount: 0,
      providerReceivableAmount: args.totalPrice,
      externalPaymentProvider: 'bookingCom',
      externalSource: 'bookingCom' as const,
      externalOrderId: args.bookingComOrderId,
      externalReservationId: args.bookingComReservationId,
      externalAccommodationId: args.accommodationId,
      externalSyncedAt: now,
    };

    const mirrorBookingId =
      existingOrder?.mirrorBookingId ?? (await ctx.db.insert('bookings', mirrorFields));
    if (existingOrder?.mirrorBookingId) {
      await ctx.db.patch(existingOrder.mirrorBookingId, mirrorFields);
    }

    const orderFields = {
      bookingComOrderId: args.bookingComOrderId,
      bookingComReservationId: args.bookingComReservationId,
      reservationId,
      mirrorBookingId,
      accommodationId: args.accommodationId,
      accommodationSlug: args.accommodationSlug,
      travelerSlug,
      tripId: resolvedTripId,
      status: args.status,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      bookedAt: existingOrder?.bookedAt ?? now,
      updatedAt: now,
      syncedAt: now,
      currencyCode: args.currencyCode.toUpperCase(),
      totalPrice: args.totalPrice,
      paymentStatus: args.paymentStatus ?? paymentStatusFromTiming(args.paymentTiming),
      paymentTiming: args.paymentTiming,
      paymentMethod: args.paymentMethod,
      receiptUrl: args.receiptUrl,
      pincode: args.pincode,
      cancellationPolicy: args.cancellationPolicy,
      priceSnapshot: args.priceSnapshot,
      sanitizedOrderSnapshot: sanitizeForStorage(args.sanitizedOrderSnapshot),
    };

    if (existingOrder) {
      await ctx.db.patch(existingOrder._id, orderFields);
      return existingOrder._id;
    }

    return await ctx.db.insert('bookingComOrders', orderFields);
  },
});

export const persistOrderSync = internalMutation({
  args: {
    bookingComOrderId: v.string(),
    status: bookingComStatusValidator,
    commissionAmount: v.optional(v.number()),
    commissionCurrencyCode: v.optional(v.string()),
    commissionStatus: v.optional(v.union(v.literal('pending'), v.literal('payable'), v.literal('paid'), v.literal('reversed'), v.literal('unknown'))),
    sanitizedOrderSnapshot: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('bookingComOrders')
      .withIndex('by_bookingComOrderId', (q) => q.eq('bookingComOrderId', args.bookingComOrderId))
      .unique();
    if (!order) {
      throw new Error('Booking.com order not found.');
    }

    const now = Date.now();
    const reservationStatus = statusForReservation(args.status);
    await ctx.db.patch(order._id, {
      status: args.status,
      commissionAmount: args.commissionAmount,
      commissionCurrencyCode: args.commissionCurrencyCode,
      commissionStatus: args.commissionStatus,
      sanitizedOrderSnapshot: sanitizeForStorage(args.sanitizedOrderSnapshot),
      syncedAt: now,
      updatedAt: now,
    });

    if (order.reservationId) {
      await ctx.db.patch(order.reservationId, {
        status: reservationStatus,
        externalSyncedAt: now,
      });
    }
    if (order.mirrorBookingId) {
      await ctx.db.patch(order.mirrorBookingId, {
        status: reservationStatus,
        externalSyncedAt: now,
      });
    }

    const updated = await ctx.db.get(order._id);
    return updated ? toPublicOrder(updated) : null;
  },
});

export const getOrderById = internalQuery({
  args: { orderId: v.id('bookingComOrders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }
    const travelerSlug = await assertCurrentTravelerSlug(ctx, order.travelerSlug);
    if (order.travelerSlug !== travelerSlug) {
      return null;
    }
    return toPublicOrder(order);
  },
});

export const listTravelerOrders = query({
  args: { travelerSlug: v.string() },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const orders = await ctx.db
      .query('bookingComOrders')
      .withIndex('by_travelerSlug_and_bookedAt', (q) => q.eq('travelerSlug', travelerSlug))
      .order('desc')
      .take(50);

    return orders.map(toPublicOrder);
  },
});

function getNextPage(response: unknown) {
  const metadata = (response as { metadata?: { next_page?: unknown } })?.metadata;
  return typeof metadata?.next_page === 'string' ? metadata.next_page : undefined;
}

async function buildSyncTargets(args: {
  countries?: string[];
  cityIds?: number[];
  regionIds?: number[];
}) {
  const targets: { scope: 'country' | 'city' | 'region'; value: string | number }[] = [];
  for (const country of args.countries ?? []) {
    const normalized = country.trim().toLowerCase();
    if (normalized) {
      targets.push({ scope: 'country', value: normalized });
    }
  }
  for (const cityId of args.cityIds ?? []) {
    targets.push({ scope: 'city', value: cityId });
  }
  for (const regionId of args.regionIds ?? []) {
    targets.push({ scope: 'region', value: regionId });
  }

  if (targets.length > 0) {
    return targets;
  }

  const response = await bookingComPost('/common/locations/countries', {});
  const countries = extractCountryCodes(response);
  return countries.map((country) => ({ scope: 'country' as const, value: country }));
}

function buildDetailsPayload(target: { scope: 'country' | 'city' | 'region'; value: string | number }, page?: string) {
  return {
    ...(target.scope === 'country' ? { country: String(target.value).toLowerCase() } : null),
    ...(target.scope === 'city' ? { city: Number(target.value) } : null),
    ...(target.scope === 'region' ? { region: Number(target.value) } : null),
    ...(page ? { page } : null),
    rows: 1000,
    extras: ['description', 'facilities', 'payment', 'photos', 'policies', 'rooms'],
    languages: ['en-gb'],
  };
}

function extractCountryCodes(response: unknown) {
  const data = Array.isArray((response as { data?: unknown }).data) ? (response as { data: unknown[] }).data : [];
  return data
    .map((country) => {
      if (typeof country === 'string') {
        return country.toLowerCase();
      }
      if (typeof country === 'object' && country !== null) {
        const value = (country as { id?: unknown; country?: unknown; code?: unknown }).id ??
          (country as { country?: unknown }).country ??
          (country as { code?: unknown }).code;
        return typeof value === 'string' ? value.toLowerCase() : null;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));
}

function extractChangedAccommodationIds(response: unknown) {
  const changes = (response as { data?: { changes?: unknown } })?.data?.changes;
  if (Array.isArray(changes)) {
    return changes.map((value) => Number(value)).filter(Number.isFinite);
  }
  if (changes && typeof changes === 'object') {
    return Object.values(changes)
      .flatMap((value) => (Array.isArray(value) ? value : []))
      .map((value) => Number(value))
      .filter(Number.isFinite);
  }
  return [];
}

function normalizeExternalStatus(raw: unknown) {
  const value = String(
    (raw as { status?: unknown })?.status ??
      (raw as { accommodation?: { status?: unknown } })?.accommodation?.status ??
      'unknown'
  ).toLowerCase();

  if (value.includes('cancel')) return 'cancelled' as const;
  if (value.includes('stay')) return 'stayed' as const;
  if (value.includes('modif')) return 'modified' as const;
  if (value.includes('book') || value.includes('confirm')) return 'booked' as const;
  if (value.includes('fail')) return 'failed' as const;
  if (value.includes('pending')) return 'pending' as const;
  return 'unknown' as const;
}

function extractCommission(raw: unknown): {
  amount?: number;
  currencyCode?: string;
  status?: 'pending' | 'payable' | 'paid' | 'reversed' | 'unknown';
} {
  const source =
    (raw as { commission_details?: Record<string, unknown> })?.commission_details ??
    (raw as { commission?: Record<string, unknown> })?.commission ??
    {};
  const amount = Number(source.amount ?? source.value);
  const status = typeof source.status === 'string' ? source.status.toLowerCase() : undefined;

  return {
    amount: Number.isFinite(amount) ? amount : undefined,
    currencyCode: typeof source.currency === 'string' ? source.currency.toUpperCase() : undefined,
    status:
      status === 'pending' || status === 'payable' || status === 'paid' || status === 'reversed'
        ? status
        : 'unknown',
  };
}

export function bookingComProductsForTest(products: BookingComAvailabilityProduct[]) {
  return products;
}
