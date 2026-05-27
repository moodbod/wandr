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
type TestRole = 'traveler' | 'serviceProvider' | 'admin';

async function seedUser(t: TestBackend, slug: string, role: TestRole = 'traveler') {
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

function experienceDraft(title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    title,
    subtitle: 'Guided local experience',
    description: 'A provider-led experience for guests.',
    category: 'Guided tour',
    durationLabel: '2 hours',
    groupCapacity: 8,
    priceUsd: 45,
    locationLabel: 'Windhoek',
    town: 'Windhoek',
    region: 'Khomas',
    countryCode: 'NA',
    countryLabel: 'Namibia',
    coordinate: [17.0832, -22.5597],
    imageUri: `https://example.com/${slug}.jpg`,
    galleryImages: [`https://example.com/${slug}.jpg`],
    availabilityLabel: 'Daily',
    confirmMode: 'Provider confirms within 24 hours',
    includes: ['Guide'],
    acceptedPaymentModes: ['cash'] as ('cash' | 'platform')[],
    directPaymentNotes: 'Cash on arrival.',
  };
}

describe('service provider APIs', () => {
  it('gates provider tools and keeps submitted listings hidden until admin approval', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    const provider = await seedUser(t, 'provider');
    const traveler = await seedUser(t, 'traveler');

    await expect(
      traveler.client.mutation(api.provider.upsertMyExperienceDraft, experienceDraft('Traveler tour'))
    ).rejects.toThrow(/Service provider access required/);

    await admin.client.mutation(api.admin.inviteServiceProvider, {
      userId: provider.userId,
      businessName: 'Provider Tours',
      providerType: 'experiences',
      acceptedPaymentModes: ['cash'],
      directPaymentNotes: 'Cash on arrival.',
    });

    const providerSession = await provider.client.query(api.authSession.getCurrentSession, {});
    expect(providerSession?.role).toBe('serviceProvider');

    const created = await provider.client.mutation(api.provider.upsertMyExperienceDraft, experienceDraft('Desert Walk'));
    await provider.client.mutation(api.provider.submitMyExperienceForReview, {
      experienceId: created.experienceId as Id<'experiences'>,
    });

    const ownListings = await provider.client.query(api.provider.listMyListings, {});
    expect(ownListings.experiences[0]).toMatchObject({
      title: 'Desert Walk',
      reviewStatus: 'submitted',
      status: 'draft',
    });

    const hiddenPage = await traveler.client.query(api.explore.getPageContent, { slug: 'explore' });
    expect(JSON.stringify(hiddenPage)).not.toContain('Desert Walk');

    const submissions = await admin.client.query(api.admin.listProviderSubmissions, {
      reviewStatus: 'submitted',
    });
    expect(submissions.page).toHaveLength(1);

    await admin.client.mutation(api.admin.reviewProviderListing, {
      kind: 'experience',
      id: created.experienceId as Id<'experiences'>,
      decision: 'approved',
    });

    const publicPage = await traveler.client.query(api.explore.getPageContent, { slug: 'explore' });
    expect(JSON.stringify(publicPage)).toContain('Desert Walk');
  });

  it('limits provider request management to bookings for their own listings', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    const providerA = await seedUser(t, 'provider-a');
    const providerB = await seedUser(t, 'provider-b');
    const traveler = await seedUser(t, 'traveler');

    await admin.client.mutation(api.admin.inviteServiceProvider, {
      userId: providerA.userId,
      businessName: 'Provider A Tours',
      providerType: 'experiences',
      acceptedPaymentModes: ['cash'],
    });
    await admin.client.mutation(api.admin.inviteServiceProvider, {
      userId: providerB.userId,
      businessName: 'Provider B Tours',
      providerType: 'experiences',
      acceptedPaymentModes: ['cash'],
    });

    const providerAExperience = await providerA.client.mutation(
      api.provider.upsertMyExperienceDraft,
      experienceDraft('Provider A Walk')
    );
    await providerA.client.mutation(api.provider.submitMyExperienceForReview, {
      experienceId: providerAExperience.experienceId as Id<'experiences'>,
    });
    await admin.client.mutation(api.admin.reviewProviderListing, {
      kind: 'experience',
      id: providerAExperience.experienceId as Id<'experiences'>,
      decision: 'approved',
    });

    const providerBExperience = await providerB.client.mutation(
      api.provider.upsertMyExperienceDraft,
      experienceDraft('Provider B Walk')
    );
    await providerB.client.mutation(api.provider.submitMyExperienceForReview, {
      experienceId: providerBExperience.experienceId as Id<'experiences'>,
    });
    await admin.client.mutation(api.admin.reviewProviderListing, {
      kind: 'experience',
      id: providerBExperience.experienceId as Id<'experiences'>,
      decision: 'approved',
    });

    const bookingId = await traveler.client.mutation(api.trip.addExperienceToTrip, {
      experienceSlug: 'provider-a-walk',
      travelerSlug: 'traveler',
      partySize: 2,
      priceSnapshot: 45,
      currencyCode: 'USD',
    });

    const providerARequests = await providerA.client.query(api.provider.listMyRequests, { status: 'all' });
    const providerBRequests = await providerB.client.query(api.provider.listMyRequests, { status: 'all' });
    expect(providerARequests).toHaveLength(1);
    expect(providerBRequests).toHaveLength(0);
    expect(providerARequests[0]).toMatchObject({
      paymentMode: 'cash',
      paymentStatus: 'unpaid',
      totalPrice: 90,
    });

    await expect(
      providerB.client.mutation(api.provider.updateMyRequestStatus, {
        requestId: bookingId as Id<'bookings'>,
        source: 'experienceBooking',
        status: 'confirmed',
      })
    ).rejects.toThrow(/Request not found/);

    await providerA.client.mutation(api.provider.updateMyRequestStatus, {
      requestId: bookingId as Id<'bookings'>,
      source: 'experienceBooking',
      status: 'confirmed',
    });

    const booking = await t.run(async (ctx) => ctx.db.get(bookingId as Id<'bookings'>));
    expect(booking?.status).toBe('confirmed');
  });
});
