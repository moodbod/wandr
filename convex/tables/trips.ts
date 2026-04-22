import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const tripsTable = defineTable({
  name: v.string(),
  travelerSlug: v.string(),
  createdAt: v.number(),
  status: v.union(v.literal('active'), v.literal('completed'), v.literal('archived')),
}).index('by_travelerSlug', ['travelerSlug']);
