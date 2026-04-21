import { queryGeneric } from 'convex/server';
import { v } from 'convex/values';
import type { QueryCtx } from './_generated/server';

import type { ExploreExperience } from '../constants/explore-content';

type TripItineraryItem = {
  _id: string;
  _creationTime: number;
  experienceSlug: string;
  travelerSlug: string;
  bookedAt: number;
  experience: ExploreExperience;
};

const DEMO_TRAVELER_SLUG = 'local-demo-traveler';

function isCoordinate(value: readonly number[] | undefined): value is readonly [number, number] {
  return Array.isArray(value) && value.length === 2;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceInKm(from: readonly [number, number], to: readonly [number, number]) {
  const earthRadiusKm = 6371;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getOrderedRouteStops(
  itinerary: TripItineraryItem[],
  origin: readonly [number, number]
) {
  const withCoordinates = itinerary.filter(
    (item): item is TripItineraryItem & { experience: ExploreExperience & { coordinate: readonly [number, number] } } =>
      isCoordinate(item.experience.coordinate)
  );
  const withoutCoordinates = itinerary.filter((item) => !isCoordinate(item.experience.coordinate));

  const remaining = [...withCoordinates];
  const ordered: TripItineraryItem[] = [];
  let currentPoint = origin;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = getDistanceInKm(currentPoint, remaining[0].experience.coordinate);

    for (let index = 1; index < remaining.length; index += 1) {
      const distance = getDistanceInKm(currentPoint, remaining[index].experience.coordinate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [nextStop] = remaining.splice(nearestIndex, 1);
    ordered.push(nextStop);
    currentPoint = nextStop.experience.coordinate;
  }

  return [...ordered, ...withoutCoordinates.sort((a, b) => a.bookedAt - b.bookedAt)];
}

function buildDayTitle(locationLabel?: string) {
  if (!locationLabel) {
    return 'Trip Day';
  }

  const firstSegment = locationLabel.split(',')[0]?.trim() ?? locationLabel;
  const firstWord = firstSegment.split(/\s+/)[0]?.trim();

  if (!firstWord) {
    return 'Trip Day';
  }

  return `${firstWord} Day`;
}

async function getResolvedItinerary(ctx: QueryCtx, travelerSlug: string): Promise<TripItineraryItem[]> {
  const bookings = await ctx.db
    .query('experienceBookings')
    .withIndex('by_travelerSlug_and_experienceSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .collect();

  const allExperiences = await ctx.db.query('experiences').collect();

  if (allExperiences.length === 0) {
    return [];
  }

  if (travelerSlug === DEMO_TRAVELER_SLUG) {
    const bookedExperienceSlugs = new Set(bookings.map((booking) => booking.experienceSlug));
    const bookedItinerary = bookings
      .map<TripItineraryItem | null>((booking) => {
        const experience = allExperiences.find((item) => item.slug === booking.experienceSlug);

        if (!experience) {
          return null;
        }

        return {
          ...booking,
          experience: experience as ExploreExperience,
        };
      })
      .filter((item): item is TripItineraryItem => item !== null);

    const unbookedServerExperiences = allExperiences.filter(
      (experience) => !bookedExperienceSlugs.has(experience.slug)
    );

    const demoItinerary = [
      ...bookedItinerary,
      ...unbookedServerExperiences.map((experience, index) => ({
        _id: `demo-trip-item-${experience.slug}`,
        _creationTime: index,
        experienceSlug: experience.slug,
        travelerSlug,
        bookedAt: bookedItinerary.length + index,
        experience: experience as ExploreExperience,
      })),
    ];

    if (demoItinerary.length === 0) {
      return [];
    }

    const origin = [17.0832, -22.5609] as const;

    return getOrderedRouteStops(demoItinerary, origin);
  }

  if (bookings.length === 0) {
    return [];
  }

  const resolvedItinerary = bookings
    .map<TripItineraryItem | null>((booking) => {
      const experience = allExperiences.find((item) => item.slug === booking.experienceSlug);

      if (!experience) {
        return null;
      }

      return {
        ...booking,
        experience: experience as ExploreExperience,
      };
    })
    .filter((item): item is TripItineraryItem => item !== null);

  const origin = [17.0832, -22.5609] as const;

  return getOrderedRouteStops(resolvedItinerary, origin);
}

export const getUserItinerary = queryGeneric({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    return await getResolvedItinerary(ctx, args.travelerSlug);
  },
});

export const getTripDashboard = queryGeneric({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const itinerary = await getResolvedItinerary(ctx, args.travelerSlug);

    const activeIndex = itinerary.length > 0 ? 0 : -1;
    const completedCount = 0;
    const progressPercentage =
      itinerary.length > 0 ? Math.round((completedCount / itinerary.length) * 100) : 0;

    const activeItem = activeIndex >= 0 ? itinerary[activeIndex] : null;
    const baseLocationLabel =
      activeItem?.experience.locationLabel ?? 'Windhoek, NA';
    const centerCoordinate =
      activeItem?.experience.coordinate ??
      ([17.0832, -22.5609] as const);

    return {
      dayTitle: buildDayTitle(baseLocationLabel),
      locationLabel: baseLocationLabel,
      centerCoordinate,
      progressPercentage,
      stopCount: itinerary.length,
      completedCount,
      activeIndex,
      activeItem,
      items: itinerary.map((item, index) => ({
        ...item,
        status:
          index < activeIndex ? ('completed' as const) : index === activeIndex ? ('active' as const) : ('upcoming' as const),
      })),
    };
  },
});
