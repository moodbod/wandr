import type {
  ExploreActivityCard as ExploreActivityCardContent,
  ExploreHiddenGem,
} from '@/constants/explore-content';
import { getHiddenGemSlug } from '@/constants/hidden-gems-content';
import type { DiscoveryOption } from '@/lib/explore-filters';
import type { ExplorePageContent } from '@/types/explore';

export const TRENDING_PLACE_LIMIT = 10;

export const INTENT_OPTIONS: readonly DiscoveryOption[] = [
  { key: 'all', label: 'Everything' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'food', label: 'Food & Drink' },
  { key: 'popular', label: 'Popular with Travelers' },
];

export type ExploreDiscoveryItem =
  | {
      kind: 'experience';
      card: ExploreActivityCardContent;
      key: string;
    }
  | {
      kind: 'hiddenGem';
      card: ExploreActivityCardContent;
      key: string;
      slug: string;
    };

function getExperiencePopularityCount(experience: ExplorePageContent['experiences'][number]) {
  return Math.max(
    experience.travelerMomentum?.visitorCount ?? 0,
    experience.reviewCount ?? 0
  );
}

export function compareExperiencesByPopularity(
  a: ExplorePageContent['experiences'][number],
  b: ExplorePageContent['experiences'][number]
) {
  const popularityDelta = getExperiencePopularityCount(b) - getExperiencePopularityCount(a);

  if (popularityDelta !== 0) {
    return popularityDelta;
  }

  return a.title.localeCompare(b.title);
}

export function toTrendingActivityCard(
  experience: ExplorePageContent['experiences'][number]
): ExplorePageContent['home']['activities'][number] {
  return {
    badge: experience.badge,
    badgeTone: experience.badgeTone,
    ctaLabel: experience.ctaLabel,
    experienceSlug: experience.slug,
    imageUri: experience.imageUri,
    price: experience.price,
    priceSuffix: experience.priceSuffix,
    subtitle: experience.locationLabel ?? experience.subtitle,
    title: experience.title,
    visitorCount: getExperiencePopularityCount(experience),
    countryLabel: experience.countryLabel ?? experience.locationLabel,
    ...(experience.travelerMomentum?.avatarUris
      ? { avatarUris: [...experience.travelerMomentum.avatarUris] }
      : {}),
  };
}

export function toHiddenGemDiscoveryItem(item: ExploreHiddenGem): ExploreDiscoveryItem {
  const slug = getHiddenGemSlug(item.title, item.slug);

  return {
    kind: 'hiddenGem',
    key: `location-${slug}`,
    slug,
    card: {
      badge: item.badge ?? 'Location',
      badgeTone: 'soft',
      ctaLabel: item.primaryLabel ?? 'Open location',
      experienceSlug: slug,
      imageUri: item.imageUri,
      price: '',
      priceSuffix: '',
      subtitle: item.locationLabel ?? item.summary ?? item.description,
      title: item.title,
      countryLabel: item.countryLabel,
    },
  };
}

export function getPlanningLocationCopy(_locationId: string, locationLabel: string) {
  return {
    exploreTitle: `Places that make ${locationLabel} unforgettable`,
  };
}
