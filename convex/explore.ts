import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { getPublicTravelerProfile } from './appProfiles';
import { assertCurrentTravelerSlug, requireAdmin } from './authHelpers';

import type { ExploreExperience } from '../constants/explore-content';

const TRENDING_PLACE_LIMIT = 10;

const activityValidator = v.object({
  experienceSlug: v.optional(v.string()),
  badge: v.string(),
  badgeTone: v.optional(v.union(v.literal('accent'), v.literal('soft'), v.literal('dark'))),
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
  sectionsTitle: v.optional(v.string()),
  visitTips: v.optional(v.array(v.string())),
  primaryLabel: v.optional(v.string()),
  secondaryLabel: v.optional(v.string()),
});

const experienceValidator = v.object({
  slug: v.string(),
  badge: v.string(),
  badgeTone: v.optional(v.union(v.literal('accent'), v.literal('soft'), v.literal('dark'))),
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
  personalizedAudience: v.optional(
    v.object({
      countryCode: v.string(),
      countryLabel: v.string(),
      visitorCount: v.number(),
      visitorNames: v.array(v.string()),
      viewerName: v.optional(v.string()),
    })
  ),
  bookingOptions: v.optional(
    v.object({
      availabilityLabel: v.string(),
      confirmMode: v.string(),
      addToTripLabel: v.string(),
      continueWithoutTripLabel: v.string(),
    })
  ),
  includes: v.array(v.string()),
});

async function enrichExperiencesWithCommunity(
  ctx: QueryCtx,
  experiences: ExploreExperience[]
) {
  const enriched: ExploreExperience[] = [];

  for (const experience of experiences) {
    const bookings = await ctx.db
      .query('experienceBookings')
      .withIndex('by_experienceSlug', (q) => q.eq('experienceSlug', experience.slug))
      .take(200);

    if (bookings.length === 0) {
      enriched.push(experience);
      continue;
    }

    const countryCounts = new Map<
      string,
      { countryCode: string; countryLabel: string; visitorCount: number }
    >();

    for (const booking of bookings) {
      const traveler = await ctx.db
        .query('users')
        .withIndex('by_slug', (q) => q.eq('slug', booking.travelerSlug))
        .unique();

      if (!traveler) {
        continue;
      }

      const countryCode = traveler.countryCode ?? 'NA';
      const countryLabel = traveler.countryLabel ?? 'Unknown';
      const key = `${countryCode}:${countryLabel}`;
      const existing = countryCounts.get(key);

      if (existing) {
        existing.visitorCount += 1;
      } else {
        countryCounts.set(key, {
          countryCode,
          countryLabel,
          visitorCount: 1,
        });
      }
    }

    const topCountry = [...countryCounts.values()].sort(
      (a, b) => b.visitorCount - a.visitorCount
    )[0];

    if (!topCountry) {
      enriched.push(experience);
      continue;
    }

    enriched.push({
      ...experience,
      travelerMomentum: {
        countryCode: topCountry.countryCode,
        countryLabel: topCountry.countryLabel,
        visitorCount: topCountry.visitorCount,
        summary: `${topCountry.visitorCount} travelers from ${topCountry.countryLabel} booked this experience in the app.`,
      },
    });
  }

  return enriched;
}

async function getPersonalizedTravelerAudience(
  ctx: QueryCtx,
  experienceSlug: string,
  travelerSlug?: string
) {
  if (!travelerSlug) {
    return null;
  }

  const currentTraveler = await ctx.db
    .query('users')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique();

  if (!currentTraveler) {
    return null;
  }

  const bookings = await ctx.db
    .query('experienceBookings')
    .withIndex('by_experienceSlug', (q) => q.eq('experienceSlug', experienceSlug))
    .take(200);

  let visitorCount = 0;
  const visitorNames: string[] = [];

  const currentCountryCode = currentTraveler.countryCode ?? 'NA';

  for (const booking of bookings) {
    const traveler = await ctx.db
      .query('users')
      .withIndex('by_slug', (q) => q.eq('slug', booking.travelerSlug))
      .unique();

    if (!traveler) {
      continue;
    }

    if (traveler.countryCode === currentCountryCode) {
      visitorCount += 1;
      if (traveler.name && !visitorNames.includes(traveler.name)) {
        visitorNames.push(traveler.name);
      }
    }
  }

  return {
    countryCode: currentCountryCode,
    countryLabel: currentTraveler.countryLabel ?? 'Unknown',
    visitorCount,
    visitorNames: visitorNames.slice(0, 3),
    viewerName: currentTraveler.name,
  };
}

async function getExperiencePopularityCounts(ctx: QueryCtx) {
  const [bookings, visits] = await Promise.all([
    ctx.db.query('experienceBookings').collect(),
    ctx.db.query('experiences').collect(),
  ]);

  const counts = new Map<string, number>();
  for (const booking of bookings) {
    counts.set(booking.experienceSlug, (counts.get(booking.experienceSlug) ?? 0) + 1);
  }

  return counts;
}

export const getPageContent = query({
  args: {
    slug: v.string(),
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return null;
  },
});

export const listManagedExperiences = query({
  args: {
    managerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const manager = await requireAdmin(ctx);
    return await ctx.db
      .query('experiences')
      .withIndex('by_managerSlug', (q) => q.eq('managerSlug', manager.slug))
      .collect();
  },
});

export const createManagedExperience = mutation({
  args: {
    managerSlug: v.string(),
    itemKind: v.union(v.literal('experience'), v.literal('hiddenGem')),
    title: v.string(),
    subtitle: v.string(),
    description: v.string(),
    category: v.string(),
    durationLabel: v.string(),
    price: v.string(),
    priceSuffix: v.string(),
    coordinate: v.array(v.number()),
    imageUri: v.string(),
    galleryImages: v.array(v.string()),
    availabilityLabel: v.string(),
    confirmMode: v.string(),
    includes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const manager = await requireAdmin(ctx);
    const slug = args.title.toLowerCase().replace(/ /g, '-');
    await ctx.db.insert('experiences', {
      slug,
      managerSlug: manager.slug,
      itemKind: args.itemKind,
      badge: 'New',
      ctaLabel: 'Book now',
      title: args.title,
      subtitle: args.subtitle,
      description: args.description,
      category: args.category,
      durationLabel: args.durationLabel,
      price: args.price,
      priceSuffix: args.priceSuffix,
      coordinate: args.coordinate,
      imageUri: args.imageUri,
      galleryImages: args.galleryImages,
      booking: {
        availabilityLabel: args.availabilityLabel,
        confirmMode: args.confirmMode,
        addToTripLabel: 'Add to trip',
        continueWithoutTripLabel: 'Continue',
      },
      includes: args.includes,
      createdAt: Date.now(),
    } as any);
    return { slug };
  },
});

export const getExploreJoinableTripCards = query({
  args: {
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const circles = await ctx.db
      .query('friendCircles')
      .collect();

    const openCircles = circles.filter(c => c.status === 'active' && c.visibility === 'open');

    const resolved = await Promise.all(
      openCircles.map(async (circle) => {
        const host = await ctx.db
          .query('users')
          .withIndex('by_slug', (q) => q.eq('slug', circle.createdBySlug))
          .unique();
        
        return {
          id: circle._id,
          title: circle.name,
          subtitle: circle.destinationLabel,
          imageUri: host?.avatarUri ?? '',
          hostName: host?.name ?? 'Traveler',
          memberCount: 0, // Should calculate
        };
      })
    );

    return resolved;
  },
});

export const getExploreJoinableTrips = query({
  args: {
    travelerSlug: v.optional(v.string()),
    experienceSlug: v.string(),
  },
  handler: async (ctx, args) => {
    // Implementation for joinable trips for a specific experience
    return [];
  },
});

export const getExploreGroupTripDetail = query({
  args: {
    circleId: v.id('friendCircles'),
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const circle = await ctx.db.get(args.circleId);
    if (!circle) return null;

    const host = await ctx.db
      .query('users')
      .withIndex('by_slug', (q) => q.eq('slug', circle.createdBySlug))
      .unique();

    return {
      circleId: circle._id,
      name: circle.name,
      hostName: host?.name ?? 'Traveler',
      hostAvatarUri: host?.avatarUri ?? null,
      // ... more fields
    } as any;
  },
});

export const requestJoinExploreTrip = mutation({
  args: {
    travelerSlug: v.string(),
    circleId: v.id('friendCircles'),
    experienceSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    // ... logic to request join
    return true;
  },
});

export const getLocationLikeState = query({
  args: {
    travelerSlug: v.string(),
    locationKind: v.union(v.literal('experience'), v.literal('hiddenGem')),
    locationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const like = await ctx.db
      .query('locationLikes')
      .withIndex('by_travelerSlug_and_locationKind_and_locationSlug', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('locationKind', args.locationKind).eq('locationSlug', args.locationSlug)
      )
      .unique();
    return { liked: !!like };
  },
});

export const toggleLocationLike = mutation({
  args: {
    travelerSlug: v.string(),
    locationKind: v.union(v.literal('experience'), v.literal('hiddenGem')),
    locationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const existing = await ctx.db
      .query('locationLikes')
      .withIndex('by_travelerSlug_and_locationKind_and_locationSlug', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('locationKind', args.locationKind).eq('locationSlug', args.locationSlug)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    } else {
      await ctx.db.insert('locationLikes', {
        travelerSlug,
        locationKind: args.locationKind,
        locationSlug: args.locationSlug,
        likedAt: Date.now(),
      });
      return { liked: true };
    }
  },
});

export const listSavedPlaces = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const likes = await ctx.db
      .query('locationLikes')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
      .collect();
    
    // Resolve location details for likes
    return [];
  },
});

export const addExperienceToTrip = mutation({
  args: {
    experienceSlug: v.string(),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const traveler = await ctx.db
      .query('users')
      .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
      .unique();

    if (!traveler) {
      throw new Error('Traveler not found');
    }

    const existingBooking = await ctx.db
      .query('experienceBookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) =>
        q.eq('travelerSlug', travelerSlug)
      )
      .collect();

    const matchingBooking = existingBooking.find(
      (candidate) => candidate.experienceSlug === args.experienceSlug
    );

    if (matchingBooking) {
      return matchingBooking._id;
    }

    return await ctx.db.insert('experienceBookings', {
      experienceSlug: args.experienceSlug,
      travelerSlug,
      bookedAt: Date.now(),
    });
  },
});
