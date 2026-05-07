import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const appUsersTable = defineTable({
  slug: v.string(),
  authUserId: v.optional(v.string()),
  email: v.optional(v.string()),
  name: v.string(),
  countryCode: v.string(),
  countryLabel: v.string(),
  tokenIdentifier: v.optional(v.string()),
  clerkUserId: v.optional(v.string()),
  phoneNumber: v.optional(v.string()),
  homeCity: v.optional(v.string()),
  travelStyle: v.optional(v.union(v.literal('solo'), v.literal('couple'), v.literal('friends'), v.literal('family'))),
  onboardingCompletedAt: v.optional(v.number()),
})
  .index('by_slug', ['slug'])
  .index('by_authUserId', ['authUserId'])
  .index('by_email', ['email'])
  .index('by_tokenIdentifier', ['tokenIdentifier'])
  .index('by_phoneNumber', ['phoneNumber']);
