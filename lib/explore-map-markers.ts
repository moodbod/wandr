import type { ExploreExperience, ExploreMapMarker } from '@/constants/explore-content';
import type { TripDashboardItem } from '@/types/trip';
import { formatUsdPrice } from '@/lib/currency';

export function buildExperienceMapMarkers(
  experiences: readonly ExploreExperience[],
  limit = 4,
  withStatus = false
): ExploreMapMarker[] {
  return experiences
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
