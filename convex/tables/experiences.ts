import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const experiencesTable = defineTable({
  slug: v.string(),
  managerSlug: v.optional(v.string()),
  businessProfileId: v.optional(v.id('businessProfiles')),
  submittedBySlug: v.optional(v.string()),
  reviewStatus: v.optional(v.union(v.literal('draft'), v.literal('submitted'), v.literal('approved'), v.literal('rejected'))),
  reviewedByAdminSlug: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  submittedAt: v.optional(v.number()),
  rejectionNote: v.optional(v.string()),
  itemKind: v.optional(v.union(v.literal('experience'), v.literal('hiddenGem'))),
  badge: v.string(),
  badgeTone: v.optional(v.union(v.literal('accent'), v.literal('soft'), v.literal('dark'))),
  ctaLabel: v.string(),
  title: v.string(),
  subtitle: v.string(),
  description: v.string(),
  imageUri: v.string(),
  price: v.string(),
  priceSuffix: v.string(),
  rating: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  category: v.optional(v.string()),
  countryCode: v.optional(v.string()),
  countryLabel: v.optional(v.string()),
  planningLocationId: v.optional(v.string()),
  coordinate: v.optional(v.array(v.number())),
  geography: v.optional(
    v.object({
      region: v.string(),
      town: v.optional(v.string()),
    })
  ),
  locationLabel: v.optional(v.string()),
  durationLabel: v.optional(v.string()),
  groupSizeLabel: v.optional(v.string()),
  tripFit: v.optional(
    v.array(
      v.object({
        label: v.string(),
        value: v.string(),
        detail: v.string(),
        icon: v.union(v.literal('compass'), v.literal('clock'), v.literal('users')),
        tone: v.optional(v.union(v.literal('dark'), v.literal('light'), v.literal('accent'))),
      })
    )
  ),
  sections: v.optional(
    v.array(
      v.object({
        title: v.string(),
        body: v.string(),
      })
    )
  ),
  summary: v.optional(v.string()),
  visitTips: v.optional(v.array(v.string())),
  primaryLabel: v.optional(v.string()),
  secondaryLabel: v.optional(v.string()),
  galleryImages: v.optional(v.array(v.string())),
  travelerMomentum: v.optional(
    v.object({
      countryCode: v.string(),
      countryLabel: v.string(),
      visitorCount: v.number(),
      summary: v.string(),
    })
  ),
  booking: v.optional(
    v.object({
      availabilityLabel: v.string(),
      confirmMode: v.string(),
      addToTripLabel: v.string(),
      continueWithoutTripLabel: v.string(),
    })
  ),
  includes: v.array(v.string()),
  acceptedPaymentModes: v.optional(v.array(v.union(v.literal('cash'), v.literal('platform')))),
  directPaymentNotes: v.optional(v.string()),
  cancellationPolicy: v.optional(v.string()),
  contactNote: v.optional(v.string()),
  regionId: v.optional(v.id('regions')),
  status: v.optional(v.union(v.literal('draft'), v.literal('live'), v.literal('archived'))),
  createdByAdminSlug: v.optional(v.string()),
  updatedByAdminSlug: v.optional(v.string()),
  publishedAt: v.optional(v.number()),
  archivedAt: v.optional(v.number()),
  linkedLocationId: v.optional(v.id('locations')),
  // New flags for rendering on the explore pages
  isFeaturedHero: v.optional(v.boolean()),
  isFeaturedDetail: v.optional(v.boolean()),
  isActivityCard: v.optional(v.boolean()),
})
  .index('by_slug', ['slug'])
  .index('by_managerSlug', ['managerSlug'])
  .index('by_businessProfileId', ['businessProfileId'])
  .index('by_reviewStatus', ['reviewStatus'])
  .index('by_status', ['status'])
  .index('by_status_and_planningLocationId', ['status', 'planningLocationId']);
