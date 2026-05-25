import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const locationsTable = defineTable({
  slug: v.string(),
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
  coordinate: v.array(v.number()),
  imageUri: v.string(),
  galleryImages: v.array(v.string()),
  visitTips: v.array(v.string()),
  sections: v.optional(
    v.array(
      v.object({
        title: v.string(),
        body: v.string(),
      })
    )
  ),
  sectionsTitle: v.optional(v.string()),
  status: v.union(v.literal('draft'), v.literal('live'), v.literal('archived')),
  createdByAdminSlug: v.string(),
  updatedByAdminSlug: v.string(),
  publishedAt: v.optional(v.number()),
  archivedAt: v.optional(v.number()),
  linkedRegionId: v.optional(v.id('regions')),
  sourceKind: v.optional(v.union(v.literal('admin'), v.literal('legacyGem'), v.literal('legacyExperience'))),
  legacySourceSlug: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_slug', ['slug'])
  .index('by_status', ['status'])
  .index('by_status_and_planningLocationId', ['status', 'planningLocationId'])
  .index('by_createdByAdminSlug_and_status', ['createdByAdminSlug', 'status']);
