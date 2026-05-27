import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import schema from '../../convex/schema';

const modules = (import.meta as ImportMeta & {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}).glob('../../convex/**/*.*s');

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
      countryCode: 'NA',
      countryLabel: 'Namibia',
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

async function seedExperience(
  t: TestBackend,
  slug: string,
  managerSlug = 'manager',
  coordinate?: readonly [number, number]
) {
  return await t.run(async (ctx) =>
    ctx.db.insert('experiences', {
      slug,
      managerSlug,
      itemKind: 'experience',
      badge: 'Experience',
      ctaLabel: 'Request',
      title: slug,
      subtitle: 'Guided stop',
      description: 'Guided stop',
      imageUri: `https://example.com/${slug}.jpg`,
      price: '$120',
      priceSuffix: 'per person',
      locationLabel: 'Namibia',
      includes: ['Guide'],
      status: 'live',
      ...(coordinate ? { coordinate: [coordinate[0], coordinate[1]] } : {}),
    })
  );
}

async function seedStorageImage(t: TestBackend) {
  return await t.run(async (ctx) =>
    ctx.storage.store(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }))
  );
}

describe('admin dashboard APIs', () => {
  it('blocks travelers from admin queries and mutations', async () => {
    const t = createTest();
    const traveler = await seedUser(t, 'traveler');
    const other = await seedUser(t, 'other');

    await expect(traveler.client.query(api.admin.getOverview, {})).rejects.toThrow(/Admin access required/);
    await expect(traveler.client.query(api.admin.listUsers, {})).rejects.toThrow(/Admin access required/);
    await expect(traveler.client.query(api.admin.listAuditEvents, {})).rejects.toThrow(/Admin access required/);
    await expect(
      traveler.client.mutation(api.admin.updateUserRole, {
        userId: other.userId,
        role: 'admin',
      })
    ).rejects.toThrow(/Admin access required/);
  });

  it('lists users and lets an admin promote another user', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    const traveler = await seedUser(t, 'traveler');

    const users = await admin.client.query(api.admin.listUsers, {
      role: 'all',
      search: 'traveler',
    });
    expect(users.page).toHaveLength(1);
    expect(users.page[0]).toMatchObject({ role: 'traveler', slug: 'traveler' });

    const updated = await admin.client.mutation(api.admin.updateUserRole, {
      userId: traveler.userId,
      role: 'admin',
    });
    expect(updated).toMatchObject({ role: 'admin', slug: 'traveler' });

    const session = await traveler.client.query(api.authSession.getCurrentSession, {});
    expect(session?.role).toBe('admin');
  });

  it('does not let an admin change their own role', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');

    await expect(
      admin.client.mutation(api.admin.updateUserRole, {
        userId: admin.userId,
        role: 'traveler',
      })
    ).rejects.toThrow(/own role/);
  });

  it('writes audit events for role changes', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    const traveler = await seedUser(t, 'traveler');

    await admin.client.mutation(api.admin.updateUserRole, {
      userId: traveler.userId,
      role: 'admin',
    });

    const events = await admin.client.query(api.admin.listAuditEvents, {});
    expect(events.page).toHaveLength(1);
    expect(events.page[0]).toMatchObject({
      action: 'role.update',
      actorSlug: 'admin',
      targetKind: 'user',
    });
  });

  it('creates pending provider invites for users to complete', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    const otherAdmin = await seedUser(t, 'other-admin', 'admin');
    const traveler = await seedUser(t, 'traveler');

    await expect(
      admin.client.mutation(api.admin.inviteServiceProvider, {
        userId: otherAdmin.userId,
        providerType: 'both',
      })
    ).rejects.toThrow(/Admin accounts/);

    const invited = await admin.client.mutation(api.admin.inviteServiceProvider, {
      userId: traveler.userId,
      providerType: 'stays',
    });

    expect(invited).toMatchObject({
      status: 'invited',
      providerType: 'stays',
    });

    const session = await traveler.client.query(api.authSession.getCurrentSession, {});
    expect(session?.role).toBe('serviceProvider');

    await expect(
      admin.client.mutation(api.admin.updateServiceProviderStatus, {
        businessProfileId: invited._id as Id<'businessProfiles'>,
        status: 'active',
      })
    ).rejects.toThrow(/finish business setup/);

    const profile = await traveler.client.query(api.provider.getMyBusinessProfile, {});
    expect(profile).toMatchObject({ status: 'invited', providerType: 'stays' });

    const completed = await traveler.client.mutation(api.provider.completeMyBusinessSetup, {
      businessName: 'Traveler Stays',
      acceptedPaymentModes: ['cash'],
    });
    expect(completed).toMatchObject({ businessName: 'Traveler Stays', status: 'active' });
  });

  it('lists and updates platform experience requests', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    await seedUser(t, 'traveler');
    await seedExperience(t, 'kayak', 'manager');
    const bookingId = await t.run(async (ctx) =>
      ctx.db.insert('bookings', {
        experienceSlug: 'kayak',
        travelerSlug: 'traveler',
        bookedAt: Date.now(),
        status: 'pending',
        requestKind: 'experienceRequest',
      })
    );

    const requests = await admin.client.query(api.admin.listRequests, { status: 'pending' });
    expect(requests.page).toHaveLength(1);
    expect(requests.page[0]).toMatchObject({ slug: 'kayak', status: 'pending' });

    await admin.client.mutation(api.admin.updateRequestStatus, {
      requestId: bookingId,
      source: 'experienceBooking',
      status: 'confirmed',
    });

    const updated = await t.run(async (ctx) => ctx.db.get(bookingId as Id<'bookings'>));
    expect(updated?.status).toBe('confirmed');
  });

  it('uses real content mutations and reflects content metrics', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    const imageStorageId = await seedStorageImage(t);

    const created = await admin.client.mutation(api.catalog.upsertManagedLocation, {
      title: 'Real admin location',
      description: 'Created by the admin dashboard test.',
      category: 'Point of interest',
      locationLabel: 'Windhoek',
      region: 'Khomas',
      coordinate: [17.08, -22.56],
      imageStorageId,
      galleryImages: [],
      visitTips: ['Bring water'],
      status: 'draft',
    });
    await admin.client.mutation(api.catalog.updateManagedContentStatus, {
      kind: 'location',
      id: created.locationId,
      status: 'live',
    });

    const overview = await admin.client.query(api.admin.getOverview, {});
    expect(overview.content.locations.live).toBe(1);
    expect(overview.platform.content.locations).toBe(1);

    const events = await admin.client.query(api.admin.listAuditEvents, {});
    expect(events.page.map((event: any) => event.action)).toEqual(
      expect.arrayContaining(['content.create', 'content.status'])
    );
  });

  it('returns platform trip and distance metrics', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    await seedUser(t, 'traveler');
    await seedExperience(t, 'start', 'manager', [17.08, -22.56]);
    await seedExperience(t, 'finish', 'manager', [17.18, -22.56]);
    const now = Date.now();
    const { firstBookingId, secondBookingId } = await t.run(async (ctx) => {
      const tripId = await ctx.db.insert('trips', {
        name: 'Route',
        travelerSlug: 'traveler',
        createdAt: now,
        status: 'active',
        visibility: 'public',
      });
      const firstBookingId = await ctx.db.insert('bookings', {
        experienceSlug: 'start',
        travelerSlug: 'traveler',
        bookedAt: now,
        status: 'confirmed',
        requestKind: 'experienceRequest',
        tripId,
      });
      const secondBookingId = await ctx.db.insert('bookings', {
        experienceSlug: 'finish',
        travelerSlug: 'traveler',
        bookedAt: now + 1000,
        status: 'confirmed',
        requestKind: 'experienceRequest',
        tripId,
      });
      await ctx.db.insert('visits', {
        bookingId: firstBookingId,
        tripId,
        travelerSlug: 'traveler',
        experienceSlug: 'start',
        arrivedAt: now + 2000,
        arrivalSource: 'manual',
      });
      await ctx.db.insert('visits', {
        bookingId: secondBookingId,
        tripId,
        travelerSlug: 'traveler',
        experienceSlug: 'finish',
        arrivedAt: now + 3000,
        arrivalSource: 'manual',
      });

      return { firstBookingId, secondBookingId };
    });
    expect(firstBookingId).toBeTruthy();
    expect(secondBookingId).toBeTruthy();

    const overview = await admin.client.query(api.admin.getOverview, {});
    expect(overview.platform.trips).toMatchObject({ total: 1, active: 1, public: 1 });
    expect(overview.platform.itinerary.totalStops).toBe(2);
    expect(overview.platform.engagement.visits).toBe(2);
    expect(overview.platform.distance.plannedKm).toBeGreaterThan(0);
    expect(overview.platform.distance.coveredKm).toBeGreaterThan(0);
  });
});
