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
  visitorCount: v.optional(v.number()),
  countryLabel: v.optional(v.string()),
  avatarUris: v.optional(v.array(v.string())),
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
      avatarUris: v.optional(v.array(v.string())),
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
      { countryCode: string; countryLabel: string; visitorCount: number; avatarUris: string[] }
    >();

    for (const booking of bookings) {
      const traveler = await ctx.db
        .query('appUsers')
        .withIndex('by_slug', (q) => q.eq('slug', booking.travelerSlug))
        .unique();

      if (!traveler) {
        continue;
      }

      const travelerProfile = await ctx.db
        .query('travelerProfiles')
        .withIndex('by_slug', (q) => q.eq('travelerSlug', traveler.slug))
        .unique();

      const key = `${traveler.countryCode}:${traveler.countryLabel}`;
      const existing = countryCounts.get(key);

      if (existing) {
        existing.visitorCount += 1;
        if (travelerProfile?.avatarUri && !existing.avatarUris.includes(travelerProfile.avatarUri)) {
          existing.avatarUris.push(travelerProfile.avatarUri);
        }
      } else {
        countryCounts.set(key, {
          countryCode: traveler.countryCode,
          countryLabel: traveler.countryLabel,
          visitorCount: 1,
          avatarUris: travelerProfile?.avatarUri ? [travelerProfile.avatarUri] : [],
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
        avatarUris: topCountry.avatarUris.slice(0, 4),
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
  const avatarUris: string[] = [];

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

      const travelerProfile = await ctx.db
        .query('travelerProfiles')
        .withIndex('by_slug', (q) => q.eq('travelerSlug', traveler.slug))
        .unique();

      if (travelerProfile?.avatarUri && !avatarUris.includes(travelerProfile.avatarUri)) {
        avatarUris.push(travelerProfile.avatarUri);
      }
    }
  }

  return {
    countryCode: currentTraveler.countryCode,
    countryLabel: currentTraveler.countryLabel,
    visitorCount,
    avatarUris: avatarUris.slice(0, 4),
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
              avatarUris: personalizedAudience?.avatarUris,
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

    const allTravelerProfiles = await ctx.db.query('travelerProfiles').collect();
    for (const profile of allTravelerProfiles) await ctx.db.delete(profile._id);
    
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
      await ctx.db.insert('appUsers', {
        slug: traveler.slug,
        name: traveler.name,
        countryCode: traveler.countryCode,
        countryLabel: traveler.countryLabel,
      });
      await ctx.db.insert('travelerProfiles', {
        travelerSlug: traveler.slug,
        name: traveler.name,
        avatarUri: traveler.avatarUri,
        regionCode: traveler.countryCode,
        regionName: traveler.countryLabel,
      });
    }

    // Seed bookings
    for (const booking of demoExploreBookings) {
      await ctx.db.insert('experienceBookings', {
        travelerSlug: booking.travelerSlug,
        experienceSlug: booking.experienceSlug,
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

    const travelerProfiles = await ctx.db.query('travelerProfiles').collect();
    for (const travelerProfile of travelerProfiles) {
      await ctx.db.delete(travelerProfile._id);
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

    const stays = await ctx.db.query('stays').collect();
    for (const stay of stays) {
      await ctx.db.delete(stay._id);
    }

    const trips = await ctx.db.query('trips').collect();
    for (const trip of trips) {
      await ctx.db.delete(trip._id);
    }

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

    // Seed stays
    const stayProperties = [
      {
        slug: 'olive-grove-lofts',
        name: 'Olive Grove Lofts',
        locationLabel: 'Windhoek West',
        town: 'Windhoek',
        region: 'Khomas',
        coordinate: [17.0788, -22.5661],
        imageUri: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 148,
        currencyCode: 'USD',
        rating: 4.8,
        reviewCount: 214,
        stayStyle: 'design',
        routeVibe: 'city reset',
        sleepSignal: 'Good first or last night before a long drive.',
        summary: 'A calm, design-led base close to cafés, fuel stops, and an easy airport run.',
        idealFor: ['arrival night', 'remote work', 'short city reset'],
        amenities: ['fast wifi', 'breakfast', 'secure parking', 'late check-in'],
        nearbyHighlights: ['Independence Avenue', 'craft walk', 'coffee courtyard'],
        guestJournals: [
          {
            name: 'Marcus Thorne',
            avatarUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
            visitedAtLabel: 'Visited Oct 2023',
            quote: 'Good first or last night before a long drive. Waking up near Windhoek West changed the pacing of the whole route.',
          },
          {
            name: 'Lena Headey',
            avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
            visitedAtLabel: 'Visited Sep 2023',
            quote: 'Minimal, comfortable, and exactly where we needed it. The route fit mattered more than we expected.',
          },
        ],
        bookingNote: 'Best when you want a smooth city landing without overcommitting your first day.',
      },
      {
        slug: 'naankuse-bush-lodge',
        name: 'Naankuse Bush Lodge',
        locationLabel: 'Near Naankuse Reserve',
        town: 'Windhoek',
        region: 'Khomas',
        coordinate: [17.232, -22.434],
        imageUri: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 196,
        currencyCode: 'USD',
        rating: 4.7,
        reviewCount: 143,
        stayStyle: 'lodge',
        routeVibe: 'wildlife stop',
        sleepSignal: 'Smart if your trip opens with wildlife outside Windhoek.',
        summary: 'Bush-facing suites with enough comfort to feel restorative after a flight or reserve drive.',
        idealFor: ['wildlife day', 'quiet reset', 'couples'],
        amenities: ['pool', 'game-drive desk', 'parking', 'dinner service'],
        nearbyHighlights: ['reserve entrance', 'sunset deck', 'animal rehabilitation center'],
        bookingNote: 'Worth it when you want your first sleep to already feel like the trip has started.',
      },
      {
        slug: 'jetty-quarter-house',
        name: 'Jetty Quarter House',
        locationLabel: 'Swakopmund Jetty',
        town: 'Swakopmund',
        region: 'Erongo',
        coordinate: [14.5038, -22.6784],
        imageUri: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 182,
        currencyCode: 'USD',
        rating: 4.9,
        reviewCount: 321,
        stayStyle: 'design',
        routeVibe: 'coast base',
        sleepSignal: 'Best base for multiple Swakopmund activities without repacking.',
        summary: 'A polished coastal stay a short walk from the jetty, restaurants, and beach air after a driving day.',
        idealFor: ['2-3 night coast stop', 'food route', 'walkable base'],
        amenities: ['breakfast', 'ocean-view lounge', 'parking', 'laundry'],
        nearbyHighlights: ['Jetty district', 'old town', 'beach promenade'],
        bookingNote: 'A strong choice if your route stacks Swakopmund, dunes, and Walvis Bay together.',
      },
      {
        slug: 'lagoon-tide-suites',
        name: 'Lagoon Tide Suites',
        locationLabel: 'Walvis Bay Lagoon',
        town: 'Walvis Bay',
        region: 'Erongo',
        coordinate: [14.5062, -22.9551],
        imageUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 164,
        currencyCode: 'USD',
        rating: 4.6,
        reviewCount: 188,
        stayStyle: 'wellness',
        routeVibe: 'coast base',
        sleepSignal: 'Helpful when you want sunrise lagoon access before getting back on the road.',
        summary: 'Quiet lagoon-side suites with easy departures for Sandwich Harbour and coastal mornings.',
        idealFor: ['sunrise starts', 'lagoon kayaking', 'one-night stopover'],
        amenities: ['spa corner', 'secure parking', 'breakfast', 'airport transfer'],
        nearbyHighlights: ['lagoon boardwalk', 'flamingo lookout', 'harbour road'],
        bookingNote: 'Ideal if you prefer a calmer sleep than central Swakopmund.',
      },
      {
        slug: 'spitzkoppe-star-camp',
        name: 'Spitzkoppe Star Camp',
        locationLabel: 'Spitzkoppe Massif',
        town: 'Spitzkoppe',
        region: 'Erongo',
        coordinate: [15.1962, -21.8235],
        imageUri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 138,
        currencyCode: 'USD',
        rating: 4.8,
        reviewCount: 117,
        stayStyle: 'roadside',
        routeVibe: 'desert night',
        sleepSignal: 'A memorable overnight when you want the route itself to feel cinematic.',
        summary: 'Simple but unforgettable sleep under granite domes and exceptionally dark skies.',
        idealFor: ['stargazing', 'one-night route break', 'photography'],
        amenities: ['guided stargazing', 'braai area', 'parking', 'sunrise access'],
        nearbyHighlights: ['arch rock', 'sunset hill', 'night sky platform'],
        bookingNote: 'Less luxury, more atmosphere. Best when the trip needs one iconic overnight.',
      },
      {
        slug: 'damaraland-courtyard-lodge',
        name: 'Damaraland Courtyard Lodge',
        locationLabel: 'Near Twyfelfontein',
        town: 'Khorixas',
        region: 'Kunene',
        coordinate: [14.382, -20.5901],
        imageUri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 172,
        currencyCode: 'USD',
        rating: 4.7,
        reviewCount: 166,
        stayStyle: 'lodge',
        routeVibe: 'wildlife stop',
        sleepSignal: 'Useful when Damaraland becomes a real overnight, not just a pass-through.',
        summary: 'A grounded lodge for splitting the long coast-to-north drive and waking up close to the rock art circuit.',
        idealFor: ['self-drive pacing', 'heritage stop', '2-day northwest loop'],
        amenities: ['dinner service', 'parking', 'pool', 'guide desk'],
        nearbyHighlights: ['Twyfelfontein', 'desert elephant routes', 'rock formations'],
        bookingNote: 'Best for reducing fatigue on the northwest leg of the route.',
      },
      {
        slug: 'etosha-waterhole-lodge',
        name: 'Etosha Waterhole Lodge',
        locationLabel: 'Okaukuejo Gate Area',
        town: 'Etosha',
        region: 'Oshikoto',
        coordinate: [15.9061, -19.1799],
        imageUri: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1549366021-9f761d450615?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 224,
        currencyCode: 'USD',
        rating: 4.9,
        reviewCount: 402,
        stayStyle: 'lodge',
        routeVibe: 'wildlife stop',
        sleepSignal: 'The obvious move if your route includes an Etosha sunrise or late waterhole session.',
        summary: 'A high-confidence safari sleep with early gate access and enough comfort to recover between drives.',
        idealFor: ['safari nights', 'families', 'sunrise game drive'],
        amenities: ['pool', 'safari desk', 'breakfast', 'family rooms'],
        nearbyHighlights: ['Okaukuejo waterhole', 'gate road', 'wildlife briefing deck'],
        bookingNote: 'Strongest when Etosha is one of the trip anchors, not just a quick stop.',
      },
      {
        slug: 'sesriem-dune-house',
        name: 'Sesriem Dune House',
        locationLabel: 'Sesriem Gate',
        town: 'Sossusvlei',
        region: 'Hardap',
        coordinate: [15.349, -24.7312],
        imageUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 236,
        currencyCode: 'USD',
        rating: 4.8,
        reviewCount: 259,
        stayStyle: 'wellness',
        routeVibe: 'desert night',
        sleepSignal: 'Makes the early dune start actually doable and worth it.',
        summary: 'Minimal-luxury suites right where you want them for sunrise access and a slow desert evening.',
        idealFor: ['sunrise launch', 'honeymoon energy', 'one iconic splurge'],
        amenities: ['sunset deck', 'pool', 'breakfast packs', 'parking'],
        nearbyHighlights: ['Sesriem Gate', 'Deadvlei drive', 'sunset dune ridge'],
        bookingNote: 'High value if you want the desert light without a punishing wake-up from far away.',
      },
      {
        slug: 'namibrand-sky-lodge',
        name: 'NamibRand Sky Lodge',
        locationLabel: 'NamibRand Reserve',
        town: 'NamibRand',
        region: 'Hardap',
        coordinate: [16.1019, -25.0465],
        imageUri: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 268,
        currencyCode: 'USD',
        rating: 4.9,
        reviewCount: 145,
        stayStyle: 'wellness',
        routeVibe: 'desert night',
        sleepSignal: 'For a route segment that deserves a real dark-sky overnight.',
        summary: 'The most atmospheric sleep in the set: silent desert, star decks, and a long exhale after the road.',
        idealFor: ['dark sky stay', 'slow travel', 'post-Sossusvlei reset'],
        amenities: ['star deck', 'full board', 'guided astronomy', 'parking'],
        nearbyHighlights: ['dark sky reserve', 'sunset drive', 'dune plain'],
        bookingNote: 'Choose this when the overnight itself should be part of the story, not just logistics.',
      },
    ];

    for (const stay of stayProperties) {
      const regionId = stay.region ? regionMap.get(stay.region) : undefined;
      await ctx.db.insert('stays', { ...stay, regionId } as any);
    }

    // Seed users / travelers
    for (const traveler of demoExploreTravelers) {
      await ctx.db.insert('appUsers', {
        slug: traveler.slug,
        name: traveler.name,
        countryCode: traveler.countryCode,
        countryLabel: traveler.countryLabel,
      });
      await ctx.db.insert('travelerProfiles', {
        travelerSlug: traveler.slug,
        name: traveler.name,
        avatarUri: traveler.avatarUri,
        regionCode: traveler.countryCode,
        regionName: traveler.countryLabel,
      });
    }

    // Seed bookings
    for (const booking of demoExploreBookings) {
      await ctx.db.insert('experienceBookings', {
        travelerSlug: booking.travelerSlug,
        experienceSlug: booking.experienceSlug,
        bookedAt: Date.now(),
      });
    }

    return {
      deletedBookings: bookings.length,
      deletedUsers: users.length,
      deletedExperiences: experiences.length,
      deletedGems: gems.length,
      deletedRegions: regions.length,
      deletedStays: stays.length,
      deletedTrips: trips.length,
    };
  },
});
