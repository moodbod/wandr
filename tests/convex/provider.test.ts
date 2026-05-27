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

function stayDraft(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    name,
    locationLabel: 'Windhoek',
    town: 'Windhoek',
    region: 'Khomas',
    countryCode: 'NA',
    countryLabel: 'Namibia',
    summary: 'A provider-managed stay for guests.',
    coordinate: [17.0832, -22.5597],
    imageUri: `https://example.com/${slug}.jpg`,
    galleryImages: [`https://example.com/${slug}.jpg`],
    priceUsd: 120,
    currencyCode: 'USD',
    bookingNote: 'Request to reserve this stay.',
    stayStyle: 'lodge' as const,
    routeVibe: 'wildlife stop' as const,
    sleepSignal: 'Quiet lodge stay',
    idealFor: ['Couples'],
    amenities: ['Breakfast'],
    nearbyHighlights: ['City center'],
    bookingProfile: {
      roomOptions: [
        {
          id: 'standard-room',
          label: 'Standard room',
          detail: 'Queen room',
          maxAdults: 2,
          maxChildren: 1,
          maxRooms: 3,
          bedOptions: [{ id: 'queen', label: 'Queen bed' }],
        },
      ],
      arrivalOptions: [{ id: 'arrival', label: '15:00 - 20:00' }],
      defaultRoomOptionId: 'standard-room',
      defaultArrivalOptionId: 'arrival',
    },
    acceptedPaymentModes: ['cash'] as ('cash' | 'platform')[],
    directPaymentNotes: 'Cash on arrival.',
  };
}

async function seedStorageFile(t: TestBackend, contentType = 'image/jpeg', byteLength = 4) {
  return await t.run(async (ctx) =>
    ctx.storage.store(
      new File([new Uint8Array(byteLength).fill(0xff)], contentType.startsWith('image/') ? 'image.jpg' : 'file.txt', {
        type: contentType,
      })
    )
  );
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
      providerType: 'experiences',
    });

    const providerSession = await provider.client.query(api.authSession.getCurrentSession, {});
    expect(providerSession?.role).toBe('serviceProvider');
    const invitedProfile = await provider.client.query(api.provider.getMyBusinessProfile, {});
    expect(invitedProfile).toMatchObject({
      status: 'invited',
      providerType: 'experiences',
    });

    await expect(
      provider.client.mutation(api.provider.upsertMyExperienceDraft, experienceDraft('Invited tour'))
    ).rejects.toThrow(/Provider setup required/);

    await provider.client.mutation(api.provider.completeMyBusinessSetup, {
      businessName: 'Provider Tours',
      contactEmail: 'provider@example.com',
      contactName: 'Provider',
      acceptedPaymentModes: ['cash'],
      directPaymentNotes: 'Cash on arrival.',
    });

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
      providerType: 'experiences',
    });
    await providerA.client.mutation(api.provider.completeMyBusinessSetup, {
      businessName: 'Provider A Tours',
      acceptedPaymentModes: ['cash'],
    });
    await admin.client.mutation(api.admin.inviteServiceProvider, {
      userId: providerB.userId,
      providerType: 'experiences',
    });
    await providerB.client.mutation(api.provider.completeMyBusinessSetup, {
      businessName: 'Provider B Tours',
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

  it('uses Convex Storage images for provider experiences and rejects invalid uploads', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    const provider = await seedUser(t, 'provider');
    const traveler = await seedUser(t, 'traveler');
    const coverStorageId = await seedStorageFile(t);
    const galleryStorageId = await seedStorageFile(t);
    const oversizedStorageId = await seedStorageFile(t, 'image/jpeg', 8 * 1024 * 1024 + 1);

    await admin.client.mutation(api.admin.inviteServiceProvider, {
      userId: provider.userId,
      providerType: 'experiences',
    });
    await provider.client.mutation(api.provider.completeMyBusinessSetup, {
      businessName: 'Storage Tours',
      acceptedPaymentModes: ['cash'],
    });

    await expect(
      provider.client.mutation(api.provider.upsertMyExperienceDraft, {
        ...experienceDraft('Broken Upload'),
        imageStorageId: oversizedStorageId as Id<'_storage'>,
      })
    ).rejects.toThrow(/8 MB/);

    const created = await provider.client.mutation(api.provider.upsertMyExperienceDraft, {
      ...experienceDraft('Stored Desert Walk'),
      galleryImages: ['https://legacy.example.com/gallery.jpg'],
      galleryStorageIds: [galleryStorageId as Id<'_storage'>],
      imageStorageId: coverStorageId as Id<'_storage'>,
      imageUri: 'https://legacy.example.com/cover.jpg',
    });
    await provider.client.mutation(api.provider.submitMyExperienceForReview, {
      experienceId: created.experienceId as Id<'experiences'>,
    });
    await admin.client.mutation(api.admin.reviewProviderListing, {
      kind: 'experience',
      id: created.experienceId as Id<'experiences'>,
      decision: 'approved',
    });

    const ownListings = await provider.client.query(api.provider.listMyListings, {});
    expect(ownListings.experiences[0]).toMatchObject({
      imageStorageId: coverStorageId,
      galleryStorageIds: [galleryStorageId],
      reviewStatus: 'approved',
      status: 'live',
      title: 'Stored Desert Walk',
    });
    expect(ownListings.experiences[0].imageUri).not.toBe('https://legacy.example.com/cover.jpg');

    const catalog = await traveler.client.query(api.catalog.getLiveCatalog, {});
    const storedExperience = catalog.experiences.find((experience: any) => experience.slug === 'stored-desert-walk');
    expect(storedExperience?.imageUri).toBeTruthy();
    expect(storedExperience?.imageUri).not.toBe('https://legacy.example.com/cover.jpg');
    expect(storedExperience?.galleryImages.length).toBeGreaterThanOrEqual(2);

    const page = await traveler.client.query(api.explore.getPageContent, { slug: 'explore' });
    expect(JSON.stringify(page)).toContain('Stored Desert Walk');
  });

  it('uses Convex Storage images for provider stays and trip stay reads', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    const provider = await seedUser(t, 'stay-provider');
    const traveler = await seedUser(t, 'traveler');
    const coverStorageId = await seedStorageFile(t);
    const galleryStorageId = await seedStorageFile(t);

    await admin.client.mutation(api.admin.inviteServiceProvider, {
      userId: provider.userId,
      providerType: 'stays',
    });
    await provider.client.mutation(api.provider.completeMyBusinessSetup, {
      businessName: 'Storage Stays',
      acceptedPaymentModes: ['cash'],
    });

    const created = await provider.client.mutation(api.provider.upsertMyStayDraft, {
      ...stayDraft('Stored City Lodge'),
      galleryImages: ['https://legacy.example.com/stay-gallery.jpg'],
      galleryStorageIds: [galleryStorageId as Id<'_storage'>],
      imageStorageId: coverStorageId as Id<'_storage'>,
      imageUri: 'https://legacy.example.com/stay-cover.jpg',
    });
    await provider.client.mutation(api.provider.submitMyStayForReview, {
      stayId: created.stayId as Id<'stays'>,
    });
    await admin.client.mutation(api.admin.reviewProviderListing, {
      kind: 'stay',
      id: created.stayId as Id<'stays'>,
      decision: 'approved',
    });

    const stays = await traveler.client.query(api.trip.listAllStays, {});
    const listedStay = stays.find((stay: any) => stay.slug === 'stored-city-lodge');
    expect(listedStay?.imageUri).toBeTruthy();
    expect(listedStay?.imageUri).not.toBe('https://legacy.example.com/stay-cover.jpg');

    const detail = await traveler.client.query(api.trip.getStayBySlug, { slug: 'stored-city-lodge' });
    expect(detail?.galleryImages.length).toBeGreaterThanOrEqual(2);
    expect(detail?.imageUri).not.toBe('https://legacy.example.com/stay-cover.jpg');
  });

  it('limits provider listing edits and archives to their own business', async () => {
    const t = createTest();
    const admin = await seedUser(t, 'admin', 'admin');
    const providerA = await seedUser(t, 'provider-a');
    const providerB = await seedUser(t, 'provider-b');

    await admin.client.mutation(api.admin.inviteServiceProvider, {
      userId: providerA.userId,
      providerType: 'experiences',
    });
    await providerA.client.mutation(api.provider.completeMyBusinessSetup, {
      businessName: 'Provider A Tours',
      acceptedPaymentModes: ['cash'],
    });
    await admin.client.mutation(api.admin.inviteServiceProvider, {
      userId: providerB.userId,
      providerType: 'experiences',
    });
    await providerB.client.mutation(api.provider.completeMyBusinessSetup, {
      businessName: 'Provider B Tours',
      acceptedPaymentModes: ['cash'],
    });

    const providerAExperience = await providerA.client.mutation(
      api.provider.upsertMyExperienceDraft,
      experienceDraft('Private Provider Walk')
    );

    await expect(
      providerB.client.mutation(api.provider.upsertMyExperienceDraft, {
        ...experienceDraft('Hijacked Walk'),
        experienceId: providerAExperience.experienceId as Id<'experiences'>,
      })
    ).rejects.toThrow(/Experience not found/);

    await expect(
      providerB.client.mutation(api.provider.archiveMyListing, {
        kind: 'experience',
        id: providerAExperience.experienceId as Id<'experiences'>,
      })
    ).rejects.toThrow(/Experience not found/);
  });
});
