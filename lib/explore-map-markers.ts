import type { ExploreExperience, ExploreMapMarker } from '@/constants/explore-content';
import type { TripDashboardItem } from '@/types/trip';
import { formatUsdPrice } from '@/lib/currency';

const DEFAULT_EXPERIENCE_COORDINATES: Record<string, readonly [number, number]> = {
  'tandem-skydive': [14.513, -22.682],
  'quad-sandboard': [14.543, -22.667],
  'desert-adrenaline': [14.538, -22.689],
  'taste-of-swakop': [14.514, -22.673],
};

export function buildExperienceMapMarkers(
  experiences: readonly ExploreExperience[],
  limit = 4,
  withStatus = false
): ExploreMapMarker[] {
  return experiences
    .map((experience) => ({
      ...experience,
      coordinate: experience.coordinate ?? DEFAULT_EXPERIENCE_COORDINATES[experience.slug],
    }))
    .filter((experience): experience is ExploreExperience & { coordinate: readonly [number, number] } => Boolean(experience.coordinate))
    .slice(0, limit)
    .map((experience, index, arr) => {
      let status: 'completed' | 'active' | 'upcoming' | undefined;
      
      if (withStatus) {
        if (index < arr.length - 1) {
          status = 'completed';
        } else if (index === arr.length - 1) {
          status = 'active';
        } else {
          status = 'upcoming';
        }
      }

      return {
        id: experience.slug,
        coordinate: experience.coordinate,
        experienceSlug: experience.slug,
        imageUri: experience.imageUri,
        label: experience.title,
        popularityScore: experience.travelerMomentum?.visitorCount ?? 0,
        tone: index % 2 === 0 ? 'accent' : 'dark',
        status,
      };
    });
}

export function buildTripMapMarkers(
  items: readonly TripDashboardItem[],
  limit = 4,
  preferredCurrency = 'USD'
): ExploreMapMarker[] {
  return items
    .map((item) => ({
      ...item,
      coordinate: item.stay?.coordinate ?? item.experience.coordinate,
    }))
    .filter(
      (item): item is TripDashboardItem & { coordinate: readonly [number, number] } =>
        Boolean(item.coordinate)
    )
    .slice(0, limit)
    .map((item, index) => ({
      id: item._id,
      coordinate: item.coordinate,
      experienceSlug: item.kind === 'stay' ? item.stay?.slug ?? item.experience.slug : item.experience.slug,
      itemKind: item.kind,
      imageUri: item.stay?.imageUri ?? item.experience.imageUri,
      label: item.stay?.name ?? item.experience.title,
      priceLabel: item.kind === 'stay' ? formatUsdPrice(item.stay?.pricePerNight, preferredCurrency) : undefined,
      popularityScore: 1000 - index,
      tone: index % 2 === 0 ? 'accent' : 'dark',
      status: item.status,
    }));
}
