import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const markerValidator = v.object({
  id: v.string(),
  coordinate: v.array(v.number()),
  experienceSlug: v.optional(v.string()),
  imageUri: v.optional(v.string()),
  label: v.optional(v.string()),
  tone: v.optional(v.union(v.literal('accent'), v.literal('dark'))),
});

const activityValidator = v.object({
  experienceSlug: v.optional(v.string()),
  badge: v.string(),
  badgeTone: v.optional(v.union(v.literal('accent'), v.literal('soft'))),
  ctaLabel: v.string(),
  imageUri: v.string(),
  price: v.string(),
  priceSuffix: v.string(),
  subtitle: v.string(),
  title: v.string(),
});

const featureHeroValidator = v.object({
  experienceSlug: v.optional(v.string()),
  badge: v.string(),
  title: v.string(),
  description: v.string(),
  imageUri: v.string(),
  ctaLabel: v.optional(v.string()),
});

const featureDetailValidator = v.object({
  experienceSlug: v.optional(v.string()),
  category: v.string(),
  title: v.string(),
  description: v.string(),
  price: v.string(),
  priceSuffix: v.string(),
  imageUri: v.string(),
  ctaLabel: v.optional(v.string()),
});

const hiddenGemValidator = v.object({
  title: v.string(),
  description: v.string(),
  imageUri: v.string(),
  geography: v.optional(
    v.object({
      region: v.string(),
      town: v.optional(v.string()),
    })
  ),
  badge: v.optional(v.string()),
  locationLabel: v.optional(v.string()),
  summary: v.optional(v.string()),
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
  visitTips: v.optional(v.array(v.string())),
  primaryLabel: v.optional(v.string()),
  secondaryLabel: v.optional(v.string()),
});

const experienceValidator = v.object({
  slug: v.string(),
  badge: v.string(),
  badgeTone: v.optional(v.union(v.literal('accent'), v.literal('soft'))),
  ctaLabel: v.string(),
  title: v.string(),
  subtitle: v.string(),
  description: v.string(),
  imageUri: v.string(),
  price: v.string(),
  priceSuffix: v.string(),
  category: v.optional(v.string()),
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
});

export default defineSchema({
  explorePages: defineTable({
    slug: v.string(),
    home: v.object({
      hero: v.object({
        title: v.string(),
        locationLabel: v.string(),
        centerCoordinate: v.array(v.number()),
        markers: v.array(markerValidator),
      }),
      section: v.object({
        eyebrow: v.string(),
        title: v.string(),
      }),
      activities: v.array(activityValidator),
    }),
    search: v.object({
      intro: v.object({
        title: v.string(),
        description: v.string(),
        tags: v.array(v.string()),
        searchPlaceholder: v.string(),
      }),
      featured: v.object({
        hero: featureHeroValidator,
        detail: featureDetailValidator,
      }),
      hiddenGems: v.object({
        title: v.string(),
        ctaLabel: v.string(),
        items: v.array(hiddenGemValidator),
      }),
      map: v.object({
        title: v.string(),
        description: v.string(),
        ctaLabel: v.string(),
        centerCoordinate: v.array(v.number()),
        markers: v.array(markerValidator),
      }),
    }),
    experiences: v.optional(v.array(experienceValidator)),
    updatedAt: v.number(),
  }).index('by_slug', ['slug']),

  appUsers: defineTable({
    slug: v.string(),
    name: v.string(),
    countryCode: v.string(),
    countryLabel: v.string(),
  }).index('by_slug', ['slug']),

  experienceBookings: defineTable({
    experienceSlug: v.string(),
    travelerSlug: v.string(),
    bookedAt: v.number(),
  })
    .index('by_experienceSlug', ['experienceSlug'])
    .index('by_travelerSlug_and_experienceSlug', ['travelerSlug', 'experienceSlug']),
});
