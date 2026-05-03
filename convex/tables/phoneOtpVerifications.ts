import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const phoneOtpVerificationsTable = defineTable({
  phoneNumber: v.string(),
  tokenHash: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
  consumedAt: v.optional(v.number()),
})
  .index('by_tokenHash', ['tokenHash'])
  .index('by_phoneNumber_and_createdAt', ['phoneNumber', 'createdAt']);
