import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const phoneOtpsTable = defineTable({
  phoneNumber: v.string(),
  codeHash: v.string(),
  salt: v.string(),
  attempts: v.number(),
  createdAt: v.number(),
  expiresAt: v.number(),
  consumedAt: v.optional(v.number()),
  lastSentAt: v.number(),
})
  .index('by_phoneNumber_and_createdAt', ['phoneNumber', 'createdAt'])
  .index('by_expiresAt', ['expiresAt']);
