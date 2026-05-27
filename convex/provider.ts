import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { getAuthUserRole, type AuthUserProfile } from './appProfiles';
import { requireCurrentAuthUser } from './authHelpers';

const requestStatusValidator = v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled'));
const requestStatusFilterValidator = v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled'), v.literal('all'));
const requestSourceValidator = v.union(v.literal('experienceBooking'), v.literal('stayBooking'));
const paymentModeValidator = v.union(v.literal('cash'), v.literal('platform'));
const coordinateValidator = v.array(v.number());
const galleryValidator = v.array(v.string());
const stayStyleValidator = v.union(v.literal('design'), v.literal('lodge'), v.literal('roadside'), v.literal('wellness'));
const routeVibeValidator = v.union(
  v.literal('city reset'),
  v.literal('coast base'),
  v.literal('wildlife stop'),
  v.literal('desert night')
);
const stayBookingProfileValidator = v.object({
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
});

type PaymentMode = 'cash' | 'platform';
function optionalText(value?: string) {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireText(value: string, label: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ConvexError(`${label} is required.`);
  }
  return trimmed;
}

function normalizePaymentModes(value?: PaymentMode[]) {
  const modes = value?.length ? value : ['cash' as const];
  return Array.from(new Set(modes));
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

async function createUniqueExperienceSlug(ctx: QueryCtx | MutationCtx, title: string, currentId?: Id<'experiences'>) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await ctx.db.query('experiences').withIndex('by_slug', (q) => q.eq('slug', slug)).unique();
    if (!existing || existing._id === currentId) {
      return slug;
    }
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function createUniqueStaySlug(ctx: QueryCtx | MutationCtx, name: string, currentId?: Id<'stays'>) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await ctx.db.query('stays').withIndex('by_slug', (q) => q.eq('slug', slug)).unique();
    if (!existing || existing._id === currentId) {
      return slug;
    }
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function requireProviderBusiness(ctx: QueryCtx | MutationCtx) {
  const { authRecord, user } = await requireCurrentAuthUser(ctx);
  const role = getAuthUserRole(user as AuthUserProfile);

  if (role !== 'serviceProvider' && role !== 'admin') {
    throw new ConvexError('Service provider access required.');
  }

  if (!user.slug) {
    throw new ConvexError('Provider profile incomplete.');
  }

  const business = await ctx.db
    .query('businessProfiles')
    .withIndex('by_ownerSlug', (q) => q.eq('ownerSlug', user.slug!))
    .unique();

  if (!business) {
    throw new ConvexError('Provider invite required.');
  }

  if (business.status !== 'active') {
    throw new ConvexError('Provider account is suspended.');
  }

  return {
    business,
    role,
    slug: user.slug,
    userId: authRecord.authUserId,
  };
}

function assertProviderCanManageKind(business: Doc<'businessProfiles'>, kind: 'experiences' | 'stays') {
  if (business.providerType === 'both' || business.providerType === kind) {
    return;
  }
  throw new ConvexError(`This provider account cannot manage ${kind}.`);
}

function isActionableExperienceBooking(booking: Doc<'bookings'>) {
  return (
    booking.requestKind !== 'itineraryStop' &&
    booking.requestKind !== 'stayItineraryMirror' &&
    booking.contentKind !== 'location' &&
    booking.contentKind !== 'stay'
  );
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
    throw new ConvexError('Choose a valid room type.');
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
    throw new ConvexError('This room type is fully booked for those dates.');
  }
}

function toBusinessProfileRow(profile: Doc<'businessProfiles'>) {
  return {
    _id: profile._id,
    businessName: profile.businessName,
    providerType: profile.providerType,
    contactEmail: profile.contactEmail ?? null,
    contactPhone: profile.contactPhone ?? null,
    contactName: profile.contactName ?? null,
    status: profile.status,
    acceptedPaymentModes: profile.acceptedPaymentModes,
    directPaymentNotes: profile.directPaymentNotes ?? null,
    subscriptionStatus: profile.subscriptionStatus ?? 'none',
  };
}

function toExperienceListingRow(experience: Doc<'experiences'>) {
  return {
    _id: experience._id,
    kind: 'experience' as const,
    title: experience.title,
    slug: experience.slug,
    status: experience.status ?? ('draft' as const),
    reviewStatus: experience.reviewStatus ?? ('draft' as const),
    price: experience.price,
    locationLabel: experience.locationLabel ?? experience.subtitle,
    submittedAt: experience.submittedAt ?? null,
    rejectionNote: experience.rejectionNote ?? null,
  };
}

function toStayListingRow(stay: Doc<'stays'>) {
  return {
    _id: stay._id,
    kind: 'stay' as const,
    title: stay.name,
    slug: stay.slug,
    status: stay.status ?? ('draft' as const),
    reviewStatus: stay.reviewStatus ?? ('draft' as const),
    price: `${stay.currencyCode} ${stay.pricePerNight}`,
    locationLabel: stay.locationLabel,
    submittedAt: stay.submittedAt ?? null,
    rejectionNote: stay.rejectionNote ?? null,
  };
}

export const getMyBusinessProfile = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentAuthUser(ctx);
    const role = getAuthUserRole(user as AuthUserProfile);
    if ((role !== 'serviceProvider' && role !== 'admin') || !user.slug) {
      return null;
    }

    const business = await ctx.db
      .query('businessProfiles')
      .withIndex('by_ownerSlug', (q) => q.eq('ownerSlug', user.slug!))
      .unique();

    return business ? toBusinessProfileRow(business) : null;
  },
});

export const listMyListings = query({
  args: {},
  handler: async (ctx) => {
    const { business } = await requireProviderBusiness(ctx);
    const [experiences, stays] = await Promise.all([
      ctx.db.query('experiences').withIndex('by_businessProfileId', (q) => q.eq('businessProfileId', business._id)).take(200),
      ctx.db.query('stays').withIndex('by_businessProfileId', (q) => q.eq('businessProfileId', business._id)).take(200),
    ]);

    return {
      business: toBusinessProfileRow(business),
      experiences: experiences.map(toExperienceListingRow),
      stays: stays.map(toStayListingRow),
    };
  },
});

export const generateProviderImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireProviderBusiness(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const upsertMyExperienceDraft = mutation({
  args: {
    experienceId: v.optional(v.id('experiences')),
    title: v.string(),
    subtitle: v.string(),
    description: v.string(),
    category: v.string(),
    durationLabel: v.string(),
    groupCapacity: v.number(),
    priceUsd: v.number(),
    locationLabel: v.string(),
    town: v.optional(v.string()),
    region: v.string(),
    countryCode: v.optional(v.string()),
    countryLabel: v.optional(v.string()),
    planningLocationId: v.optional(v.string()),
    coordinate: coordinateValidator,
    imageUri: v.string(),
    galleryImages: galleryValidator,
    availabilityLabel: v.string(),
    confirmMode: v.string(),
    includes: v.array(v.string()),
    acceptedPaymentModes: v.optional(v.array(paymentModeValidator)),
    directPaymentNotes: v.optional(v.string()),
    cancellationPolicy: v.optional(v.string()),
    contactNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const provider = await requireProviderBusiness(ctx);
    assertProviderCanManageKind(provider.business, 'experiences');

    const title = requireText(args.title, 'Title');
    const slug = await createUniqueExperienceSlug(ctx, title, args.experienceId);
    const payload = {
      slug,
      managerSlug: provider.slug,
      businessProfileId: provider.business._id,
      submittedBySlug: provider.slug,
      reviewStatus: 'draft' as const,
      status: 'draft' as const,
      itemKind: 'experience' as const,
      badge: 'Experience',
      ctaLabel: 'Request',
      title,
      subtitle: requireText(args.subtitle, 'Subtitle'),
      description: requireText(args.description, 'Description'),
      category: requireText(args.category, 'Category'),
      durationLabel: requireText(args.durationLabel, 'Duration'),
      groupSizeLabel: `Up to ${Math.max(1, Math.round(args.groupCapacity))} guests`,
      price: `$${Math.max(0, args.priceUsd)}`,
      priceSuffix: 'per person',
      countryCode: optionalText(args.countryCode),
      countryLabel: optionalText(args.countryLabel),
      planningLocationId: optionalText(args.planningLocationId),
      coordinate: args.coordinate,
      geography: { region: requireText(args.region, 'Region'), town: optionalText(args.town) },
      locationLabel: requireText(args.locationLabel, 'Location label'),
      imageUri: requireText(args.imageUri, 'Main image'),
      galleryImages: args.galleryImages.length ? args.galleryImages : [args.imageUri],
      booking: {
        availabilityLabel: requireText(args.availabilityLabel, 'Availability'),
        confirmMode: requireText(args.confirmMode, 'Confirmation'),
        addToTripLabel: 'Add to trip',
        continueWithoutTripLabel: 'Continue',
      },
      includes: args.includes,
      acceptedPaymentModes: normalizePaymentModes(args.acceptedPaymentModes),
      directPaymentNotes: optionalText(args.directPaymentNotes),
      cancellationPolicy: optionalText(args.cancellationPolicy),
      contactNote: optionalText(args.contactNote),
      reviewedByAdminSlug: undefined,
      reviewedAt: undefined,
      rejectionNote: undefined,
      publishedAt: undefined,
      archivedAt: undefined,
    };

    if (args.experienceId) {
      const existing = await ctx.db.get(args.experienceId);
      if (!existing || existing.businessProfileId !== provider.business._id) {
        throw new ConvexError('Experience not found.');
      }
      await ctx.db.patch(args.experienceId, payload);
      return { experienceId: args.experienceId, slug };
    }

    const experienceId = await ctx.db.insert('experiences', payload);
    return { experienceId, slug };
  },
});

export const submitMyExperienceForReview = mutation({
  args: { experienceId: v.id('experiences') },
  handler: async (ctx, args) => {
    const provider = await requireProviderBusiness(ctx);
    const experience = await ctx.db.get(args.experienceId);
    if (!experience || experience.businessProfileId !== provider.business._id) {
      throw new ConvexError('Experience not found.');
    }

    await ctx.db.patch(args.experienceId, {
      reviewStatus: 'submitted',
      status: 'draft',
      submittedAt: Date.now(),
      rejectionNote: undefined,
    });

    return true;
  },
});

export const upsertMyStayDraft = mutation({
  args: {
    stayId: v.optional(v.id('stays')),
    name: v.string(),
    locationLabel: v.string(),
    town: v.string(),
    region: v.string(),
    countryCode: v.optional(v.string()),
    countryLabel: v.optional(v.string()),
    planningLocationId: v.optional(v.string()),
    summary: v.string(),
    coordinate: coordinateValidator,
    imageUri: v.string(),
    galleryImages: galleryValidator,
    priceUsd: v.number(),
    currencyCode: v.string(),
    bookingNote: v.string(),
    stayStyle: stayStyleValidator,
    routeVibe: routeVibeValidator,
    sleepSignal: v.string(),
    idealFor: v.array(v.string()),
    amenities: v.array(v.string()),
    nearbyHighlights: v.array(v.string()),
    bookingProfile: stayBookingProfileValidator,
    acceptedPaymentModes: v.optional(v.array(paymentModeValidator)),
    directPaymentNotes: v.optional(v.string()),
    cancellationPolicy: v.optional(v.string()),
    contactNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const provider = await requireProviderBusiness(ctx);
    assertProviderCanManageKind(provider.business, 'stays');

    const name = requireText(args.name, 'Property name');
    const slug = await createUniqueStaySlug(ctx, name, args.stayId);
    const payload = {
      slug,
      managerSlug: provider.slug,
      businessProfileId: provider.business._id,
      submittedBySlug: provider.slug,
      reviewStatus: 'draft' as const,
      status: 'draft' as const,
      name,
      locationLabel: requireText(args.locationLabel, 'Location label'),
      town: requireText(args.town, 'Town'),
      region: requireText(args.region, 'Region'),
      countryCode: optionalText(args.countryCode),
      countryLabel: optionalText(args.countryLabel),
      planningLocationId: optionalText(args.planningLocationId),
      coordinate: args.coordinate,
      imageUri: requireText(args.imageUri, 'Main image'),
      galleryImages: args.galleryImages.length ? args.galleryImages : [args.imageUri],
      pricePerNight: Math.max(0, args.priceUsd),
      currencyCode: requireText(args.currencyCode, 'Currency'),
      rating: 0,
      reviewCount: 0,
      stayStyle: args.stayStyle,
      routeVibe: args.routeVibe,
      sleepSignal: requireText(args.sleepSignal, 'Sleep signal'),
      summary: requireText(args.summary, 'Summary'),
      idealFor: args.idealFor,
      amenities: args.amenities,
      nearbyHighlights: args.nearbyHighlights,
      bookingProfile: args.bookingProfile,
      bookingNote: requireText(args.bookingNote, 'Booking note'),
      acceptedPaymentModes: normalizePaymentModes(args.acceptedPaymentModes),
      directPaymentNotes: optionalText(args.directPaymentNotes),
      cancellationPolicy: optionalText(args.cancellationPolicy),
      contactNote: optionalText(args.contactNote),
      reviewedByAdminSlug: undefined,
      reviewedAt: undefined,
      rejectionNote: undefined,
      publishedAt: undefined,
      archivedAt: undefined,
    };

    if (args.stayId) {
      const existing = await ctx.db.get(args.stayId);
      if (!existing || existing.businessProfileId !== provider.business._id) {
        throw new ConvexError('Stay not found.');
      }
      await ctx.db.patch(args.stayId, payload);
      return { stayId: args.stayId, slug };
    }

    const stayId = await ctx.db.insert('stays', payload);
    return { stayId, slug };
  },
});

export const submitMyStayForReview = mutation({
  args: { stayId: v.id('stays') },
  handler: async (ctx, args) => {
    const provider = await requireProviderBusiness(ctx);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.businessProfileId !== provider.business._id) {
      throw new ConvexError('Stay not found.');
    }

    await ctx.db.patch(args.stayId, {
      reviewStatus: 'submitted',
      status: 'draft',
      submittedAt: Date.now(),
      rejectionNote: undefined,
    });

    return true;
  },
});

export const listMyRequests = query({
  args: {
    status: v.optional(requestStatusFilterValidator),
  },
  handler: async (ctx, args) => {
    const { business } = await requireProviderBusiness(ctx);
    const status = args.status === 'all' ? undefined : args.status;
    const [experiences, stays, bookingDocs, reservationDocs] = await Promise.all([
      ctx.db.query('experiences').withIndex('by_businessProfileId', (q) => q.eq('businessProfileId', business._id)).take(250),
      ctx.db.query('stays').withIndex('by_businessProfileId', (q) => q.eq('businessProfileId', business._id)).take(250),
      ctx.db.query('bookings').order('desc').take(250),
      ctx.db.query('reservations').order('desc').take(250),
    ]);
    const experienceBySlug = new Map(experiences.map((experience) => [experience.slug, experience]));
    const stayBySlug = new Map(stays.map((stay) => [stay.slug, stay]));

    const experienceRows = bookingDocs
      .filter(isActionableExperienceBooking)
      .filter((booking) => experienceBySlug.has(booking.experienceSlug))
      .filter((booking) => !status || (booking.status ?? 'confirmed') === status)
      .map((booking) => {
        const experience = experienceBySlug.get(booking.experienceSlug);
        return {
          _id: booking._id,
          source: 'experienceBooking' as const,
          slug: booking.experienceSlug,
          title: experience?.title ?? booking.experienceSlug,
          status: booking.status ?? ('confirmed' as const),
          travelerSlug: booking.travelerSlug,
          bookedAt: booking.bookedAt,
          detailLabel: booking.partySize ? `${booking.partySize} guests` : 'Experience request',
          totalPrice: booking.providerReceivableAmount ?? booking.priceSnapshot ?? null,
          paymentMode: booking.paymentMode ?? 'cash',
          paymentStatus: booking.paymentStatus ?? 'unpaid',
        };
      });

    const stayRows = reservationDocs
      .filter((reservation) => stayBySlug.has(reservation.staySlug))
      .filter((reservation) => !status || reservation.status === status)
      .map((reservation) => {
        const stay = stayBySlug.get(reservation.staySlug);
        return {
          _id: reservation._id,
          source: 'stayBooking' as const,
          slug: reservation.staySlug,
          title: stay?.name ?? reservation.staySlug,
          status: reservation.status,
          travelerSlug: reservation.travelerSlug,
          bookedAt: reservation.bookedAt,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          detailLabel: reservation.stayBookingDetails?.roomSummary ?? 'Stay request',
          totalPrice: reservation.totalPrice,
          paymentMode: reservation.paymentMode ?? 'cash',
          paymentStatus: reservation.paymentStatus ?? 'unpaid',
        };
      });

    return [...experienceRows, ...stayRows].sort((a, b) => b.bookedAt - a.bookedAt);
  },
});

export const updateMyRequestStatus = mutation({
  args: {
    requestId: v.union(v.id('bookings'), v.id('reservations')),
    source: requestSourceValidator,
    status: v.union(v.literal('confirmed'), v.literal('cancelled')),
  },
  handler: async (ctx, args) => {
    const { business } = await requireProviderBusiness(ctx);

    if (args.source === 'experienceBooking') {
      const bookingId = args.requestId as Id<'bookings'>;
      const booking = await ctx.db.get(bookingId);
      if (!booking || !isActionableExperienceBooking(booking)) {
        throw new ConvexError('Request not found.');
      }
      const experience = await ctx.db.query('experiences').withIndex('by_slug', (q) => q.eq('slug', booking.experienceSlug)).unique();
      if (!experience || experience.businessProfileId !== business._id) {
        throw new ConvexError('Request not found.');
      }
      await ctx.db.patch(bookingId, { status: args.status });
      return true;
    }

    const reservationId = args.requestId as Id<'reservations'>;
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw new ConvexError('Request not found.');
    }
    const stay = await ctx.db.query('stays').withIndex('by_slug', (q) => q.eq('slug', reservation.staySlug)).unique();
    if (!stay || stay.businessProfileId !== business._id) {
      throw new ConvexError('Request not found.');
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
    const mirrorBookings = await ctx.db.query('bookings').withIndex('by_reservationId', (q) => q.eq('reservationId', reservation._id)).take(20);
    for (const mirrorBooking of mirrorBookings) {
      await ctx.db.patch(mirrorBooking._id, { status: args.status });
    }

    return true;
  },
});

export const archiveMyListing = mutation({
  args: {
    kind: v.union(v.literal('experience'), v.literal('stay')),
    id: v.union(v.id('experiences'), v.id('stays')),
  },
  handler: async (ctx, args) => {
    const { business } = await requireProviderBusiness(ctx);
    const patch = { status: 'archived' as const };

    if (args.kind === 'experience') {
      const id = args.id as Id<'experiences'>;
      const experience = await ctx.db.get(id);
      if (!experience || experience.businessProfileId !== business._id) {
        throw new ConvexError('Experience not found.');
      }
      await ctx.db.patch(id, patch);
      return true;
    }

    const id = args.id as Id<'stays'>;
    const stay = await ctx.db.get(id);
    if (!stay || stay.businessProfileId !== business._id) {
      throw new ConvexError('Stay not found.');
    }
    await ctx.db.patch(id, patch);
    return true;
  },
});
