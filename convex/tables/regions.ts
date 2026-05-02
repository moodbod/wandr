import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const regionsTable = defineTable({
  name: v.string(),
  countryCode: v.optional(v.string()),
  countryLabel: v.optional(v.string()),
  planningLocationId: v.optional(v.string()),
  centerCoordinate: v.array(v.number()),
  description: v.optional(v.string()),
}).index('by_name', ['name']);
