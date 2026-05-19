import type { ExploreExperience, ExploreGeography, ExploreHiddenGem } from '@/constants/explore-content';

export type DiscoveryOption = {
  key: string;
  label: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function optionKey(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-');
}

export function inferGeography(
  geography: ExploreGeography | undefined,
  _sourceLabel?: string
): ExploreGeography | undefined {
  if (geography?.region) {
    return geography;
  }

  return undefined;
}

export function buildRegionOptions(
  experiences: readonly ExploreExperience[],
  gems: readonly ExploreHiddenGem[],
  _currentRegionCenter?: readonly [number, number]
): DiscoveryOption[] {
  const seen = new Set<string>();
  const discoveredRegions: DiscoveryOption[] = [];

  for (const geography of [
    ...experiences.map((experience) => inferGeography(experience.geography, experience.locationLabel)),
    ...gems.map((item) => inferGeography(item.geography, `${item.title} ${item.description}`)),
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

  discoveredRegions.sort((a, b) => a.label.localeCompare(b.label));

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

export function matchesSearchQuery(searchQuery: string, ...values: (string | undefined)[]) {
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
  return options.find((option) => option.key === activeKey)?.label ?? (activeKey === 'all' ? fallback : activeKey);
}
