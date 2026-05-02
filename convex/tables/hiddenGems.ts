import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const hiddenGemsTable = defineTable({
  title: v.string(),
  description: v.string(),
  imageUri: v.string(),
  countryCode: v.optional(v.string()),
  countryLabel: v.optional(v.string()),
  planningLocationId: v.optional(v.string()),
  coordinate: v.optional(v.array(v.number())),
  geography: v.optional(
    v.object({
      region: v.string(),
      town: v.optional(v.string()),
    })
  ),
  badge: v.optional(v.string()),
  locationLabel: v.optional(v.string()),
  summary: v.optional(v.string()),
  tripFit: v.optional(
    v.array(
      v.object({
        label: v.string(),
        value: v.string(),
        detail: v.string(),
        icon: v.union(v.literal('compass'), v.literal('clock'), v.literal('users')),
        tone: v.optional(v.union(v.literal('dark'), v.literal('light'), v.literal('accent'))),
      })
    )
  ),
  sections: v.optional(
    v.array(
      v.object({
        title: v.string(),
        body: v.string(),
      })
    )
  ),
  visitTips: v.optional(v.array(v.string())),
  primaryLabel: v.optional(v.string()),
  secondaryLabel: v.optional(v.string()),
  regionId: v.optional(v.id('regions')),
}).index('by_title', ['title']);
