import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { describe, expect, it } from 'vitest';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  buildBookingComRequest,
  normalizeAvailabilityResponse,
  sanitizeForStorage,
} from '../../convex/bookingComApi';
import schema from '../../convex/schema';

const modules = (import.meta as ImportMeta & {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}).glob('../../convex/**/*.*s');

const bookingComRefs = {
  persistCreatedOrder: makeFunctionReference<'mutation'>('bookingCom:persistCreatedOrder'),
  persistOrderSync: makeFunctionReference<'mutation'>('bookingCom:persistOrderSync'),
  upsertAccommodations: makeFunctionReference<'mutation'>('bookingCom:upsertAccommodations'),
};

function createTest() {
  return convexTest({ schema, modules });
}

type TestBackend = ReturnType<typeof createTest>;

async function seedUser(t: TestBackend, slug: string, role: 'traveler' | 'admin' = 'traveler') {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert('users', {
      slug,
      name: slug,
      email: `${slug}@example.com`,
      role,
      countryCode: 'US',
      countryLabel: 'United States',
      onboardingCompletedAt: Date.now(),
    })
  );

  return {
    userId,
    client: t.withIdentity({
      subject: `${userId}|session-${slug}`,
      tokenIdentifier: `test|${slug}`,
    }),
  };
}

function makeAccommodation(accommodationId: number) {
  return {
    accommodationId,
    slug: `booking-com-${accommodationId}`,
    status: 'live' as const,
    name: `Booking.com Stay ${accommodationId}`,
    locationLabel: 'New York, United States',
    town: 'New York',
    region: 'New York',
    countryCode: 'US',
    countryLabel: 'United States',
    cityId: 20088325,
    regionId: 123,
    coordinate: [-73.985, 40.758],
    imageUri: `https://example.com/booking-${accommodationId}.jpg`,
    galleryImages: [`https://example.com/booking-${accommodationId}.jpg`],
    currencyCode: 'USD',
    rating: 4.7,
    reviewCount: 12,
    accommodationType: 'Hotel',
    description: 'A cached Booking.com accommodation.',
    amenities: ['Wi-Fi', 'Breakfast'],
    roomNames: ['Double room'],
    paymentMethods: ['card'],
    policies: 'Flexible cancellation available',
    searchText: `booking.com stay ${accommodationId} new york`,
  };
}

async function seedLocalStay(t: TestBackend) {
  await t.run(async (ctx) =>
    ctx.db.insert('stays', {
      slug: 'local-stay',
      name: 'Local Stay',
      locationLabel: 'Windhoek, Namibia',
      town: 'Windhoek',
      region: 'Khomas',
      countryCode: 'NA',
      countryLabel: 'Namibia',
      coordinate: [17.0832, -22.5597],
      imageUri: 'https://example.com/local.jpg',
      galleryImages: ['https://example.com/local.jpg'],
      pricePerNight: 120,
      currencyCode: 'USD',
      rating: 4.8,
      reviewCount: 4,
      stayStyle: 'design',
      routeVibe: 'city reset',
      sleepSignal: 'Quiet rooms',
      summary: 'A local provider stay.',
      idealFor: ['Couples'],
      amenities: ['Parking'],
      nearbyHighlights: ['City center'],
      bookingNote: 'Request with host',
      status: 'live',
    })
  );
}

describe('Booking.com helpers', () => {
  it('signs Booking.com API requests with token and affiliate headers', () => {
    const request = buildBookingComRequest(
      { token: 'token-123', affiliateId: '987', apiBase: 'https://demandapi.booking.com/3.2' },
      { hello: 'world' }
    );

    expect(request).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json',
        'X-Affiliate-Id': '987',
      },
      body: '{"hello":"world"}',
    });
  });

  it('normalizes sparse availability products and redacts raw card details', () => {
    const products = normalizeAvailabilityResponse({
      data: [
        {
          products: [
            {
              id: 'product-1',
              name: 'Standard room',
            },
          ],
        },
      ],
    });
    expect(products[0]).toMatchObject({
      id: 'product-1',
      label: 'Standard room',
      currencyCode: 'USD',
      priceTotal: 0,
    });

    const sanitized = sanitizeForStorage({
      payment: {
        card: {
          number: '9999999999999999',
          cvc: '987',
          expiry_date: '2030-12',
        },
      },
    });
    expect(JSON.stringify(sanitized)).not.toContain('9999999999999999');
    expect(JSON.stringify(sanitized)).not.toContain('987');
  });
});

describe('Booking.com Convex integration', () => {
  it('returns Booking.com cached stays alongside local stays', async () => {
    const t = createTest();
    await seedLocalStay(t);
    await t.mutation(bookingComRefs.upsertAccommodations, {
      syncedAt: Date.now(),
      accommodations: [makeAccommodation(1001)],
    });

    const stays = await t.query(api.trip.listAllStays, {});
    expect(stays.map((stay: any) => stay.slug)).toEqual(expect.arrayContaining(['local-stay', 'booking-com-1001']));
    expect(stays.find((stay: any) => stay.slug === 'booking-com-1001')).toMatchObject({
      source: 'bookingCom',
      bookingComAccommodationId: 1001,
      priceDisplayLabel: 'Check availability',
    });
  });

  it('persists Booking.com orders, mirrors reservations, and never stores raw card values', async () => {
    const t = createTest();
    const traveler = await seedUser(t, 'traveler');

    const orderId = await traveler.client.mutation(bookingComRefs.persistCreatedOrder, {
      travelerSlug: 'traveler',
      bookingComOrderId: 'order-1',
      bookingComReservationId: 'reservation-1',
      accommodationId: 1001,
      accommodationSlug: 'booking-com-1001',
      checkIn: Date.UTC(2026, 6, 1),
      checkOut: Date.UTC(2026, 6, 3),
      status: 'booked',
      currencyCode: 'USD',
      totalPrice: 450,
      paymentMethod: 'card',
      paymentTiming: 'pay_online_now',
      paymentStatus: 'pending',
      priceSnapshot: {
        currencyCode: 'USD',
        total: 450,
      },
      sanitizedOrderSnapshot: {
        payment: {
          card: {
            number: '9999999999999999',
            cvc: '987',
            expiry_date: '2030-12',
          },
        },
      },
    });

    const records = await t.run(async (ctx) => {
      const order = await ctx.db.get(orderId as Id<'bookingComOrders'>);
      const reservations = await ctx.db
        .query('reservations')
        .withIndex('by_travelerSlug_and_staySlug_and_bookedAt', (q) =>
          q.eq('travelerSlug', 'traveler').eq('staySlug', 'booking-com-1001')
        )
        .take(10);
      const mirrors = await ctx.db
        .query('bookings')
        .withIndex('by_reservationId', (q) => q.eq('reservationId', order!.reservationId))
        .take(10);
      return { order, reservations, mirrors };
    });

    expect(records.order).toMatchObject({
      bookingComOrderId: 'order-1',
      status: 'booked',
    });
    expect(records.reservations[0]).toMatchObject({
      externalSource: 'bookingCom',
      externalOrderId: 'order-1',
      externalAccommodationId: 1001,
      status: 'confirmed',
    });
    expect(records.mirrors[0]).toMatchObject({
      externalSource: 'bookingCom',
      externalOrderId: 'order-1',
      status: 'confirmed',
    });
    const storedSnapshot = JSON.stringify(records.order?.sanitizedOrderSnapshot);
    expect(storedSnapshot).not.toContain('9999999999999999');
    expect(storedSnapshot).not.toContain('987');
  });

  it('enforces traveler authorization when persisting external orders', async () => {
    const t = createTest();
    await seedUser(t, 'traveler');
    const other = await seedUser(t, 'other');

    await expect(
      other.client.mutation(bookingComRefs.persistCreatedOrder, {
        travelerSlug: 'traveler',
        bookingComOrderId: 'order-2',
        accommodationId: 1002,
        accommodationSlug: 'booking-com-1002',
        checkIn: Date.UTC(2026, 6, 1),
        checkOut: Date.UTC(2026, 6, 3),
        status: 'booked',
        currencyCode: 'USD',
        totalPrice: 300,
      })
    ).rejects.toThrow(/Unauthorized traveler/);
  });

  it('syncs order status and commission details into mirrored records', async () => {
    const t = createTest();
    const traveler = await seedUser(t, 'traveler');

    await traveler.client.mutation(bookingComRefs.persistCreatedOrder, {
      travelerSlug: 'traveler',
      bookingComOrderId: 'order-sync',
      accommodationId: 1003,
      accommodationSlug: 'booking-com-1003',
      checkIn: Date.UTC(2026, 6, 1),
      checkOut: Date.UTC(2026, 6, 3),
      status: 'booked',
      currencyCode: 'USD',
      totalPrice: 550,
    });

    await t.mutation(bookingComRefs.persistOrderSync, {
      bookingComOrderId: 'order-sync',
      status: 'cancelled',
      commissionAmount: 55,
      commissionCurrencyCode: 'USD',
      commissionStatus: 'reversed',
    });

    const records = await t.run(async (ctx) => {
      const order = await ctx.db
        .query('bookingComOrders')
        .withIndex('by_bookingComOrderId', (q) => q.eq('bookingComOrderId', 'order-sync'))
        .unique();
      const reservation = order?.reservationId ? await ctx.db.get(order.reservationId) : null;
      const mirror = order?.mirrorBookingId ? await ctx.db.get(order.mirrorBookingId) : null;
      return { order, reservation, mirror };
    });

    expect(records.order).toMatchObject({
      status: 'cancelled',
      commissionAmount: 55,
      commissionCurrencyCode: 'USD',
      commissionStatus: 'reversed',
    });
    expect(records.reservation?.status).toBe('cancelled');
    expect(records.mirror?.status).toBe('cancelled');
  });

  it('bounds global cache writes to a single Convex mutation batch', async () => {
    const t = createTest();
    const accommodations = Array.from({ length: 101 }, (_value, index) => makeAccommodation(2000 + index));

    const upserted = await t.mutation(bookingComRefs.upsertAccommodations, {
      syncedAt: Date.now(),
      accommodations,
    });
    const storedCount = await t.run(async (ctx) => {
      const rows = await ctx.db.query('bookingComAccommodations').take(200);
      return rows.length;
    });

    expect(upserted).toBe(100);
    expect(storedCount).toBe(100);
  });
});
