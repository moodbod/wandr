import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { assertCurrentTravelerSlug, requireAdmin } from './authHelpers';
import { requireCurrentAuthRecord } from './authIdentity';

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentAuthRecord(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const submitLocationPhoto = mutation({
  args: {
    locationKind: v.union(v.literal('experience'), v.literal('stay')),
    locationSlug: v.string(),
    travelerSlug: v.string(),
    storageId: v.id('_storage'),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    return await ctx.db.insert('photos', {
      locationKind: args.locationKind,
      locationSlug: args.locationSlug,
      travelerSlug,
      storageId: args.storageId,
      caption: args.caption,
      source: 'user',
      status: 'pending',
      createdAt: Date.now(),
    });
  },
});

export const listManagedLocationPhotos = query({
  args: {
    managerSlug: v.string(),
    status: v.optional(v.union(v.literal('approved'), v.literal('pending'), v.literal('rejected'))),
  },
  handler: async (ctx, args) => {
    const manager = await requireAdmin(ctx);
    const managerSlug = manager.slug;
    const status = args.status;
    const query = status
      ? ctx.db
          .query('photos')
          .withIndex('by_status_and_createdAt', (q) => q.eq('status', status))
          .order('desc')
      : ctx.db.query('photos').order('desc');
    const photos = await query.take(80);

    const resolved = await Promise.all(
      photos.map(async (photo) => {
        const location =
          photo.locationKind === 'experience'
            ? await ctx.db
                .query('experiences')
                .withIndex('by_slug', (q) => q.eq('slug', photo.locationSlug))
                .unique()
            : await ctx.db
                .query('stays')
                .withIndex('by_slug', (q) => q.eq('slug', photo.locationSlug))
                .unique();

        if (location?.managerSlug !== managerSlug) {
          return null;
        }

        const imageUri = await ctx.storage.getUrl(photo.storageId);

        if (!imageUri) {
          return null;
        }

        return {
          id: photo._id,
          imageUri,
          locationKind: photo.locationKind,
          locationSlug: photo.locationSlug,
          travelerSlug: photo.travelerSlug,
          caption: photo.caption ?? null,
          source: photo.source,
          status: photo.status,
          createdAt: photo.createdAt,
          reviewedAt: photo.reviewedAt ?? null,
          reviewedBy: photo.reviewedBy ?? null,
        };
      })
    );

    return resolved.filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));
  },
});

export const updateLocationPhotoStatus = mutation({
  args: {
    photoId: v.id('photos'),
    status: v.union(v.literal('approved'), v.literal('rejected')),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireAdmin(ctx);
    const photo = await ctx.db.get(args.photoId);

    if (!photo) {
      return false;
    }

    await ctx.db.patch(args.photoId, {
      status: args.status,
      reviewedAt: Date.now(),
      reviewedBy: reviewer.slug,
    });

    return true;
  },
});

export const listLocationPhotos = query({
  args: {
    locationKind: v.union(v.literal('experience'), v.literal('stay')),
    locationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const approvedPhotos = await ctx.db
      .query('photos')
      .withIndex('by_location_and_status', (q) =>
        q
          .eq('locationKind', args.locationKind)
          .eq('locationSlug', args.locationSlug)
          .eq('status', 'approved')
      )
      .order('desc')
      .take(60);

    const resolved = await Promise.all(
      approvedPhotos.map(async (photo) => {
        const imageUri = await ctx.storage.getUrl(photo.storageId);

        if (!imageUri) {
          return null;
        }

        return {
          id: photo._id,
          imageUri,
          travelerSlug: photo.travelerSlug,
          source: photo.source,
          caption: photo.caption ?? null,
          createdAt: photo.createdAt,
        };
      })
    );

    return resolved.filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));
  },
});
