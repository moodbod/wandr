import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const businessProfilesTable = defineTable({
  ownerUserId: v.id('users'),
  ownerSlug: v.string(),
  businessName: v.string(),
  providerType: v.union(v.literal('experiences'), v.literal('stays'), v.literal('both')),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  contactName: v.optional(v.string()),
  status: v.union(v.literal('invited'), v.literal('active'), v.literal('suspended')),
  acceptedPaymentModes: v.array(v.union(v.literal('cash'), v.literal('platform'))),
  directPaymentNotes: v.optional(v.string()),
  subscriptionStatus: v.optional(v.union(v.literal('none'), v.literal('trial'), v.literal('active'), v.literal('past_due'))),
  invitedByAdminSlug: v.string(),
  invitedAt: v.number(),
  suspendedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index('by_ownerUserId', ['ownerUserId'])
  .index('by_ownerSlug', ['ownerSlug'])
  .index('by_status', ['status'])
  .index('by_providerType', ['providerType']);
