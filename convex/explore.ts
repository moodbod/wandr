import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';
import type { QueryCtx } from './_generated/server';

import type { ExploreExperience } from '../constants/explore-content';
import { defaultExplorePageSeed, demoExploreBookings, demoExploreTravelers } from './seedData';

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

const pageContentValidator = v.object({
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
  experiences: v.array(experienceValidator),
});

function deriveFallbackExperiences(page: {
  home: {
    hero: {
      locationLabel: string;
      markers: Array<{
        id: string;
        coordinate: readonly [number, number];
      }>;
    };
    activities: Array<{
      experienceSlug?: string;
      badge: string;
      badgeTone?: 'accent' | 'soft';
      ctaLabel: string;
      imageUri: string;
      price: string;
      priceSuffix: string;
      subtitle: string;
      title: string;
    }>;
  };
  search: {
    featured: {
      hero: {
        experienceSlug?: string;
        badge: string;
        title: string;
        description: string;
        imageUri: string;
        ctaLabel?: string;
      };
      detail: {
        experienceSlug?: string;
        category: string;
        title: string;
        description: string;
        price: string;
        priceSuffix: string;
        imageUri: string;
        ctaLabel?: string;
      };
    };
  };
  experiences?: ExploreExperience[];
}): ExploreExperience[] {
  if (page.experiences && page.experiences.length > 0) {
    return page.experiences;
  }

  const seededActivitiesByTitle = new Map<string, string>(
    defaultExplorePageSeed.content.home.activities.map((activity) => [activity.title, activity.experienceSlug])
  );
  const slugifyTitle = (title: string) =>
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const resolveActivitySlug = (activity: (typeof page.home.activities)[number]) =>
    activity.experienceSlug ?? seededActivitiesByTitle.get(activity.title) ?? slugifyTitle(activity.title);

  const mappedFromHome = page.home.activities.map<ExploreExperience>((activity) => ({
    slug: resolveActivitySlug(activity),
    badge: activity.badge,
    badgeTone: activity.badgeTone,
    ctaLabel: activity.ctaLabel,
    title: activity.title,
    subtitle: activity.subtitle,
    description: activity.subtitle,
    imageUri: activity.imageUri,
    price: activity.price,
    priceSuffix: activity.priceSuffix,
    coordinate: page.home.hero.markers.find((marker) => marker.id === resolveActivitySlug(activity))?.coordinate,
    geography: { region: 'Erongo', town: 'Swakopmund' },
    locationLabel: page.home.hero.locationLabel,
    tripFit: [],
    includes: [],
  }));

  const featuredHero = page.search.featured.hero;
  const featuredDetail = page.search.featured.detail;
  const heroSlug = featuredHero.experienceSlug ?? slugifyTitle(featuredHero.title);
  const detailSlug = featuredDetail.experienceSlug ?? slugifyTitle(featuredDetail.title);

  const seen = new Set(mappedFromHome.map((item) => item.slug));
  const result = [...mappedFromHome];

  if (!seen.has(heroSlug)) {
    result.push({
      slug: heroSlug,
      badge: featuredHero.badge,
      ctaLabel: featuredHero.ctaLabel ?? 'Book Experience',
      title: featuredHero.title,
      subtitle: featuredHero.description,
      description: featuredHero.description,
      imageUri: featuredHero.imageUri,
      price: '',
      priceSuffix: '',
      geography: { region: 'Erongo', town: 'Swakopmund' },
      locationLabel: page.home.hero.locationLabel,
      tripFit: [],
      includes: [],
    });
  }

  if (!seen.has(detailSlug)) {
    result.push({
      slug: detailSlug,
      badge: featuredDetail.category,
      ctaLabel: featuredDetail.ctaLabel ?? 'Book Experience',
      title: featuredDetail.title,
      subtitle: featuredDetail.description,
      description: featuredDetail.description,
      imageUri: featuredDetail.imageUri,
      price: featuredDetail.price,
      priceSuffix: featuredDetail.priceSuffix,
      category: featuredDetail.category,
      geography: { region: 'Erongo', town: 'Swakopmund' },
      locationLabel: page.home.hero.locationLabel,
      tripFit: [],
      includes: [],
    });
  }

  return result;
}

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

export const getPageContent = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('explorePages')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    if (!page) {
      return null;
    }

    const experiences = await enrichExperiencesWithCommunity(
      ctx,
      deriveFallbackExperiences(page)
    );

    return {
      slug: page.slug,
      home: page.home,
      search: page.search,
      experiences,
      updatedAt: page.updatedAt,
    };
  },
});

export const upsertPageContent = mutationGeneric({
  args: {
    slug: v.string(),
    content: pageContentValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('explorePages')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    const value = {
      slug: args.slug,
      home: args.content.home,
      search: args.content.search,
      experiences: args.content.experiences,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }

    return await ctx.db.insert('explorePages', value);
  },
});

export const seedDefaultPageContent = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query('explorePages')
      .withIndex('by_slug', (q) => q.eq('slug', defaultExplorePageSeed.slug))
      .unique();

    const value = {
      slug: defaultExplorePageSeed.slug,
      home: defaultExplorePageSeed.content.home,
      search: defaultExplorePageSeed.content.search,
      experiences: defaultExplorePageSeed.content.experiences,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }

    return await ctx.db.insert('explorePages', value);
  },
});

export const ensureExploreCommunitySeed = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    for (const traveler of demoExploreTravelers) {
      const existingTraveler = await ctx.db
        .query('appUsers')
        .withIndex('by_slug', (q) => q.eq('slug', traveler.slug))
        .unique();

      if (!existingTraveler) {
        await ctx.db.insert('appUsers', traveler);
      } else {
        await ctx.db.patch(existingTraveler._id, traveler);
      }
    }

    for (const booking of demoExploreBookings) {
      const existingBooking = await ctx.db
        .query('experienceBookings')
        .withIndex('by_travelerSlug_and_experienceSlug', (q) =>
          q.eq('travelerSlug', booking.travelerSlug)
        )
        .filter((q) => q.eq(q.field('experienceSlug'), booking.experienceSlug))
        .unique();

      if (!existingBooking) {
        await ctx.db.insert('experienceBookings', {
          ...booking,
          bookedAt: Date.now(),
        });
      }
    }

    return true;
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
      .filter((q) => q.eq(q.field('experienceSlug'), args.experienceSlug))
      .unique();

    if (existingBooking) {
      return existingBooking._id;
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

    const pages = await ctx.db.query('explorePages').collect();
    for (const page of pages) {
      await ctx.db.delete(page._id);
    }

    return {
      deletedBookings: bookings.length,
      deletedUsers: users.length,
      deletedPages: pages.length,
    };
  },
});
