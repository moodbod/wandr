import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const appUsersTable = defineTable({
  slug: v.string(),
  name: v.string(),
  countryCode: v.string(),
  countryLabel: v.string(),
  phoneNumber: v.optional(v.string()),
})
  .index('by_slug', ['slug'])
  .index('by_phoneNumber', ['phoneNumber']);
