import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

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

export default defineSchema({
  explorePages: defineTable({
    slug: v.string(),
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
    updatedAt: v.number(),
  }).index('by_slug', ['slug']),
});
