import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const regionsTable = defineTable({
  name: v.string(),
  centerCoordinate: v.array(v.number()),
  description: v.optional(v.string()),
}).index('by_name', ['name']);
