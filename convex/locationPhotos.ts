import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
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
    return await ctx.db.insert('locationPhotos', {
      locationKind: args.locationKind,
      locationSlug: args.locationSlug,
      travelerSlug: args.travelerSlug,
      storageId: args.storageId,
      caption: args.caption,
      source: 'user',
      status: 'approved',
      createdAt: Date.now(),
    });
  },
});

export const listLocationPhotos = query({
  args: {
    locationKind: v.union(v.literal('experience'), v.literal('stay')),
    locationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query('locationPhotos')
      .withIndex('by_location_and_status', (q) =>
        q
          .eq('locationKind', args.locationKind)
          .eq('locationSlug', args.locationSlug)
          .eq('status', 'approved')
      )
      .order('desc')
      .take(60);

    const resolved = await Promise.all(
      photos.map(async (photo) => {
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
