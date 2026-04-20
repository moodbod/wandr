import type { ExploreExperience, ExploreGeography, ExploreHiddenGem } from '@/constants/explore-content';

export type DiscoveryOption = {
  key: string;
  label: string;
};

type Coordinate = readonly [number, number];

const REGION_CENTERS: Record<string, Coordinate> = {
  Erongo: [14.5266, -22.6784],
  Khomas: [17.0832, -22.5609],
  Hardap: [17.0806, -24.6336],
  // Placeholder regional centers used only for ordering proximity in the picker.
  Kunene: [14.9667, -20.3333],
  Omusati: [14.9667, -17.7833],
  Oshana: [15.6833, -17.7833],
  Oshikoto: [17.4333, -18.0333],
  Ohangwena: [16.0000, -17.5000],
  Otjozondjupa: [17.2500, -20.4637],
  Omaheke: [19.7667, -22.4500],
  Karas: [17.1500, -26.5833],
  KavangoEast: [19.7667, -17.9167],
  KavangoWest: [18.7000, -17.5000],
  Zambezi: [24.2667, -17.5000],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function titleizeKey(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function optionKey(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-');
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceBetween(a: Coordinate, b: Coordinate) {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function lookupRegionCenter(region: string) {
  return REGION_CENTERS[region] ?? REGION_CENTERS[titleizeKey(optionKey(region)).replace(/\s+/g, '')];
}

export function inferGeography(
  geography: ExploreGeography | undefined,
  sourceLabel?: string
): ExploreGeography | undefined {
  if (geography?.region) {
    return geography;
  }

  const label = normalize(sourceLabel ?? '');
  if (!label) {
    return undefined;
  }

  if (label.includes('walvis')) {
    return { region: 'Erongo', town: 'Walvis Bay' };
  }

  if (label.includes('erongo')) {
    return { region: 'Erongo' };
  }

  if (label.includes('salt')) {
    return { region: 'Erongo', town: 'Walvis Bay' };
  }

  if (label.includes('swakop')) {
    return { region: 'Erongo', town: 'Swakopmund' };
  }

  if (label.includes('namib') || label.includes('dune') || label.includes('desert')) {
    return { region: 'Erongo', town: 'Swakopmund' };
  }

  return undefined;
}

export function buildRegionOptions(
  experiences: readonly ExploreExperience[],
  hiddenGems: readonly ExploreHiddenGem[],
  currentRegionCenter?: Coordinate
): DiscoveryOption[] {
  const seen = new Set<string>();
  const discoveredRegions: DiscoveryOption[] = [];

  for (const geography of [
    ...experiences.map((experience) => inferGeography(experience.geography, experience.locationLabel)),
    ...hiddenGems.map((item) => inferGeography(item.geography, `${item.title} ${item.description}`)),
  ]) {
    if (!geography?.region) {
      continue;
    }

    const key = optionKey(geography.region);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    discoveredRegions.push({ key, label: geography.region });
  }

  discoveredRegions.sort((a, b) => {
    const aCenter = lookupRegionCenter(a.label);
    const bCenter = lookupRegionCenter(b.label);

    if (currentRegionCenter && aCenter && bCenter) {
      return distanceBetween(currentRegionCenter, aCenter) - distanceBetween(currentRegionCenter, bCenter);
    }

    if (currentRegionCenter && aCenter) {
      return -1;
    }

    if (currentRegionCenter && bCenter) {
      return 1;
    }

    return a.label.localeCompare(b.label);
  });

  return [{ key: 'all', label: 'All regions' }, ...discoveredRegions];
}

export function matchesIntent(category: string | undefined, visitorCount: number | undefined, activeIntent: string) {
  if (activeIntent === 'all') {
    return true;
  }

  if (activeIntent === 'adventure') {
    return category === 'Adventure';
  }

  if (activeIntent === 'food') {
    return category === 'Gastronomy';
  }

  if (activeIntent === 'popular') {
    return typeof visitorCount === 'number' && visitorCount >= 15;
  }

  return true;
}

export function matchesSearchQuery(searchQuery: string, ...values: Array<string | undefined>) {
  const query = normalize(searchQuery);
  if (!query) {
    return true;
  }

  return values.some((value) => normalize(value ?? '').includes(query));
}

export function matchesGeography(
  geography: ExploreGeography | undefined,
  activeRegion: string
) {
  if (!geography) {
    return activeRegion === 'all';
  }

  const regionKey = optionKey(geography.region);

  if (activeRegion !== 'all' && regionKey !== activeRegion) {
    return false;
  }

  return true;
}

export function matchesExperienceFilters(
  experience: ExploreExperience,
  activeRegion: string,
  activeIntent: string,
  searchQuery: string
) {
  const geography = inferGeography(experience.geography, experience.locationLabel);

  return (
    matchesGeography(geography, activeRegion) &&
    matchesIntent(experience.category, experience.travelerMomentum?.visitorCount, activeIntent) &&
    matchesSearchQuery(
      searchQuery,
      experience.title,
      experience.subtitle,
      experience.description,
      experience.locationLabel,
      geography?.region,
      geography?.town,
      experience.category
    )
  );
}

export function matchesHiddenGemFilters(
  item: ExploreHiddenGem,
  activeRegion: string,
  searchQuery: string
) {
  const geography = inferGeography(item.geography, `${item.title} ${item.description}`);

  return (
    matchesGeography(geography, activeRegion) &&
    matchesSearchQuery(searchQuery, item.title, item.description, geography?.region, geography?.town)
  );
}

export function getOptionLabel(activeKey: string, options: readonly DiscoveryOption[], fallback: string) {
  return options.find((option) => option.key === activeKey)?.label ?? (activeKey === 'all' ? fallback : titleizeKey(activeKey));
}
