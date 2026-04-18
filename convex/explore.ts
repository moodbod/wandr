import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

import { defaultExplorePageSeed } from './seedData';

const markerValidator = v.object({
  id: v.string(),
  coordinate: v.array(v.number()),
  label: v.optional(v.string()),
  tone: v.optional(v.union(v.literal('accent'), v.literal('dark'))),
});

const activityValidator = v.object({
  badge: v.string(),
  badgeTone: v.optional(v.union(v.literal('accent'), v.literal('soft'))),
  ctaLabel: v.string(),
  imageUri: v.string(),
  price: v.string(),
  priceSuffix: v.string(),
  subtitle: v.string(),
  title: v.string(),
});

const featureHeroValidator = v.object({
  badge: v.string(),
  title: v.string(),
  description: v.string(),
  imageUri: v.string(),
});

const featureDetailValidator = v.object({
  category: v.string(),
  title: v.string(),
  description: v.string(),
  price: v.string(),
  priceSuffix: v.string(),
  imageUri: v.string(),
});

const hiddenGemValidator = v.object({
  title: v.string(),
  description: v.string(),
  imageUri: v.string(),
});

const pageContentValidator = v.object({
  home: v.object({
    hero: v.object({
      title: v.string(),
      locationLabel: v.string(),
      centerCoordinate: v.array(v.number()),
      markers: v.array(markerValidator),
    }),
    section: v.object({
      eyebrow: v.string(),
      title: v.string(),
    }),
    activities: v.array(activityValidator),
  }),
  search: v.object({
    intro: v.object({
      title: v.string(),
      description: v.string(),
      tags: v.array(v.string()),
      searchPlaceholder: v.string(),
    }),
    featured: v.object({
      hero: featureHeroValidator,
      detail: featureDetailValidator,
    }),
    hiddenGems: v.object({
      title: v.string(),
      ctaLabel: v.string(),
      items: v.array(hiddenGemValidator),
    }),
    map: v.object({
      title: v.string(),
      description: v.string(),
      ctaLabel: v.string(),
      centerCoordinate: v.array(v.number()),
      markers: v.array(markerValidator),
    }),
  }),
});

export const getPageContent = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db.query('explorePages').withIndex('by_slug', (q) => q.eq('slug', args.slug)).unique();

    if (!page) {
      return null;
    }

    return {
      slug: page.slug,
      home: page.home,
      search: page.search,
      updatedAt: page.updatedAt,
    };
  },
});

export const upsertPageContent = mutationGeneric({
  args: {
    slug: v.string(),
    content: pageContentValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('explorePages')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    const value = {
      slug: args.slug,
      home: args.content.home,
      search: args.content.search,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }

    return await ctx.db.insert('explorePages', value);
  },
});

export const seedDefaultPageContent = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query('explorePages')
      .withIndex('by_slug', (q) => q.eq('slug', defaultExplorePageSeed.slug))
      .unique();

    const value = {
      slug: defaultExplorePageSeed.slug,
      home: defaultExplorePageSeed.content.home,
      search: defaultExplorePageSeed.content.search,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }

    return await ctx.db.insert('explorePages', value);
  },
});
