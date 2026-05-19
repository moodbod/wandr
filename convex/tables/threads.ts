import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const threadsTable = defineTable({
  participantA: v.string(),
  participantB: v.string(),
  title: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_participantA_and_updatedAt', ['participantA', 'updatedAt'])
  .index('by_participantB_and_updatedAt', ['participantB', 'updatedAt'])
  .index('by_participantA_and_participantB', ['participantA', 'participantB']);
