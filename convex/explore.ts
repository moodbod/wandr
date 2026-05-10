import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { getPublicTravelerProfile } from './appProfiles';
import { assertCurrentTravelerSlug, requireAdmin } from './authHelpers';

import type {
  ExploreActivityCard,
  ExploreExperience,
  ExploreFeatureDetail,
  ExploreFeatureHero,
  ExploreHiddenGem,
  ExploreMapMarker,
} from '../constants/explore-content';

const TRENDING_PLACE_LIMIT = 10;
const DEFAULT_EXPLORE_CENTER = [17.0832, -22.5597] as const;
const DEFAULT_EXPLORE_LOCATION_LABEL = 'Namibia';

type ExperienceDoc = Doc<'experiences'>;
type HiddenGemDoc = Doc<'hiddenGems'>;
type Coordinate = readonly [number, number];

function toCoordinate(coordinate?: readonly number[]): Coordinate | null {
  if (!coordinate || coordinate.length < 2) {
    return null;
  }

  return [coordinate[0], coordinate[1]];
}

function getSupportedCountryMetadata(
  coordinate: Coordinate | null
): { countryCode?: string; countryLabel?: string; planningLocationId?: string } {
  if (!coordinate) {
    return {};
  }

  const [lng, lat] = coordinate;

  if (lng >= 11.7 && lng <= 25.3 && lat >= -29.2 && lat <= -16.8) {
    return {
      countryCode: 'NA',
      countryLabel: 'Namibia',
      planningLocationId: 'namibia',
    };
  }

  if (lng >= 17.6 && lng <= 20.2 && lat >= -34.9 && lat <= -32.6) {
    return {
      countryCode: 'ZA',
      countryLabel: 'South Africa',
      planningLocationId: 'south-africa',
    };
  }

  return {};
}

function getExperienceLocationLabel(doc: ExperienceDoc) {
  return doc.locationLabel ?? doc.geography?.town ?? doc.geography?.region ?? doc.countryLabel;
}

function toExploreExperience(doc: ExperienceDoc): ExploreExperience {
  const coordinate = toCoordinate(doc.coordinate);
  const inferredCountry = getSupportedCountryMetadata(coordinate);
  const locationLabel = getExperienceLocationLabel(doc) ?? inferredCountry.countryLabel;

  return {
    slug: doc.slug,
    badge: doc.badge,
    ctaLabel: doc.ctaLabel,
    title: doc.title,
    subtitle: doc.subtitle,
    description: doc.description,
    imageUri: doc.imageUri,
    price: doc.price,
    priceSuffix: doc.priceSuffix,
    includes: doc.includes,
    ...(doc.itemKind ? { itemKind: doc.itemKind } : {}),
    ...(doc.badgeTone ? { badgeTone: doc.badgeTone } : {}),
    ...(doc.category ? { category: doc.category } : {}),
    ...(doc.reviewCount ? { reviewCount: doc.reviewCount } : {}),
    ...(doc.countryCode ?? inferredCountry.countryCode ? { countryCode: doc.countryCode ?? inferredCountry.countryCode } : {}),
    ...(doc.countryLabel ?? inferredCountry.countryLabel ? { countryLabel: doc.countryLabel ?? inferredCountry.countryLabel } : {}),
    ...(doc.planningLocationId ?? inferredCountry.planningLocationId
      ? { planningLocationId: doc.planningLocationId ?? inferredCountry.planningLocationId }
      : {}),
    ...(coordinate ? { coordinate } : {}),
    ...(doc.geography ? { geography: doc.geography } : {}),
    ...(locationLabel ? { locationLabel } : {}),
    ...(doc.durationLabel ? { durationLabel: doc.durationLabel } : {}),
    ...(doc.groupSizeLabel ? { groupSizeLabel: doc.groupSizeLabel } : {}),
    ...(doc.tripFit ? { tripFit: doc.tripFit } : {}),
    ...(doc.sections ? { sections: doc.sections } : {}),
    ...(doc.summary ? { summary: doc.summary } : {}),
    ...(doc.visitTips ? { visitTips: doc.visitTips } : {}),
    ...(doc.primaryLabel ? { primaryLabel: doc.primaryLabel } : {}),
    ...(doc.secondaryLabel ? { secondaryLabel: doc.secondaryLabel } : {}),
    ...(doc.galleryImages ? { galleryImages: doc.galleryImages } : {}),
    ...(doc.travelerMomentum ? { travelerMomentum: doc.travelerMomentum } : {}),
    ...(doc.booking ? { booking: doc.booking } : {}),
  };
}

function toExploreHiddenGem(doc: HiddenGemDoc): ExploreHiddenGem {
  const coordinate = toCoordinate(doc.coordinate);
  const inferredCountry = getSupportedCountryMetadata(coordinate);

  return {
    title: doc.title,
    description: doc.description,
    imageUri: doc.imageUri,
    ...(doc.countryCode ?? inferredCountry.countryCode ? { countryCode: doc.countryCode ?? inferredCountry.countryCode } : {}),
    ...(doc.countryLabel ?? inferredCountry.countryLabel ? { countryLabel: doc.countryLabel ?? inferredCountry.countryLabel } : {}),
    ...(doc.planningLocationId ?? inferredCountry.planningLocationId
      ? { planningLocationId: doc.planningLocationId ?? inferredCountry.planningLocationId }
      : {}),
    ...(coordinate ? { coordinate } : {}),
    ...(doc.geography ? { geography: doc.geography } : {}),
    ...(doc.badge ? { badge: doc.badge } : {}),
    ...(doc.locationLabel ? { locationLabel: doc.locationLabel } : {}),
    ...(doc.summary ? { summary: doc.summary } : {}),
    ...(doc.tripFit ? { tripFit: doc.tripFit } : {}),
    ...(doc.sections ? { sections: doc.sections } : {}),
    ...(doc.sectionsTitle ? { sectionsTitle: doc.sectionsTitle } : {}),
    ...(doc.visitTips ? { visitTips: doc.visitTips } : {}),
    ...(doc.primaryLabel ? { primaryLabel: doc.primaryLabel } : {}),
    ...(doc.secondaryLabel ? { secondaryLabel: doc.secondaryLabel } : {}),
  };
}

function getExperiencePopularityCount(experience: ExploreExperience) {
  return Math.max(
    experience.travelerMomentum?.visitorCount ?? 0,
    experience.reviewCount ?? 0
  );
}

function compareExperiencesByPopularity(a: ExploreExperience, b: ExploreExperience) {
  const popularityDelta = getExperiencePopularityCount(b) - getExperiencePopularityCount(a);

  if (popularityDelta !== 0) {
    return popularityDelta;
  }

  return a.title.localeCompare(b.title);
}

function toActivityCard(experience: ExploreExperience): ExploreActivityCard {
  const visitorCount = getExperiencePopularityCount(experience);

  return {
    badge: experience.badge,
    ctaLabel: experience.ctaLabel,
    experienceSlug: experience.slug,
    imageUri: experience.imageUri,
    price: experience.price,
    priceSuffix: experience.priceSuffix,
    subtitle: experience.locationLabel ?? experience.subtitle,
    title: experience.title,
    ...(experience.badgeTone ? { badgeTone: experience.badgeTone } : {}),
    ...(visitorCount ? { visitorCount } : {}),
    ...(experience.countryLabel ?? experience.locationLabel
      ? { countryLabel: experience.countryLabel ?? experience.locationLabel }
      : {}),
    ...(experience.travelerMomentum?.avatarUris ? { avatarUris: [...experience.travelerMomentum.avatarUris] } : {}),
  };
}

function toFeatureHero(experience: ExploreExperience | null): ExploreFeatureHero {
  if (!experience) {
    return {
      experienceSlug: '',
      badge: 'Explore',
      title: 'Explore Namibia',
      description: 'Fresh experiences will appear here when managers add them.',
      imageUri: '',
      ctaLabel: 'Explore',
    };
  }

  return {
    experienceSlug: experience.slug,
    badge: experience.badge,
    title: experience.title,
    description: experience.summary ?? experience.description,
    imageUri: experience.imageUri,
    ctaLabel: experience.ctaLabel,
  };
}

function toFeatureDetail(experience: ExploreExperience | null): ExploreFeatureDetail {
  if (!experience) {
    return {
      experienceSlug: '',
      category: 'Explore',
      title: 'No experiences yet',
      description: 'Create a manager draft to publish the first explore item.',
      price: '',
      priceSuffix: '',
      imageUri: '',
      ctaLabel: 'Create',
    };
  }

  return {
    experienceSlug: experience.slug,
    category: experience.category ?? 'Experience',
    title: experience.title,
    description: experience.subtitle,
    price: experience.price,
    priceSuffix: experience.priceSuffix,
    imageUri: experience.galleryImages?.[1] ?? experience.imageUri,
    ctaLabel: experience.ctaLabel,
  };
}

function toExperienceMapMarker(
  experience: ExploreExperience,
  index: number
): ExploreMapMarker | null {
  if (!experience.coordinate) {
    return null;
  }

  return {
    id: experience.slug,
    coordinate: experience.coordinate,
    experienceSlug: experience.slug,
    imageUri: experience.imageUri,
    itemKind: experience.itemKind ?? 'experience',
    label: experience.title,
    priceLabel: experience.price,
    popularityScore: getExperiencePopularityCount(experience),
    tone: index % 2 === 0 ? 'accent' : 'dark',
  };
}

function slugifyTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toHiddenGemMapMarker(item: ExploreHiddenGem, index: number): ExploreMapMarker | null {
  if (!item.coordinate) {
    return null;
  }

  const slug = slugifyTitle(item.title);

  return {
    id: `hidden-gem-${slug}`,
    coordinate: item.coordinate,
    experienceSlug: slug,
    imageUri: item.imageUri,
    itemKind: 'hiddenGem',
    label: item.title,
    tone: index % 2 === 0 ? 'dark' : 'accent',
  };
}

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
      { avatarUris: string[]; countryCode: string; countryLabel: string; visitorCount: number }
    >();

    for (const booking of bookings) {
      const traveler = await getPublicTravelerProfile(ctx, booking.travelerSlug);

      if (!traveler) {
        continue;
      }

      const countryCode = traveler.countryCode ?? 'NA';
      const countryLabel = traveler.countryLabel ?? 'Unknown';
      const key = `${countryCode}:${countryLabel}`;
      const existing = countryCounts.get(key);

      if (existing) {
        existing.visitorCount += 1;
        if (traveler.avatarUri && !existing.avatarUris.includes(traveler.avatarUri)) {
          existing.avatarUris.push(traveler.avatarUri);
        }
      } else {
        countryCounts.set(key, {
          avatarUris: traveler.avatarUri ? [traveler.avatarUri] : [],
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
        avatarUris: topCountry.avatarUris.slice(0, 5),
        summary: `${topCountry.visitorCount} traveler${topCountry.visitorCount === 1 ? '' : 's'} from ${topCountry.countryLabel} booked this experience in the app.`,
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
    const [experienceDocs, hiddenGemDocs] = await Promise.all([
      ctx.db.query('experiences').collect(),
      ctx.db.query('hiddenGems').collect(),
    ]);
    const baseExperiences = experienceDocs
      .sort((a, b) => b._creationTime - a._creationTime)
      .map(toExploreExperience);
    const experiences = (await enrichExperiencesWithCommunity(ctx, baseExperiences))
      .sort(compareExperiencesByPopularity);
    const hiddenGems = hiddenGemDocs
      .sort((a, b) => b._creationTime - a._creationTime)
      .map(toExploreHiddenGem);
    const featuredExperience =
      experiences.find((experience) => experience.itemKind !== 'hiddenGem') ??
      experiences[0] ??
      null;
    const centerCoordinate =
      featuredExperience?.coordinate ??
      hiddenGems.find((item) => item.coordinate)?.coordinate ??
      DEFAULT_EXPLORE_CENTER;
    const markers = [
      ...experiences.map(toExperienceMapMarker),
      ...hiddenGems.map(toHiddenGemMapMarker),
    ].filter((marker): marker is ExploreMapMarker => Boolean(marker));
    const updatedAt = Math.max(
      0,
      ...experienceDocs.map((doc) => doc._creationTime),
      ...hiddenGemDocs.map((doc) => doc._creationTime)
    );

    return {
      slug: args.slug,
      home: {
        hero: {
          title: 'Explore nearby plans',
          locationLabel: featuredExperience?.locationLabel ?? DEFAULT_EXPLORE_LOCATION_LABEL,
          centerCoordinate,
          markers,
        },
        section: {
          eyebrow: 'Explore',
          title: 'Places worth planning around',
        },
        activities: experiences.map(toActivityCard),
      },
      search: {
        intro: {
          title: 'Find your next stop',
          description: 'Search experiences, hidden gems, and open group plans.',
          tags: ['Experiences', 'Hidden gems', 'Open groups'],
          searchPlaceholder: 'Search by place, activity, or mood',
        },
        featured: {
          hero: toFeatureHero(featuredExperience),
          detail: toFeatureDetail(featuredExperience),
        },
        hiddenGems: {
          title: 'Hidden gems',
          ctaLabel: 'View all',
          items: hiddenGems,
        },
        map: {
          title: 'Explore map',
          description: 'Browse saved experiences and hidden gems around your selected location.',
          ctaLabel: 'Open map',
          centerCoordinate,
          markers,
        },
      },
      experiences,
      updatedAt,
    };
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
    groupCapacity: v.number(),
    priceUsd: v.number(),
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
      groupSizeLabel: `Up to ${args.groupCapacity} guests`,
      price: `$${args.priceUsd}`,
      priceSuffix: 'per person',
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
