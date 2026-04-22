import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';
import type { QueryCtx } from './_generated/server';

import type { ExploreExperience } from '../constants/explore-content';
import { demoExploreBookings } from './seeds/demoExploreBookings';
import { demoExploreTravelers } from './seeds/demoExploreTravelers';
import { seedExperiences } from './seeds/seedExperiences';
import { seedHiddenGems } from './seeds/seedHiddenGems';
import { seedRegions } from './seeds/seedRegions';

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
  geography: v.optional(
    v.object({
      region: v.string(),
      town: v.optional(v.string()),
    })
  ),
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
        .query('appUsers')
        .withIndex('by_slug', (q) => q.eq('slug', booking.travelerSlug))
        .unique();

      if (!traveler) {
        continue;
      }

      const key = `${traveler.countryCode}:${traveler.countryLabel}`;
      const existing = countryCounts.get(key);

      if (existing) {
        existing.visitorCount += 1;
      } else {
        countryCounts.set(key, {
          countryCode: traveler.countryCode,
          countryLabel: traveler.countryLabel,
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
    .query('appUsers')
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

  for (const booking of bookings) {
    const traveler = await ctx.db
      .query('appUsers')
      .withIndex('by_slug', (q) => q.eq('slug', booking.travelerSlug))
      .unique();

    if (!traveler) {
      continue;
    }

    if (traveler.countryCode === currentTraveler.countryCode) {
      visitorCount += 1;
      if (!visitorNames.includes(traveler.name)) {
        visitorNames.push(traveler.name);
      }
    }
  }

  return {
    countryCode: currentTraveler.countryCode,
    countryLabel: currentTraveler.countryLabel,
    visitorCount,
    visitorNames: visitorNames.slice(0, 3),
    viewerName: currentTraveler.name,
  };
}

export const getPageContent = queryGeneric({
  args: { slug: v.string(), travelerSlug: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const activities = await ctx.db.query('experiences').filter(q => q.eq(q.field('isActivityCard'), true)).collect();
    const hiddenGems = await ctx.db.query('hiddenGems').collect();
    const allExperiences = await ctx.db.query('experiences').collect();
    
    if (allExperiences.length === 0) {
      return null;
    }

    const experiences = await enrichExperiencesWithCommunity(ctx, allExperiences as any);

    const heroExp = allExperiences.find(exp => exp.isFeaturedHero);
    const detailExp = allExperiences.find(exp => exp.isFeaturedDetail);

    // Combine experiences and hidden gems for the map
    const experienceMarkers = allExperiences
      .filter(exp => exp.coordinate)
      .map((exp, i) => ({
        id: exp.slug,
        coordinate: exp.coordinate,
        experienceSlug: exp.slug,
        imageUri: exp.imageUri,
        label: exp.locationLabel || exp.title,
        tone: i % 2 === 0 ? 'accent' : 'dark' as const,
      }));

    const gemMarkers = hiddenGems
      .filter(gem => gem.coordinate)
      .map((gem, i) => ({
        id: `gem-${gem._id}`,
        coordinate: gem.coordinate!,
        experienceSlug: undefined, // Hidden gems don't have experience slugs
        imageUri: gem.imageUri,
        label: gem.locationLabel || gem.title,
        tone: 'dark' as const,
      }));

    const dynamicMarkers = [...experienceMarkers, ...gemMarkers];

    return {
      slug: args.slug,
      home: {
        hero: {
          title: 'Explore Namibia',
          locationLabel: 'Windhoek, NA',
          centerCoordinate: [17.0832, -22.5609],
          markers: dynamicMarkers as any,
        },
        section: {
          eyebrow: 'Nationwide Picks',
          title: 'Start in Windhoek, then branch out',
        },
        activities: await Promise.all(
          activities.map(async (exp) => {
            const personalizedAudience = await getPersonalizedTravelerAudience(ctx, exp.slug, args.travelerSlug);

            return {
              experienceSlug: exp.slug,
              badge: exp.badge,
              badgeTone: exp.badgeTone,
              ctaLabel: exp.ctaLabel,
              imageUri: exp.imageUri,
              price: exp.price,
              priceSuffix: exp.priceSuffix,
              subtitle: exp.subtitle,
              title: exp.title,
              visitorCount: personalizedAudience?.visitorCount,
              countryLabel: personalizedAudience?.countryLabel,
              visitorNames: personalizedAudience?.visitorNames,
              viewerName: personalizedAudience?.viewerName,
            };
          })
        ) as any,
      },
      search: {
        intro: {
          title: 'Explore Namibia',
          description: 'From Windhoek to the coast, desert, wildlife reserves, and river country, uncover trips that move across Namibia with real regional coverage.',
          tags: ['Namibia', 'Nationwide'],
          searchPlaceholder: 'Search Windhoek, Etosha, Sossusvlei...',
        },
        featured: {
          hero: heroExp ? {
            experienceSlug: heroExp.slug,
            badge: heroExp.badge,
            title: heroExp.title,
            description: heroExp.description,
            imageUri: heroExp.imageUri,
            ctaLabel: heroExp.ctaLabel,
          } : undefined,
          detail: detailExp ? {
            experienceSlug: detailExp.slug,
            category: detailExp.category || 'Experience',
            title: detailExp.title,
            description: detailExp.description,
            price: detailExp.price,
            priceSuffix: detailExp.priceSuffix,
            imageUri: detailExp.imageUri,
            ctaLabel: detailExp.ctaLabel,
          } : undefined,
        },
        hiddenGems: {
          title: 'Hidden Gems',
          ctaLabel: 'View All',
          items: hiddenGems as any,
        },
        map: {
          title: 'Live Map',
          description: `${dynamicMarkers.length} active experiences spread across Namibia.`,
          ctaLabel: 'Expand View',
          centerCoordinate: [17.0832, -22.5609],
          markers: dynamicMarkers as any,
        },
      },
      experiences,
      updatedAt: Date.now(),
    };
  },
});

export const seedExplorePageContent = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    // Clear existing data to ensure a fresh start
    const allRegions = await ctx.db.query('regions').collect();
    for (const r of allRegions) await ctx.db.delete(r._id);
    
    const allExperiences = await ctx.db.query('experiences').collect();
    for (const e of allExperiences) await ctx.db.delete(e._id);
    
    const allHiddenGems = await ctx.db.query('hiddenGems').collect();
    for (const g of allHiddenGems) await ctx.db.delete(g._id);
    
    const allUsers = await ctx.db.query('appUsers').collect();
    for (const u of allUsers) await ctx.db.delete(u._id);
    
    const allBookings = await ctx.db.query('experienceBookings').collect();
    for (const b of allBookings) await ctx.db.delete(b._id);

    // Seed regions
    const regionMap = new Map<string, string>();
    for (const region of seedRegions) {
      const id = await ctx.db.insert('regions', region);
      regionMap.set(region.name, id);
    }

    // Seed experiences
    for (const exp of seedExperiences) {
      const isHero = exp.slug === 'etosha-game-drive';
      const isDetail = exp.slug === 'windhoek-craft-market-walk';
      const isActivity = ['windhoek-craft-market-walk', 'naankuse-wildlife-encounter', 'etosha-game-drive', 'sossusvlei-sunrise-drive'].includes(exp.slug);
      const regionId = exp.geography?.region ? regionMap.get(exp.geography.region) : undefined;

      await ctx.db.insert('experiences', {
        ...exp,
        isFeaturedHero: isHero,
        isFeaturedDetail: isDetail,
        isActivityCard: isActivity,
        regionId,
      } as any);
    }

    // Seed hidden gems
    for (const gem of seedHiddenGems) {
      const regionId = gem.geography?.region ? regionMap.get(gem.geography.region) : undefined;
      await ctx.db.insert('hiddenGems', { ...gem, regionId } as any);
    }

    // Seed users / travelers
    for (const traveler of demoExploreTravelers) {
      await ctx.db.insert('appUsers', traveler);
    }

    const seededDemoTripId = await ctx.db.insert('trips', {
      name: 'Namibia Road Trip',
      travelerSlug: 'local-demo-traveler',
      createdAt: Date.now(),
      status: 'active',
    });

    // Seed bookings
    for (const booking of demoExploreBookings) {
      await ctx.db.insert('experienceBookings', {
        travelerSlug: booking.travelerSlug,
        experienceSlug: booking.experienceSlug,
        tripId: booking.travelerSlug === 'local-demo-traveler' ? seededDemoTripId : undefined,
        bookedAt: Date.now(),
      });
    }

    return true;
  },
});

export const seedDefaultPageContent = seedExplorePageContent;

export const ensureExploreCommunitySeed = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    // Legacy function, replaced by seedExplorePageContent
    return true;
  },
});

export const getLocationLikeState = queryGeneric({
  args: {
    travelerSlug: v.string(),
    locationKind: v.union(v.literal('experience'), v.literal('hiddenGem')),
    locationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query('locationLikes')
      .withIndex('by_travelerSlug_and_locationKind_and_locationSlug', (q) =>
        q.eq('travelerSlug', args.travelerSlug)
      )
      .collect();

    const like = likes.find(
      (candidate) =>
        candidate.locationKind === args.locationKind && candidate.locationSlug === args.locationSlug
    );

    return {
      liked: Boolean(like),
    };
  },
});

export const toggleLocationLike = mutationGeneric({
  args: {
    travelerSlug: v.string(),
    locationKind: v.union(v.literal('experience'), v.literal('hiddenGem')),
    locationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query('locationLikes')
      .withIndex('by_travelerSlug_and_locationKind_and_locationSlug', (q) =>
        q.eq('travelerSlug', args.travelerSlug)
      )
      .collect();

    const existingLike = likes.find(
      (candidate) =>
        candidate.locationKind === args.locationKind && candidate.locationSlug === args.locationSlug
    );

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      return { liked: false };
    }

    await ctx.db.insert('locationLikes', {
      travelerSlug: args.travelerSlug,
      locationKind: args.locationKind,
      locationSlug: args.locationSlug,
      likedAt: Date.now(),
    });

    return { liked: true };
  },
});

export const bookExperience = mutationGeneric({
  args: {
    experienceSlug: v.string(),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const traveler = await ctx.db
      .query('appUsers')
      .withIndex('by_slug', (q) => q.eq('slug', args.travelerSlug))
      .unique();

    if (!traveler) {
      throw new Error('Traveler not found');
    }

    const existingBooking = await ctx.db
      .query('experienceBookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) =>
        q.eq('travelerSlug', args.travelerSlug)
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
      travelerSlug: args.travelerSlug,
      bookedAt: Date.now(),
    });
  },
});


export const resetExploreData = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query('experienceBookings').collect();
    for (const booking of bookings) {
      await ctx.db.delete(booking._id);
    }

    const users = await ctx.db.query('appUsers').collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    const experiences = await ctx.db.query('experiences').collect();
    for (const exp of experiences) {
      await ctx.db.delete(exp._id);
    }

    const gems = await ctx.db.query('hiddenGems').collect();
    for (const gem of gems) {
      await ctx.db.delete(gem._id);
    }

    const regions = await ctx.db.query('regions').collect();
    for (const region of regions) {
      await ctx.db.delete(region._id);
    }

    return {
      deletedBookings: bookings.length,
      deletedUsers: users.length,
      deletedExperiences: experiences.length,
      deletedGems: gems.length,
      deletedRegions: regions.length,
    };
  },
});
