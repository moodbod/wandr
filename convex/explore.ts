import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { recordAdminAuditEvent } from './adminAudit';
import { getPublicTravelerProfile } from './appProfiles';
import { assertCurrentTravelerSlug, requireAdmin } from './authHelpers';
import { getLiveCatalogPayload } from './catalog';

import type {
  ExploreActivityCard,
  ExploreExperience,
  ExploreFeatureDetail,
  ExploreFeatureHero,
  ExploreHiddenGem,
  ExploreMapMarker,
} from '../constants/explore-content';

const DEFAULT_EXPLORE_CENTER = [17.0832, -22.5597] as const;
const DEFAULT_EXPLORE_LOCATION_LABEL = 'Namibia';

type ExperienceDoc = Doc<'experiences'>;
type HiddenGemDoc = Doc<'gems'>;
type LocationDoc = Doc<'locations'>;
type CircleDoc = Doc<'circles'>;
type MemberDoc = Doc<'members'>;
type Coordinate = readonly [number, number];
type ExplorePlaceSummary = {
  countryCode?: string;
  countryLabel?: string;
  imageUri: string;
  kind: 'location' | 'experience' | 'hiddenGem' | 'stay';
  locationLabel: string;
  planningLocationId?: string;
  slug: string;
  title: string;
};

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

function isLiveContent(status?: 'draft' | 'live' | 'archived') {
  return status === undefined || status === 'live';
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

  const slug = item.slug ?? slugifyTitle(item.title);

  return {
    id: `${item.itemKind === 'location' ? 'location' : 'hidden-gem'}-${slug}`,
    coordinate: item.coordinate,
    experienceSlug: slug,
    imageUri: item.imageUri,
    itemKind: item.itemKind === 'location' ? 'location' : 'hiddenGem',
    label: item.title,
    tone: index % 2 === 0 ? 'dark' : 'accent',
  };
}

async function enrichExperiencesWithCommunity(
  ctx: QueryCtx,
  experiences: ExploreExperience[]
) {
  const enriched: ExploreExperience[] = [];

  for (const experience of experiences) {
    const bookings = await ctx.db
      .query('bookings')
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

async function resolveExplorePlace(
  ctx: QueryCtx | MutationCtx,
  slug: string,
  hiddenGemDocs?: HiddenGemDoc[]
): Promise<ExplorePlaceSummary | null> {
  const location = await ctx.db
    .query('locations')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();

  if (location && location.status === 'live') {
    return {
      countryCode: location.countryCode,
      countryLabel: location.countryLabel,
      imageUri: location.imageUri,
      kind: 'location',
      locationLabel: location.locationLabel,
      planningLocationId: location.planningLocationId,
      slug: location.slug,
      title: location.title,
    };
  }

  const experience = await ctx.db
    .query('experiences')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();

  if (experience && isLiveContent(experience.status)) {
    const normalized = toExploreExperience(experience);
    return {
      countryCode: normalized.countryCode,
      countryLabel: normalized.countryLabel,
      imageUri: normalized.imageUri,
      kind: normalized.itemKind === 'hiddenGem' ? 'hiddenGem' : 'experience',
      locationLabel: normalized.locationLabel ?? normalized.subtitle,
      planningLocationId: normalized.planningLocationId,
      slug: normalized.slug,
      title: normalized.title,
    };
  }

  const stay = await ctx.db
    .query('stays')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();

  if (stay && isLiveContent(stay.status)) {
    return {
      countryCode: stay.countryCode,
      countryLabel: stay.countryLabel,
      imageUri: stay.imageUri,
      kind: 'stay',
      locationLabel: stay.locationLabel,
      planningLocationId: stay.planningLocationId,
      slug: stay.slug,
      title: stay.name,
    };
  }

  const gems = hiddenGemDocs ?? (await ctx.db.query('gems').take(200));
  const gem = gems.find((item) => slugifyTitle(item.title) === slug);
  if (!gem) {
    return null;
  }

  const normalized = toExploreHiddenGem(gem);
  return {
    countryCode: normalized.countryCode,
    countryLabel: normalized.countryLabel,
    imageUri: normalized.imageUri,
    kind: 'hiddenGem',
    locationLabel: normalized.locationLabel ?? normalized.geography?.town ?? normalized.countryLabel ?? 'Hidden gem',
    planningLocationId: normalized.planningLocationId,
    slug,
    title: normalized.title,
  };
}

function toExploreLocation(doc: LocationDoc): ExploreHiddenGem {
  const coordinate = toCoordinate(doc.coordinate);
  const inferredCountry = getSupportedCountryMetadata(coordinate);

  return {
    slug: doc.slug,
    itemKind: 'location',
    title: doc.title,
    description: doc.description,
    imageUri: doc.imageUri,
    ...(doc.countryCode ?? inferredCountry.countryCode ? { countryCode: doc.countryCode ?? inferredCountry.countryCode } : {}),
    ...(doc.countryLabel ?? inferredCountry.countryLabel ? { countryLabel: doc.countryLabel ?? inferredCountry.countryLabel } : {}),
    ...(doc.planningLocationId ?? inferredCountry.planningLocationId
      ? { planningLocationId: doc.planningLocationId ?? inferredCountry.planningLocationId }
      : {}),
    ...(coordinate ? { coordinate } : {}),
    geography: { region: doc.region, ...(doc.town ? { town: doc.town } : {}) },
    badge: doc.badge ?? 'Location',
    locationLabel: doc.locationLabel,
    summary: doc.summary ?? doc.description,
    sections: doc.sections,
    sectionsTitle: doc.sectionsTitle,
    visitTips: doc.visitTips,
    primaryLabel: 'Add to trip',
    secondaryLabel: 'Back to map',
  };
}

async function getActiveCircleMembers(ctx: QueryCtx, circleId: Id<'circles'>): Promise<MemberDoc[]> {
  const members = await ctx.db
    .query('members')
    .withIndex('by_circleId', (q) => q.eq('circleId', circleId))
    .take(100);

  return members.filter((member) => member.status === 'active');
}

async function getCircleAvatarUris(ctx: QueryCtx, members: MemberDoc[]) {
  const profiles = await Promise.all(
    members.map((member) => getPublicTravelerProfile(ctx, member.travelerSlug))
  );

  return profiles
    .map((profile) => profile?.avatarUri)
    .filter((avatarUri): avatarUri is string => Boolean(avatarUri))
    .slice(0, 5);
}

async function getCurrentCircleMembership(
  ctx: QueryCtx | MutationCtx,
  circleId: Id<'circles'>,
  travelerSlug?: string
) {
  if (!travelerSlug) {
    return null;
  }

  return await ctx.db
    .query('members')
    .withIndex('by_circleId_and_travelerSlug', (q) =>
      q.eq('circleId', circleId).eq('travelerSlug', travelerSlug)
    )
    .unique();
}

async function getCircleTripBookings(ctx: QueryCtx | MutationCtx, circle: CircleDoc) {
  if (!circle.tripId) {
    return [];
  }

  return await ctx.db
    .query('bookings')
    .withIndex('by_tripId', (q) => q.eq('tripId', circle.tripId!))
    .order('desc')
    .take(50);
}

async function buildJoinableTripCard(
  ctx: QueryCtx,
  circle: CircleDoc,
  options: { experienceSlug?: string; hiddenGemDocs?: HiddenGemDoc[]; travelerSlug?: string }
) {
  if (circle.status !== 'active' || circle.visibility !== 'open' || !circle.tripId) {
    return null;
  }

  if (options.travelerSlug) {
    if (circle.createdBySlug === options.travelerSlug) {
      return null;
    }

    const membership = await getCurrentCircleMembership(ctx, circle._id, options.travelerSlug);
    if (membership) {
      return null;
    }
  }

  const [trip, bookings, host, members] = await Promise.all([
    ctx.db.get(circle.tripId),
    getCircleTripBookings(ctx, circle),
    getPublicTravelerProfile(ctx, circle.createdBySlug),
    getActiveCircleMembers(ctx, circle._id),
  ]);

  if (!trip) {
    return null;
  }

  const booking = options.experienceSlug
    ? bookings.find((candidate) => candidate.experienceSlug === options.experienceSlug)
    : bookings[0];

  if (!booking) {
    return null;
  }

  const place = await resolveExplorePlace(ctx, booking.experienceSlug, options.hiddenGemDocs);
  if (!place) {
    return null;
  }

  return {
    avatarUris: await getCircleAvatarUris(ctx, members),
    circleId: circle._id,
    countryCode: place.countryCode,
    countryLabel: place.countryLabel,
    destinationLabel: circle.destinationLabel,
    experienceImageUri: place.imageUri,
    experienceSlug: place.slug,
    experienceTitle: place.title,
    groupName: circle.name,
    hostName: host?.name ?? 'Traveler',
    locationLabel: place.locationLabel,
    memberCount: members.length,
    planningLocationId: place.planningLocationId,
    tripId: trip._id,
    tripName: trip.name,
  };
}

async function getExistingJoinRequest(ctx: QueryCtx | MutationCtx, circle: CircleDoc, travelerSlug: string) {
  const recentHostNotifications = await ctx.db
    .query('notices')
    .withIndex('by_recipientSlug_and_createdAt', (q) => q.eq('recipientSlug', circle.createdBySlug))
    .order('desc')
    .take(100);

  return recentHostNotifications.find(
    (notification) =>
      notification.kind === 'trip_join_request' &&
      notification.actorSlug === travelerSlug &&
      notification.entityId === circle._id &&
      notification.actionStatus !== 'approved' &&
      notification.actionStatus !== 'declined'
  );
}

export const getPageContent = query({
  args: {
    slug: v.string(),
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const catalog = await getLiveCatalogPayload(ctx);
    const baseExperiences = catalog.experiences
      .map((experience) => {
        const { coordinate, ...rest } = experience;
        return {
          ...rest,
          itemKind: 'experience' as const,
          ...(coordinate ? { coordinate } : {}),
        };
      });
    const experiences = (await enrichExperiencesWithCommunity(ctx, baseExperiences))
      .sort(compareExperiencesByPopularity);
    const gems = catalog.locations.map((location) => ({
      slug: location.slug,
      itemKind: 'location' as const,
      title: location.title,
      description: location.description,
      imageUri: location.imageUri,
      ...(location.countryCode ? { countryCode: location.countryCode } : {}),
      ...(location.countryLabel ? { countryLabel: location.countryLabel } : {}),
      ...(location.planningLocationId ? { planningLocationId: location.planningLocationId } : {}),
      ...(location.coordinate ? { coordinate: location.coordinate } : {}),
      geography: { region: location.region, ...(location.town ? { town: location.town } : {}) },
      badge: location.badge,
      locationLabel: location.locationLabel,
      summary: location.summary,
      sections: location.sections,
      sectionsTitle: location.sectionsTitle,
      visitTips: location.visitTips,
      primaryLabel: 'Add to trip',
      secondaryLabel: 'Back to map',
    } satisfies ExploreHiddenGem));
    const featuredExperience =
      experiences.find((experience) => experience.itemKind === 'experience') ?? experiences[0] ?? null;
    const centerCoordinate =
      featuredExperience?.coordinate ??
      gems.find((item) => item.coordinate)?.coordinate ??
      DEFAULT_EXPLORE_CENTER;
    const markers = [
      ...experiences.map(toExperienceMapMarker),
      ...gems.map(toHiddenGemMapMarker),
      ...catalog.stays
        .filter((stay) => stay.coordinate)
        .map((stay, index) => ({
          id: `stay-${stay.slug}`,
          coordinate: stay.coordinate!,
          experienceSlug: stay.slug,
          imageUri: stay.imageUri,
          itemKind: 'stay' as const,
          label: stay.name,
          priceLabel: stay.priceLabel,
          tone: index % 2 === 0 ? ('accent' as const) : ('dark' as const),
        })),
    ].filter((marker): marker is ExploreMapMarker => Boolean(marker));
    const updatedAt = catalog.updatedAt;

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
          description: 'Search admin-curated locations, experiences, stays, and open group plans.',
          tags: ['Locations', 'Experiences', 'Stays'],
          searchPlaceholder: 'Search by place, activity, or mood',
        },
        featured: {
          hero: toFeatureHero(featuredExperience),
          detail: toFeatureDetail(featuredExperience),
        },
        gems: {
          title: 'Locations',
          ctaLabel: 'View all',
          items: gems,
        },
        map: {
          title: 'Explore map',
          description: 'Browse live admin-curated locations, experiences, and stays.',
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
      .take(100);
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
      status: 'draft',
      createdByAdminSlug: manager.slug,
      updatedByAdminSlug: manager.slug,
    });
    await recordAdminAuditEvent(ctx, {
      actor: manager,
      action: 'content.create',
      targetKind: 'experience',
      targetId: slug,
      targetLabel: args.title,
      summary: 'Created experience draft.',
    });
    return { slug };
  },
});

export const getExploreJoinableTripCards = query({
  args: {
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const [circles, hiddenGemDocs] = await Promise.all([
      ctx.db
        .query('circles')
        .order('desc')
        .take(100),
      ctx.db.query('gems').take(200),
    ]);

    const resolved = await Promise.all(
      circles.map((circle) =>
        buildJoinableTripCard(ctx, circle, {
          hiddenGemDocs,
          travelerSlug: args.travelerSlug,
        })
      )
    );

    return resolved.filter((card): card is NonNullable<typeof card> => Boolean(card));
  },
});

export const getExploreJoinableTrips = query({
  args: {
    travelerSlug: v.optional(v.string()),
    experienceSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const [circles, hiddenGemDocs] = await Promise.all([
      ctx.db
        .query('circles')
        .order('desc')
        .take(100),
      ctx.db.query('gems').take(200),
    ]);
    const resolved = await Promise.all(
      circles.map((circle) =>
        buildJoinableTripCard(ctx, circle, {
          experienceSlug: args.experienceSlug,
          hiddenGemDocs,
          travelerSlug: args.travelerSlug,
        })
      )
    );

    return resolved
      .filter((card): card is NonNullable<typeof card> => Boolean(card))
      .map((card) => ({
        circleId: card.circleId,
        tripId: card.tripId,
        tripName: card.tripName,
        groupName: card.groupName,
        hostName: card.hostName,
        destinationLabel: card.destinationLabel,
        memberCount: card.memberCount,
        avatarUris: card.avatarUris,
      }));
  },
});

export const getExploreGroupTripDetail = query({
  args: {
    circleId: v.id('circles'),
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const circle = await ctx.db.get(args.circleId);
    if (!circle || circle.status !== 'active' || circle.visibility !== 'open' || !circle.tripId) {
      return null;
    }

    const [trip, host, members, bookings, hiddenGemDocs, membership, pendingRequest] = await Promise.all([
      ctx.db.get(circle.tripId),
      getPublicTravelerProfile(ctx, circle.createdBySlug),
      getActiveCircleMembers(ctx, circle._id),
      getCircleTripBookings(ctx, circle),
      ctx.db.query('gems').take(200),
      getCurrentCircleMembership(ctx, circle._id, args.travelerSlug),
      args.travelerSlug ? getExistingJoinRequest(ctx, circle, args.travelerSlug) : Promise.resolve(null),
    ]);

    if (!trip) {
      return null;
    }

    const resolvedItinerary = await Promise.all(
      bookings.map(async (booking) => {
        const place = await resolveExplorePlace(ctx, booking.experienceSlug, hiddenGemDocs);
        if (!place) {
          return null;
        }

        return {
          bookingId: booking._id,
          experienceSlug: place.slug,
          title: place.title,
          locationLabel: place.locationLabel,
          imageUri: place.imageUri,
          bookedAt: booking.bookedAt,
        };
      })
    );
    const itinerary = resolvedItinerary.filter((item): item is NonNullable<typeof item> => Boolean(item));
    const primaryStop = itinerary[0] ?? null;
    const avatarUris = await getCircleAvatarUris(ctx, members);

    return {
      circleId: circle._id,
      groupName: circle.name,
      tripName: trip.name,
      hostName: host?.name ?? 'Traveler',
      destinationLabel: circle.destinationLabel,
      memberCount: members.length,
      avatarUris,
      heroImageUri: primaryStop?.imageUri ?? host?.avatarUri ?? '',
      locationLabel: primaryStop?.locationLabel ?? circle.destinationLabel,
      summary:
        itinerary.length > 0
          ? `${circle.name} has ${itinerary.length} planned stop${itinerary.length === 1 ? '' : 's'} around ${circle.destinationLabel}.`
          : `${circle.name} is still building its itinerary around ${circle.destinationLabel}.`,
      isMember: Boolean(membership && membership.status === 'active'),
      hasRequested: Boolean(pendingRequest),
      itinerary,
    };
  },
});

export const requestJoinExploreTrip = mutation({
  args: {
    travelerSlug: v.string(),
    circleId: v.id('circles'),
    experienceSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const circle = await ctx.db.get(args.circleId);
    if (
      !circle ||
      circle.status !== 'active' ||
      circle.visibility !== 'open' ||
      !circle.tripId ||
      circle.createdBySlug === travelerSlug
    ) {
      return false;
    }

    const membership = await getCurrentCircleMembership(ctx, circle._id, travelerSlug);
    if (membership) {
      return membership.status === 'active' || membership.status === 'invited';
    }

    const bookings = await getCircleTripBookings(ctx, circle);
    const hasRequestedExperience = bookings.some((booking) => booking.experienceSlug === args.experienceSlug);
    if (!hasRequestedExperience) {
      return false;
    }

    const existingRequest = await getExistingJoinRequest(ctx, circle, travelerSlug);
    if (existingRequest) {
      return true;
    }

    const traveler = await getPublicTravelerProfile(ctx, travelerSlug);
    await ctx.db.insert('notices', {
      recipientSlug: circle.createdBySlug,
      actorSlug: travelerSlug,
      kind: 'trip_join_request',
      title: `${traveler?.name ?? 'A traveler'} wants to join ${circle.name}`,
      body: `Approve this request to add them to ${circle.name}.`,
      href: '/notifications',
      entityId: circle._id,
      entityLabel: circle.name,
      actionStatus: 'pending',
      createdAt: Date.now(),
    });

    return true;
  },
});

export const getLocationLikeState = query({
  args: {
    travelerSlug: v.string(),
    locationKind: v.union(v.literal('location'), v.literal('experience'), v.literal('hiddenGem')),
    locationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const like = await ctx.db
      .query('likes')
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
    locationKind: v.union(v.literal('location'), v.literal('experience'), v.literal('hiddenGem')),
    locationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const existing = await ctx.db
      .query('likes')
      .withIndex('by_travelerSlug_and_locationKind_and_locationSlug', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('locationKind', args.locationKind).eq('locationSlug', args.locationSlug)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    } else {
      await ctx.db.insert('likes', {
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
      .query('likes')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
      .take(100);
    const hiddenGemDocs = await ctx.db.query('gems').take(200);
    const resolved = await Promise.all(
      likes.map(async (like) => {
        const place = await resolveExplorePlace(ctx, like.locationSlug, hiddenGemDocs);
        if (!place) {
          return null;
        }

        return {
          _id: like._id,
          slug: place.slug,
          title: place.title,
          subtitle: place.locationLabel,
          imageUri: place.imageUri || null,
          createdAt: like.likedAt,
          kind: place.kind,
        };
      })
    );

    return resolved
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const addExperienceToTrip = mutation({
  args: {
    experienceSlug: v.string(),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const place = await resolveExplorePlace(ctx, args.experienceSlug);
    if (!place) {
      throw new Error('Experience not found');
    }

    const traveler = await ctx.db
      .query('users')
      .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
      .unique();

    if (!traveler) {
      throw new Error('Traveler not found');
    }

    const existingBooking = await ctx.db
      .query('bookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('experienceSlug', args.experienceSlug)
      )
      .take(20);

    const matchingBooking = existingBooking.find(
      (candidate) => candidate.experienceSlug === args.experienceSlug
    );

    if (matchingBooking) {
      return matchingBooking._id;
    }

    return await ctx.db.insert('bookings', {
      experienceSlug: args.experienceSlug,
      travelerSlug,
      bookedAt: Date.now(),
    });
  },
});
