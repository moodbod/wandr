import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { recordAdminAuditEvent } from './adminAudit';
import { requireAdmin } from './authHelpers';

const contentStatusValidator = v.union(v.literal('draft'), v.literal('live'), v.literal('archived'));
const contentKindValidator = v.union(v.literal('location'), v.literal('experience'), v.literal('stay'));
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

type ContentStatus = 'draft' | 'live' | 'archived';
type Coordinate = readonly [number, number];
const MAX_MANAGED_IMAGE_BYTES = 8 * 1024 * 1024;

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

function normalizeCoordinate(coordinate: readonly number[]): Coordinate | null {
  if (coordinate.length < 2 || !Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1])) {
    return null;
  }

  return [coordinate[0], coordinate[1]];
}

function publicStatus(status?: ContentStatus) {
  return status === undefined || status === 'live';
}

function publicProviderReview(item: { businessProfileId?: Id<'businessProfiles'>; reviewStatus?: 'draft' | 'submitted' | 'approved' | 'rejected' }) {
  return !item.businessProfileId || item.reviewStatus === 'approved';
}

function getSupportedCountryMetadata(
  coordinate: Coordinate | null
): { countryCode?: string; countryLabel?: string; planningLocationId?: string } {
  if (!coordinate) {
    return {};
  }

  const [lng, lat] = coordinate;

  if (lng >= 11.7 && lng <= 25.3 && lat >= -29.2 && lat <= -16.8) {
    return { countryCode: 'NA', countryLabel: 'Namibia', planningLocationId: 'namibia' };
  }

  if (lng >= 17.6 && lng <= 20.2 && lat >= -34.9 && lat <= -32.6) {
    return { countryCode: 'ZA', countryLabel: 'South Africa', planningLocationId: 'south-africa' };
  }

  return {};
}

async function createUniqueSlug(
  ctx: QueryCtx | MutationCtx,
  tableName: 'locations' | 'experiences' | 'stays',
  title: string,
  currentId?: Id<'locations'> | Id<'experiences'> | Id<'stays'>
) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await ctx.db
      .query(tableName)
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();

    if (!existing || existing._id === currentId) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function resolveStorageImageUrl(ctx: QueryCtx | MutationCtx, storageId?: Id<'_storage'>) {
  if (!storageId) {
    return null;
  }

  return await ctx.storage.getUrl(storageId);
}

async function resolveStorageGalleryUrls(ctx: QueryCtx | MutationCtx, storageIds?: Id<'_storage'>[]) {
  if (!storageIds?.length) {
    return [];
  }

  const urls = await Promise.all(storageIds.map((storageId) => ctx.storage.getUrl(storageId)));
  return urls.filter((url): url is string => Boolean(url));
}

async function requireManagedImageUrl(ctx: MutationCtx, storageId: Id<'_storage'>) {
  const metadata = await ctx.db.system.get('_storage', storageId);
  if (!metadata) {
    throw new ConvexError('Upload a place image before saving.');
  }

  if (metadata.contentType && !metadata.contentType.startsWith('image/')) {
    throw new ConvexError('Place image upload must be an image file.');
  }

  if (metadata.size > MAX_MANAGED_IMAGE_BYTES) {
    throw new ConvexError('Place image must be 8 MB or smaller after compression.');
  }

  const imageUrl = await ctx.storage.getUrl(storageId);
  if (!imageUrl) {
    throw new ConvexError('Uploaded place image is unavailable.');
  }

  return imageUrl;
}

function normalizeGalleryImages(galleryImages: readonly string[], imageUri: string, storageGalleryImages: readonly string[] = []) {
  const seen = new Set<string>();
  return [imageUri, ...storageGalleryImages, ...galleryImages]
    .map((uri) => uri.trim())
    .filter((uri) => {
      if (!uri || seen.has(uri)) {
        return false;
      }

      seen.add(uri);
      return true;
    });
}

async function toPublicLocation(
  ctx: QueryCtx | MutationCtx,
  location: Doc<'locations'>,
  options?: { includeStorageIds?: boolean }
) {
  const coordinate = normalizeCoordinate(location.coordinate);
  const inferred = getSupportedCountryMetadata(coordinate);
  const storedImageUrl = await resolveStorageImageUrl(ctx, location.imageStorageId);
  const imageUri = storedImageUrl ?? location.imageUri;
  const galleryImages = normalizeGalleryImages(location.galleryImages, imageUri);

  return {
    _id: location._id,
    slug: location.slug,
    title: location.title,
    description: location.description,
    summary: location.summary ?? location.description,
    category: location.category,
    badge: location.badge ?? 'Location',
    locationLabel: location.locationLabel,
    town: location.town ?? null,
    region: location.region,
    countryCode: location.countryCode ?? inferred.countryCode,
    countryLabel: location.countryLabel ?? inferred.countryLabel,
    planningLocationId: location.planningLocationId ?? inferred.planningLocationId,
    coordinate,
    imageUri,
    galleryImages,
    ...(options?.includeStorageIds ? { imageStorageId: location.imageStorageId ?? null } : {}),
    visitTips: location.visitTips,
    sections: location.sections ?? [],
    sectionsTitle: location.sectionsTitle ?? 'More to know',
    status: location.status,
    updatedAt: location.updatedAt,
  };
}

function legacyGemToPublicLocation(gem: Doc<'gems'>) {
  const coordinate = normalizeCoordinate(gem.coordinate ?? []);
  const inferred = getSupportedCountryMetadata(coordinate);
  const slug = slugify(gem.title);

  return {
    _id: gem._id,
    slug,
    title: gem.title,
    description: gem.description,
    summary: gem.summary ?? gem.description,
    category: 'Point of interest',
    badge: gem.badge ?? 'Location',
    locationLabel: gem.locationLabel ?? gem.geography?.town ?? gem.geography?.region ?? inferred.countryLabel ?? 'Location',
    town: gem.geography?.town ?? null,
    region: gem.geography?.region ?? inferred.countryLabel ?? 'Curated',
    countryCode: gem.countryCode ?? inferred.countryCode,
    countryLabel: gem.countryLabel ?? inferred.countryLabel,
    planningLocationId: gem.planningLocationId ?? inferred.planningLocationId,
    coordinate,
    imageUri: gem.imageUri,
    galleryImages: [gem.imageUri],
    visitTips: gem.visitTips ?? [],
    sections: gem.sections ?? [],
    sectionsTitle: gem.sectionsTitle ?? 'More to know',
    status: 'live' as const,
    updatedAt: gem._creationTime,
  };
}

function hiddenGemExperienceToPublicLocation(experience: Doc<'experiences'>) {
  const coordinate = normalizeCoordinate(experience.coordinate ?? []);
  const inferred = getSupportedCountryMetadata(coordinate);

  return {
    _id: experience._id,
    slug: experience.slug,
    title: experience.title,
    description: experience.description,
    summary: experience.summary ?? experience.description,
    category: experience.category ?? 'Point of interest',
    badge: experience.badge ?? 'Location',
    locationLabel:
      experience.locationLabel ??
      experience.geography?.town ??
      experience.geography?.region ??
      inferred.countryLabel ??
      'Location',
    town: experience.geography?.town ?? null,
    region: experience.geography?.region ?? inferred.countryLabel ?? 'Curated',
    countryCode: experience.countryCode ?? inferred.countryCode,
    countryLabel: experience.countryLabel ?? inferred.countryLabel,
    planningLocationId: experience.planningLocationId ?? inferred.planningLocationId,
    coordinate,
    imageUri: experience.imageUri,
    galleryImages: experience.galleryImages ?? [experience.imageUri],
    visitTips: experience.visitTips ?? experience.includes,
    sections: experience.sections ?? [],
    sectionsTitle: 'More to know',
    status: 'live' as const,
    updatedAt: experience._creationTime,
  };
}

async function toPublicExperience(ctx: QueryCtx | MutationCtx, experience: Doc<'experiences'>) {
  const coordinate = normalizeCoordinate(experience.coordinate ?? []);
  const inferred = getSupportedCountryMetadata(coordinate);
  const storedImageUrl = await resolveStorageImageUrl(ctx, experience.imageStorageId);
  const imageUri = storedImageUrl ?? experience.imageUri;
  const storedGalleryUrls = await resolveStorageGalleryUrls(ctx, experience.galleryStorageIds);
  const galleryImages = normalizeGalleryImages(experience.galleryImages ?? [], imageUri, storedGalleryUrls);
  const { imageStorageId: _imageStorageId, galleryStorageIds: _galleryStorageIds, ...publicExperience } = experience;

  return {
    ...publicExperience,
    itemKind: 'experience' as const,
    imageUri,
    galleryImages,
    countryCode: experience.countryCode ?? inferred.countryCode,
    countryLabel: experience.countryLabel ?? inferred.countryLabel,
    planningLocationId: experience.planningLocationId ?? inferred.planningLocationId,
    coordinate,
    locationLabel:
      experience.locationLabel ??
      experience.geography?.town ??
      experience.geography?.region ??
      inferred.countryLabel,
    status: experience.status ?? ('live' as const),
  };
}

async function toPublicStay(ctx: QueryCtx | MutationCtx, stay: Doc<'stays'>) {
  const coordinate = normalizeCoordinate(stay.coordinate);
  const inferred = getSupportedCountryMetadata(coordinate);
  const storedImageUrl = await resolveStorageImageUrl(ctx, stay.imageStorageId);
  const imageUri = storedImageUrl ?? stay.imageUri;
  const storedGalleryUrls = await resolveStorageGalleryUrls(ctx, stay.galleryStorageIds);
  const galleryImages = normalizeGalleryImages(stay.galleryImages, imageUri, storedGalleryUrls);
  const { imageStorageId: _imageStorageId, galleryStorageIds: _galleryStorageIds, ...publicStay } = stay;

  return {
    ...publicStay,
    id: stay.slug,
    imageUri,
    galleryImages,
    priceLabel: `$${stay.pricePerNight}`,
    countryCode: stay.countryCode ?? inferred.countryCode,
    countryLabel: stay.countryLabel ?? inferred.countryLabel,
    planningLocationId: stay.planningLocationId ?? inferred.planningLocationId,
    coordinate,
    status: stay.status ?? ('live' as const),
  };
}

export async function getLiveCatalogPayload(ctx: QueryCtx) {
  const [locationDocs, experienceDocs, gemDocs, stayDocs] = await Promise.all([
    ctx.db.query('locations').withIndex('by_status', (q) => q.eq('status', 'live')).take(250),
    ctx.db.query('experiences').order('desc').take(300),
    ctx.db.query('gems').order('desc').take(200),
    ctx.db.query('stays').order('desc').take(250),
  ]);

  const liveLocations = await Promise.all(locationDocs.map((location) => toPublicLocation(ctx, location)));
  const knownLocationSlugs = new Set(liveLocations.map((location) => location.slug));
  const legacyLocations = [
    ...gemDocs.map(legacyGemToPublicLocation),
    ...experienceDocs
      .filter((experience) => experience.itemKind === 'hiddenGem' && publicStatus(experience.status))
      .filter(publicProviderReview)
      .map(hiddenGemExperienceToPublicLocation),
  ].filter((location) => {
    if (knownLocationSlugs.has(location.slug)) {
      return false;
    }
    knownLocationSlugs.add(location.slug);
    return true;
  });

  const experiences = await Promise.all(
    experienceDocs
      .filter((experience) => experience.itemKind !== 'hiddenGem' && publicStatus(experience.status))
      .filter(publicProviderReview)
      .map((experience) => toPublicExperience(ctx, experience))
  );
  const stays = await Promise.all(
    stayDocs.filter((stay) => publicStatus(stay.status)).filter(publicProviderReview).map((stay) => toPublicStay(ctx, stay))
  );
  const locations = [...liveLocations, ...legacyLocations];
  const markers = [
    ...locations
      .filter((location) => location.coordinate)
      .map((location, index) => ({
        id: `location-${location.slug}`,
        coordinate: location.coordinate!,
        experienceSlug: location.slug,
        itemKind: 'location' as const,
        imageUri: location.imageUri,
        label: location.title,
        tone: index % 2 === 0 ? ('accent' as const) : ('dark' as const),
      })),
    ...experiences
      .filter((experience) => experience.coordinate)
      .map((experience, index) => ({
        id: `experience-${experience.slug}`,
        coordinate: experience.coordinate!,
        experienceSlug: experience.slug,
        itemKind: 'experience' as const,
        imageUri: experience.imageUri,
        label: experience.title,
        priceLabel: experience.price,
        tone: index % 2 === 0 ? ('accent' as const) : ('dark' as const),
      })),
    ...stays
      .filter((stay) => stay.coordinate)
      .map((stay, index) => ({
        id: `stay-${stay.slug}`,
        coordinate: stay.coordinate!,
        experienceSlug: stay.slug,
        itemKind: 'stay' as const,
        imageUri: stay.imageUri,
        label: stay.name,
        priceLabel: stay.priceLabel,
        tone: index % 2 === 0 ? ('accent' as const) : ('dark' as const),
      })),
  ];

  return {
    locations,
    experiences,
    stays,
    markers,
    updatedAt: Math.max(
      0,
      ...locationDocs.map((doc) => doc.updatedAt),
      ...experienceDocs.map((doc) => doc._creationTime),
      ...gemDocs.map((doc) => doc._creationTime),
      ...stayDocs.map((doc) => doc._creationTime)
    ),
  };
}

export const getLiveCatalog = query({
  args: {},
  handler: async (ctx) => {
    return await getLiveCatalogPayload(ctx);
  },
});

export const listManagedCatalog = query({
  args: {
    status: v.optional(contentStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = args.status;
    const [locations, experiences, stays, reservations, bookings] = await Promise.all([
      status
        ? ctx.db.query('locations').withIndex('by_status', (q) => q.eq('status', status)).take(250)
        : ctx.db.query('locations').order('desc').take(250),
      ctx.db.query('experiences').order('desc').take(250),
      ctx.db.query('stays').order('desc').take(250),
      ctx.db.query('reservations').order('desc').take(100),
      ctx.db.query('bookings').order('desc').take(100),
    ]);

    const matchesStatus = (value?: ContentStatus) => !status || (value ?? 'live') === status;

    return {
      locations: await Promise.all(
        locations
          .filter((location) => matchesStatus(location.status))
          .map((location) => toPublicLocation(ctx, location, { includeStorageIds: true }))
      ),
      experiences: await Promise.all(
        experiences
          .filter((experience) => experience.itemKind !== 'hiddenGem' && matchesStatus(experience.status))
          .map((experience) => toPublicExperience(ctx, experience))
      ),
      stays: await Promise.all(stays.filter((stay) => matchesStatus(stay.status)).map((stay) => toPublicStay(ctx, stay))),
      requests: {
        reservations,
        bookings,
      },
    };
  },
});

export const generateManagedImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const upsertManagedLocation = mutation({
  args: {
    locationId: v.optional(v.id('locations')),
    title: v.string(),
    description: v.string(),
    summary: v.optional(v.string()),
    category: v.string(),
    badge: v.optional(v.string()),
    locationLabel: v.string(),
    town: v.optional(v.string()),
    region: v.string(),
    countryCode: v.optional(v.string()),
    countryLabel: v.optional(v.string()),
    planningLocationId: v.optional(v.string()),
    coordinate: coordinateValidator,
    imageStorageId: v.id('_storage'),
    imageUri: v.optional(v.string()),
    galleryImages: galleryValidator,
    visitTips: v.array(v.string()),
    sections: v.optional(v.array(v.object({ title: v.string(), body: v.string() }))),
    sectionsTitle: v.optional(v.string()),
    status: v.optional(contentStatusValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    const slug = await createUniqueSlug(ctx, 'locations', args.title, args.locationId);
    const status = args.status ?? 'draft';
    const imageUri = await requireManagedImageUrl(ctx, args.imageStorageId);
    const galleryImages = normalizeGalleryImages(args.galleryImages, imageUri);

    if (args.locationId) {
      const existing = await ctx.db.get(args.locationId);
      if (!existing) {
        throw new ConvexError('Location not found');
      }

      await ctx.db.patch(args.locationId, {
        slug,
        title: args.title,
        description: args.description,
        summary: args.summary,
        category: args.category,
        badge: args.badge,
        locationLabel: args.locationLabel,
        town: args.town,
        region: args.region,
        countryCode: args.countryCode,
        countryLabel: args.countryLabel,
        planningLocationId: args.planningLocationId,
        coordinate: args.coordinate,
        imageStorageId: args.imageStorageId,
        imageUri,
        galleryImages,
        visitTips: args.visitTips,
        sections: args.sections,
        sectionsTitle: args.sectionsTitle,
        status,
        updatedByAdminSlug: admin.slug,
        publishedAt: status === 'live' ? existing.publishedAt ?? now : existing.publishedAt,
        archivedAt: status === 'archived' ? now : undefined,
        updatedAt: now,
      });
      await recordAdminAuditEvent(ctx, {
        actor: admin,
        action: 'content.update',
        targetKind: 'location',
        targetId: args.locationId,
        targetLabel: args.title,
        summary: `Updated location as ${status}.`,
      });

      return { locationId: args.locationId, slug };
    }

    const locationId = await ctx.db.insert('locations', {
      slug,
      title: args.title,
      description: args.description,
      summary: args.summary,
      category: args.category,
      badge: args.badge,
      locationLabel: args.locationLabel,
      town: args.town,
      region: args.region,
      countryCode: args.countryCode,
      countryLabel: args.countryLabel,
      planningLocationId: args.planningLocationId,
      coordinate: args.coordinate,
      imageStorageId: args.imageStorageId,
      imageUri,
      galleryImages,
      visitTips: args.visitTips,
      sections: args.sections,
      sectionsTitle: args.sectionsTitle,
      status,
      createdByAdminSlug: admin.slug,
      updatedByAdminSlug: admin.slug,
      publishedAt: status === 'live' ? now : undefined,
      archivedAt: status === 'archived' ? now : undefined,
      sourceKind: 'admin',
      createdAt: now,
      updatedAt: now,
    });
    await recordAdminAuditEvent(ctx, {
      actor: admin,
      action: 'content.create',
      targetKind: 'location',
      targetId: locationId,
      targetLabel: args.title,
      summary: `Created location as ${status}.`,
    });

    return { locationId, slug };
  },
});

export const upsertManagedExperience = mutation({
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
    linkedLocationId: v.optional(v.id('locations')),
    status: v.optional(contentStatusValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    const slug = await createUniqueSlug(ctx, 'experiences', args.title, args.experienceId);
    const status = args.status ?? 'draft';
    const payload = {
      slug,
      managerSlug: admin.slug,
      itemKind: 'experience' as const,
      badge: 'Experience',
      ctaLabel: 'Book now',
      title: args.title,
      subtitle: args.subtitle,
      description: args.description,
      category: args.category,
      durationLabel: args.durationLabel,
      groupSizeLabel: `Up to ${args.groupCapacity} guests`,
      price: `$${args.priceUsd}`,
      priceSuffix: 'per person',
      countryCode: args.countryCode,
      countryLabel: args.countryLabel,
      planningLocationId: args.planningLocationId,
      coordinate: args.coordinate,
      geography: { region: args.region, town: args.town },
      locationLabel: args.locationLabel,
      imageUri: args.imageUri,
      galleryImages: args.galleryImages,
      booking: {
        availabilityLabel: args.availabilityLabel,
        confirmMode: args.confirmMode,
        addToTripLabel: 'Add to trip',
        continueWithoutTripLabel: 'Continue',
      },
      includes: args.includes,
      linkedLocationId: args.linkedLocationId,
      status,
      updatedByAdminSlug: admin.slug,
      publishedAt: status === 'live' ? now : undefined,
      archivedAt: status === 'archived' ? now : undefined,
    };

    if (args.experienceId) {
      const existing = await ctx.db.get(args.experienceId);
      if (!existing) {
        throw new ConvexError('Experience not found');
      }

      await ctx.db.patch(args.experienceId, {
        ...payload,
        publishedAt: status === 'live' ? existing.publishedAt ?? now : existing.publishedAt,
        archivedAt: status === 'archived' ? now : undefined,
      });
      await recordAdminAuditEvent(ctx, {
        actor: admin,
        action: 'content.update',
        targetKind: 'experience',
        targetId: args.experienceId,
        targetLabel: args.title,
        summary: `Updated experience as ${status}.`,
      });
      return { experienceId: args.experienceId, slug };
    }

    const experienceId = await ctx.db.insert('experiences', {
      ...payload,
      createdByAdminSlug: admin.slug,
    });
    await recordAdminAuditEvent(ctx, {
      actor: admin,
      action: 'content.create',
      targetKind: 'experience',
      targetId: experienceId,
      targetLabel: args.title,
      summary: `Created experience as ${status}.`,
    });

    return { experienceId, slug };
  },
});

export const upsertManagedStay = mutation({
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
    rating: v.number(),
    reviewCount: v.number(),
    bookingNote: v.string(),
    stayStyle: stayStyleValidator,
    routeVibe: routeVibeValidator,
    sleepSignal: v.string(),
    idealFor: v.array(v.string()),
    amenities: v.array(v.string()),
    nearbyHighlights: v.array(v.string()),
    bookingProfile: stayBookingProfileValidator,
    linkedLocationId: v.optional(v.id('locations')),
    status: v.optional(contentStatusValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    const slug = await createUniqueSlug(ctx, 'stays', args.name, args.stayId);
    const status = args.status ?? 'draft';
    const payload = {
      slug,
      managerSlug: admin.slug,
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
      linkedLocationId: args.linkedLocationId,
      status,
      updatedByAdminSlug: admin.slug,
      publishedAt: status === 'live' ? now : undefined,
      archivedAt: status === 'archived' ? now : undefined,
    };

    if (args.stayId) {
      const existing = await ctx.db.get(args.stayId);
      if (!existing) {
        throw new ConvexError('Stay not found');
      }

      await ctx.db.patch(args.stayId, {
        ...payload,
        publishedAt: status === 'live' ? existing.publishedAt ?? now : existing.publishedAt,
        archivedAt: status === 'archived' ? now : undefined,
      });
      await recordAdminAuditEvent(ctx, {
        actor: admin,
        action: 'content.update',
        targetKind: 'stay',
        targetId: args.stayId,
        targetLabel: args.name,
        summary: `Updated stay as ${status}.`,
      });
      return { roomId: args.bookingProfile.defaultRoomOptionId, stayId: args.stayId, slug };
    }

    const stayId = await ctx.db.insert('stays', {
      ...payload,
      createdByAdminSlug: admin.slug,
    });
    await recordAdminAuditEvent(ctx, {
      actor: admin,
      action: 'content.create',
      targetKind: 'stay',
      targetId: stayId,
      targetLabel: args.name,
      summary: `Created stay as ${status}.`,
    });

    return { roomId: args.bookingProfile.defaultRoomOptionId, stayId, slug };
  },
});

export const updateManagedContentStatus = mutation({
  args: {
    kind: contentKindValidator,
    id: v.union(v.id('locations'), v.id('experiences'), v.id('stays')),
    status: contentStatusValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    const patch = {
      status: args.status,
      updatedByAdminSlug: admin.slug,
      publishedAt: args.status === 'live' ? now : undefined,
      archivedAt: args.status === 'archived' ? now : undefined,
      updatedAt: now,
    };

    if (args.kind === 'location') {
      const id = args.id as Id<'locations'>;
      const existing = await ctx.db.get(id);
      if (!existing) {
        throw new ConvexError('Location not found');
      }
      if (args.status === 'live' && !existing.imageStorageId) {
        throw new ConvexError('Upload a place image before publishing.');
      }
      await ctx.db.patch(id, { ...patch, publishedAt: args.status === 'live' ? existing.publishedAt ?? now : existing.publishedAt });
      await recordAdminAuditEvent(ctx, {
        actor: admin,
        action: 'content.status',
        targetKind: 'location',
        targetId: id,
        targetLabel: existing.title,
        summary: `Changed location status to ${args.status}.`,
      });
      return true;
    }

    if (args.kind === 'experience') {
      const id = args.id as Id<'experiences'>;
      const existing = await ctx.db.get(id);
      if (!existing) {
        throw new ConvexError('Experience not found');
      }
      await ctx.db.patch(id, {
        status: args.status,
        updatedByAdminSlug: admin.slug,
        ...(existing.businessProfileId && args.status === 'live'
          ? { reviewStatus: 'approved' as const, reviewedByAdminSlug: admin.slug, reviewedAt: now }
          : {}),
        publishedAt: args.status === 'live' ? existing.publishedAt ?? now : existing.publishedAt,
        archivedAt: args.status === 'archived' ? now : undefined,
      });
      await recordAdminAuditEvent(ctx, {
        actor: admin,
        action: 'content.status',
        targetKind: 'experience',
        targetId: id,
        targetLabel: existing.title,
        summary: `Changed experience status to ${args.status}.`,
      });
      return true;
    }

    const id = args.id as Id<'stays'>;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new ConvexError('Stay not found');
    }
    await ctx.db.patch(id, {
      status: args.status,
      updatedByAdminSlug: admin.slug,
      ...(existing.businessProfileId && args.status === 'live'
        ? { reviewStatus: 'approved' as const, reviewedByAdminSlug: admin.slug, reviewedAt: now }
        : {}),
      publishedAt: args.status === 'live' ? existing.publishedAt ?? now : existing.publishedAt,
      archivedAt: args.status === 'archived' ? now : undefined,
    });
    await recordAdminAuditEvent(ctx, {
      actor: admin,
      action: 'content.status',
      targetKind: 'stay',
      targetId: id,
      targetLabel: existing.name,
      summary: `Changed stay status to ${args.status}.`,
    });
    return true;
  },
});

export const migrateLegacyContentAsLive = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 80, 1), 200);
    const now = Date.now();
    const [gems, experiences, stays] = await Promise.all([
      ctx.db.query('gems').take(limit),
      ctx.db.query('experiences').take(limit),
      ctx.db.query('stays').take(limit),
    ]);

    let locationsCreated = 0;
    let experiencesUpdated = 0;
    let staysUpdated = 0;

    for (const gem of gems) {
      const slug = slugify(gem.title);
      const existing = await ctx.db.query('locations').withIndex('by_slug', (q) => q.eq('slug', slug)).unique();
      if (!existing) {
        const location = legacyGemToPublicLocation(gem);
        await ctx.db.insert('locations', {
          slug: location.slug,
          title: location.title,
          description: location.description,
          summary: location.summary,
          category: location.category,
          badge: location.badge,
          locationLabel: location.locationLabel,
          town: location.town ?? undefined,
          region: location.region,
          countryCode: location.countryCode,
          countryLabel: location.countryLabel,
          planningLocationId: location.planningLocationId,
          coordinate: location.coordinate ? [...location.coordinate] : [],
          imageUri: location.imageUri,
          galleryImages: location.galleryImages,
          visitTips: location.visitTips,
          sections: location.sections,
          sectionsTitle: location.sectionsTitle,
          status: 'live',
          createdByAdminSlug: admin.slug,
          updatedByAdminSlug: admin.slug,
          publishedAt: now,
          sourceKind: 'legacyGem',
          legacySourceSlug: slug,
          createdAt: now,
          updatedAt: now,
        });
        locationsCreated += 1;
      }
    }

    for (const experience of experiences) {
      if (experience.status) {
        continue;
      }

      if (experience.itemKind === 'hiddenGem') {
        const existing = await ctx.db
          .query('locations')
          .withIndex('by_slug', (q) => q.eq('slug', experience.slug))
          .unique();

        if (!existing) {
          const location = hiddenGemExperienceToPublicLocation(experience);
          await ctx.db.insert('locations', {
            slug: location.slug,
            title: location.title,
            description: location.description,
            summary: location.summary,
            category: location.category,
            badge: location.badge,
            locationLabel: location.locationLabel,
            town: location.town ?? undefined,
            region: location.region,
            countryCode: location.countryCode,
            countryLabel: location.countryLabel,
            planningLocationId: location.planningLocationId,
            coordinate: location.coordinate ? [...location.coordinate] : [],
            imageUri: location.imageUri,
            galleryImages: location.galleryImages,
            visitTips: location.visitTips,
            sections: location.sections,
            sectionsTitle: location.sectionsTitle,
            status: 'live',
            createdByAdminSlug: admin.slug,
            updatedByAdminSlug: admin.slug,
            publishedAt: now,
            sourceKind: 'legacyExperience',
            legacySourceSlug: experience.slug,
            createdAt: now,
            updatedAt: now,
          });
          locationsCreated += 1;
        }

        await ctx.db.patch(experience._id, {
          status: 'archived',
          updatedByAdminSlug: admin.slug,
          archivedAt: now,
        });
      } else {
        await ctx.db.patch(experience._id, {
          status: 'live',
          createdByAdminSlug: experience.createdByAdminSlug ?? admin.slug,
          updatedByAdminSlug: admin.slug,
          publishedAt: now,
        });
        experiencesUpdated += 1;
      }
    }

    for (const stay of stays) {
      if (stay.status) {
        continue;
      }

      await ctx.db.patch(stay._id, {
        status: 'live',
        createdByAdminSlug: stay.createdByAdminSlug ?? admin.slug,
        updatedByAdminSlug: admin.slug,
        publishedAt: now,
      });
      staysUpdated += 1;
    }

    await recordAdminAuditEvent(ctx, {
      actor: admin,
      action: 'content.migrate',
      targetKind: 'catalog',
      targetId: 'legacy-content',
      targetLabel: 'Legacy content',
      summary: `Migrated ${locationsCreated} locations, ${experiencesUpdated} experiences, and ${staysUpdated} stays.`,
    });

    return { locationsCreated, experiencesUpdated, staysUpdated };
  },
});
