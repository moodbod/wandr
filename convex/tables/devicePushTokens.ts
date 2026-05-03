import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const devicePushTokensTable = defineTable({
  travelerSlug: v.string(),
  installationId: v.string(),
  expoPushToken: v.string(),
  platform: v.union(v.literal('ios'), v.literal('android')),
  updatedAt: v.number(),
  createdAt: v.number(),
})
  .index('by_travelerSlug', ['travelerSlug'])
  .index('by_expoPushToken', ['expoPushToken'])
  .index('by_installationId', ['installationId']);
