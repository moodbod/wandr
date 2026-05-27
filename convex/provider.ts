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
const galleryStorageIdsValidator = v.array(v.id('_storage'));
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
const MAX_PROVIDER_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROVIDER_GALLERY_IMAGES = 6;

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

function normalizeGalleryStorageIds(storageIds?: Id<'_storage'>[]) {
  const unique = Array.from(new Set(storageIds ?? []));
  if (unique.length > MAX_PROVIDER_GALLERY_IMAGES) {
    throw new ConvexError(`Gallery can include up to ${MAX_PROVIDER_GALLERY_IMAGES} images.`);
  }
  return unique;
}

async function resolveStorageImageUrl(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<'_storage'> | undefined,
  label: string,
  shouldValidate = false
) {
  if (!storageId) {
    return null;
  }

  if (shouldValidate) {
    const metadata = await ctx.db.system.get('_storage', storageId);
    if (!metadata) {
      throw new ConvexError(`${label} upload is unavailable.`);
    }
    if (metadata.contentType && !metadata.contentType.startsWith('image/')) {
      throw new ConvexError(`${label} must be an image file.`);
    }
    if (metadata.size > MAX_PROVIDER_IMAGE_BYTES) {
      throw new ConvexError(`${label} must be 8 MB or smaller.`);
    }
  }

  const imageUrl = await ctx.storage.getUrl(storageId);
  if (!imageUrl && shouldValidate) {
    throw new ConvexError(`${label} upload is unavailable.`);
  }
  return imageUrl;
}

async function resolveGalleryStorageUrls(
  ctx: QueryCtx | MutationCtx,
  storageIds: Id<'_storage'>[] | undefined,
  shouldValidate = false
) {
  const normalizedIds = normalizeGalleryStorageIds(storageIds);
  const urls = await Promise.all(
    normalizedIds.map((storageId, index) =>
      resolveStorageImageUrl(ctx, storageId, `Gallery image ${index + 1}`, shouldValidate)
    )
  );
  return urls.filter((url): url is string => Boolean(url));
}

function normalizeGalleryImages(imageUri: string, galleryImages?: readonly string[], galleryUrls?: readonly string[]) {
  const seen = new Set<string>();
  return [imageUri, ...(galleryUrls ?? []), ...(galleryImages ?? [])]
    .map((uri) => uri.trim())
    .filter((uri) => {
      if (!uri || seen.has(uri)) {
        return false;
      }
      seen.add(uri);
      return true;
    })
    .slice(0, MAX_PROVIDER_GALLERY_IMAGES + 1);
}

async function resolveProviderImagesForWrite(
  ctx: MutationCtx,
  args: {
    galleryImages?: string[];
    galleryStorageIds?: Id<'_storage'>[];
    imageStorageId?: Id<'_storage'>;
    imageUri?: string;
  }
) {
  const imageUri = (await resolveStorageImageUrl(ctx, args.imageStorageId, 'Cover image', true)) ?? optionalText(args.imageUri) ?? '';
  const galleryUrls = await resolveGalleryStorageUrls(ctx, args.galleryStorageIds, true);
  const galleryImages = normalizeGalleryImages(imageUri, args.galleryImages, galleryUrls);

  return {
    imageStorageId: args.imageStorageId,
    imageUri,
    galleryStorageIds: normalizeGalleryStorageIds(args.galleryStorageIds),
    galleryImages,
  };
}

async function resolveExperienceForRead(ctx: QueryCtx | MutationCtx, experience: Doc<'experiences'>) {
  const storedCover = await resolveStorageImageUrl(ctx, experience.imageStorageId, 'Cover image');
  const imageUri = storedCover ?? experience.imageUri;
  const galleryUrls = await resolveGalleryStorageUrls(ctx, experience.galleryStorageIds);
  return {
    imageUri,
    galleryImages: normalizeGalleryImages(imageUri, experience.galleryImages, galleryUrls),
  };
}

async function resolveStayForRead(ctx: QueryCtx | MutationCtx, stay: Doc<'stays'>) {
  const storedCover = await resolveStorageImageUrl(ctx, stay.imageStorageId, 'Cover image');
  const imageUri = storedCover ?? stay.imageUri;
  const galleryUrls = await resolveGalleryStorageUrls(ctx, stay.galleryStorageIds);
  return {
    imageUri,
    galleryImages: normalizeGalleryImages(imageUri, stay.galleryImages, galleryUrls),
  };
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

  if (role !== 'serviceProvider') {
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

  if (business.status === 'invited') {
    throw new ConvexError('Provider setup required.');
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
    updatedAt: profile.updatedAt,
  };
}

function extractProviderCapacity(label?: string) {
  const value = Number(String(label ?? '').replace(/[^0-9]/g, ''));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function extractProviderPrice(value?: string) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function toExperienceListingRow(ctx: QueryCtx | MutationCtx, experience: Doc<'experiences'>) {
  const images = await resolveExperienceForRead(ctx, experience);
  return {
    _id: experience._id,
    kind: 'experience' as const,
    title: experience.title,
    slug: experience.slug,
    status: experience.status ?? ('draft' as const),
    reviewStatus: experience.reviewStatus ?? ('draft' as const),
    price: experience.price,
    priceUsd: extractProviderPrice(experience.price),
    locationLabel: experience.locationLabel ?? experience.subtitle,
    subtitle: experience.subtitle,
    description: experience.description,
    category: experience.category ?? 'Guided tour',
    durationLabel: experience.durationLabel ?? '',
    groupCapacity: extractProviderCapacity(experience.groupSizeLabel),
    town: experience.geography?.town ?? '',
    region: experience.geography?.region ?? '',
    countryCode: experience.countryCode ?? '',
    countryLabel: experience.countryLabel ?? '',
    planningLocationId: experience.planningLocationId ?? '',
    coordinate: experience.coordinate ?? [],
    imageStorageId: experience.imageStorageId ?? null,
    imageUri: images.imageUri,
    galleryStorageIds: experience.galleryStorageIds ?? [],
    galleryImages: images.galleryImages,
    availabilityLabel: experience.booking?.availabilityLabel ?? '',
    confirmMode: experience.booking?.confirmMode ?? '',
    includes: experience.includes,
    acceptedPaymentModes: experience.acceptedPaymentModes ?? ['cash'],
    directPaymentNotes: experience.directPaymentNotes ?? null,
    cancellationPolicy: experience.cancellationPolicy ?? null,
    contactNote: experience.contactNote ?? null,
    submittedAt: experience.submittedAt ?? null,
    rejectionNote: experience.rejectionNote ?? null,
  };
}

async function toStayListingRow(ctx: QueryCtx | MutationCtx, stay: Doc<'stays'>) {
  const images = await resolveStayForRead(ctx, stay);
  return {
    _id: stay._id,
    kind: 'stay' as const,
    title: stay.name,
    slug: stay.slug,
    status: stay.status ?? ('draft' as const),
    reviewStatus: stay.reviewStatus ?? ('draft' as const),
    price: `${stay.currencyCode} ${stay.pricePerNight}`,
    priceUsd: stay.pricePerNight,
    locationLabel: stay.locationLabel,
    name: stay.name,
    summary: stay.summary,
    town: stay.town,
    region: stay.region,
    countryCode: stay.countryCode ?? '',
    countryLabel: stay.countryLabel ?? '',
    planningLocationId: stay.planningLocationId ?? '',
    coordinate: stay.coordinate,
    imageStorageId: stay.imageStorageId ?? null,
    imageUri: images.imageUri,
    galleryStorageIds: stay.galleryStorageIds ?? [],
    galleryImages: images.galleryImages,
    currencyCode: stay.currencyCode,
    bookingNote: stay.bookingNote,
    stayStyle: stay.stayStyle,
    routeVibe: stay.routeVibe,
    sleepSignal: stay.sleepSignal,
    idealFor: stay.idealFor,
    amenities: stay.amenities,
    nearbyHighlights: stay.nearbyHighlights,
    bookingProfile: stay.bookingProfile ?? null,
    acceptedPaymentModes: stay.acceptedPaymentModes ?? ['cash'],
    directPaymentNotes: stay.directPaymentNotes ?? null,
    cancellationPolicy: stay.cancellationPolicy ?? null,
    contactNote: stay.contactNote ?? null,
    submittedAt: stay.submittedAt ?? null,
    rejectionNote: stay.rejectionNote ?? null,
  };
}

async function assertExperienceReadyForReview(ctx: MutationCtx, experience: Doc<'experiences'>) {
  const images = await resolveExperienceForRead(ctx, experience);
  if (!optionalText(experience.title)) {
    throw new ConvexError('Title is required before submitting.');
  }
  if (!optionalText(experience.locationLabel)) {
    throw new ConvexError('Location is required before submitting.');
  }
  if (!experience.coordinate || experience.coordinate.length < 2) {
    throw new ConvexError('Coordinates are required before submitting.');
  }
  if (!optionalText(experience.price) || !optionalText(experience.groupSizeLabel)) {
    throw new ConvexError('Price and group size are required before submitting.');
  }
  if (!optionalText(images.imageUri)) {
    throw new ConvexError('Upload a cover image before submitting.');
  }
}

async function assertStayReadyForReview(ctx: MutationCtx, stay: Doc<'stays'>) {
  const images = await resolveStayForRead(ctx, stay);
  if (!optionalText(stay.name)) {
    throw new ConvexError('Property name is required before submitting.');
  }
  if (!optionalText(stay.locationLabel) || !optionalText(stay.town) || !optionalText(stay.region)) {
    throw new ConvexError('Location is required before submitting.');
  }
  if (!stay.coordinate || stay.coordinate.length < 2) {
    throw new ConvexError('Coordinates are required before submitting.');
  }
  if (!Number.isFinite(stay.pricePerNight)) {
    throw new ConvexError('Nightly price is required before submitting.');
  }
  if (!optionalText(images.imageUri)) {
    throw new ConvexError('Upload a cover image before submitting.');
  }
}

export const getMyBusinessProfile = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentAuthUser(ctx);
    const role = getAuthUserRole(user as AuthUserProfile);
    if (role !== 'serviceProvider' || !user.slug) {
      return null;
    }

    const business = await ctx.db
      .query('businessProfiles')
      .withIndex('by_ownerSlug', (q) => q.eq('ownerSlug', user.slug!))
      .unique();

    return business ? toBusinessProfileRow(business) : null;
  },
});

export const completeMyBusinessSetup = mutation({
  args: {
    acceptedPaymentModes: v.optional(v.array(paymentModeValidator)),
    businessName: v.string(),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    directPaymentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentAuthUser(ctx);
    const role = getAuthUserRole(user as AuthUserProfile);
    if (role !== 'serviceProvider') {
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

    if (business.status === 'suspended') {
      throw new ConvexError('Provider account is suspended.');
    }

    await ctx.db.patch(business._id, {
      acceptedPaymentModes: normalizePaymentModes(args.acceptedPaymentModes),
      businessName: requireText(args.businessName, 'Business name'),
      contactEmail: optionalText(args.contactEmail) ?? user.email,
      contactName: optionalText(args.contactName) ?? user.name,
      contactPhone: optionalText(args.contactPhone),
      directPaymentNotes: optionalText(args.directPaymentNotes),
      status: 'active',
      suspendedAt: undefined,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(business._id);
    if (!updated) {
      throw new ConvexError('Provider profile not found.');
    }

    return toBusinessProfileRow(updated);
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
      experiences: await Promise.all(experiences.map((experience) => toExperienceListingRow(ctx, experience))),
      stays: await Promise.all(stays.map((stay) => toStayListingRow(ctx, stay))),
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
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    durationLabel: v.optional(v.string()),
    groupCapacity: v.number(),
    priceUsd: v.number(),
    locationLabel: v.string(),
    town: v.optional(v.string()),
    region: v.string(),
    countryCode: v.optional(v.string()),
    countryLabel: v.optional(v.string()),
    planningLocationId: v.optional(v.string()),
    coordinate: coordinateValidator,
    imageStorageId: v.optional(v.id('_storage')),
    imageUri: v.optional(v.string()),
    galleryImages: v.optional(galleryValidator),
    galleryStorageIds: v.optional(galleryStorageIdsValidator),
    availabilityLabel: v.optional(v.string()),
    confirmMode: v.optional(v.string()),
    includes: v.optional(v.array(v.string())),
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
    const images = await resolveProviderImagesForWrite(ctx, args);
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
      subtitle: optionalText(args.subtitle) ?? 'Provider experience',
      description: optionalText(args.description) ?? '',
      category: optionalText(args.category) ?? 'Experience',
      durationLabel: optionalText(args.durationLabel) ?? 'Flexible',
      groupSizeLabel: `Up to ${Math.max(1, Math.round(args.groupCapacity))} guests`,
      price: `$${Math.max(0, args.priceUsd)}`,
      priceSuffix: 'per person',
      countryCode: optionalText(args.countryCode),
      countryLabel: optionalText(args.countryLabel),
      planningLocationId: optionalText(args.planningLocationId),
      coordinate: args.coordinate,
      geography: { region: requireText(args.region, 'Region'), town: optionalText(args.town) },
      locationLabel: requireText(args.locationLabel, 'Location label'),
      imageStorageId: images.imageStorageId,
      imageUri: images.imageUri,
      galleryStorageIds: images.galleryStorageIds,
      galleryImages: images.galleryImages,
      booking: {
        availabilityLabel: optionalText(args.availabilityLabel) ?? 'Request availability',
        confirmMode: optionalText(args.confirmMode) ?? 'Provider confirms within 24 hours',
        addToTripLabel: 'Add to trip',
        continueWithoutTripLabel: 'Continue',
      },
      includes: args.includes ?? [],
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

    await assertExperienceReadyForReview(ctx, experience);
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
    summary: v.optional(v.string()),
    coordinate: coordinateValidator,
    imageStorageId: v.optional(v.id('_storage')),
    imageUri: v.optional(v.string()),
    galleryImages: v.optional(galleryValidator),
    galleryStorageIds: v.optional(galleryStorageIdsValidator),
    priceUsd: v.number(),
    currencyCode: v.string(),
    bookingNote: v.optional(v.string()),
    stayStyle: stayStyleValidator,
    routeVibe: routeVibeValidator,
    sleepSignal: v.optional(v.string()),
    idealFor: v.optional(v.array(v.string())),
    amenities: v.optional(v.array(v.string())),
    nearbyHighlights: v.optional(v.array(v.string())),
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
    const images = await resolveProviderImagesForWrite(ctx, args);
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
      imageStorageId: images.imageStorageId,
      imageUri: images.imageUri,
      galleryStorageIds: images.galleryStorageIds,
      galleryImages: images.galleryImages,
      pricePerNight: Math.max(0, args.priceUsd),
      currencyCode: requireText(args.currencyCode, 'Currency'),
      rating: 0,
      reviewCount: 0,
      stayStyle: args.stayStyle,
      routeVibe: args.routeVibe,
      sleepSignal: optionalText(args.sleepSignal) ?? 'Curated stay',
      summary: optionalText(args.summary) ?? '',
      idealFor: args.idealFor ?? [],
      amenities: args.amenities ?? [],
      nearbyHighlights: args.nearbyHighlights ?? [],
      bookingProfile: args.bookingProfile,
      bookingNote: optionalText(args.bookingNote) ?? 'Request to reserve this stay.',
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

    await assertStayReadyForReview(ctx, stay);
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
