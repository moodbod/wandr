import type { ExploreExperience, ExploreMapMarker } from '@/constants/explore-content';

const DEFAULT_EXPERIENCE_COORDINATES: Record<string, readonly [number, number]> = {
  'tandem-skydive': [14.513, -22.682],
  'quad-sandboard': [14.543, -22.667],
  'desert-adrenaline': [14.538, -22.689],
  'taste-of-swakop': [14.514, -22.673],
};

export function buildExperienceMapMarkers(
  experiences: readonly ExploreExperience[],
  limit = 4
): ExploreMapMarker[] {
  return experiences
    .map((experience) => ({
      ...experience,
      coordinate: experience.coordinate ?? DEFAULT_EXPERIENCE_COORDINATES[experience.slug],
    }))
    .filter((experience): experience is ExploreExperience & { coordinate: readonly [number, number] } => Boolean(experience.coordinate))
    .slice(0, limit)
    .map((experience, index) => ({
      id: experience.slug,
      coordinate: experience.coordinate,
      experienceSlug: experience.slug,
      imageUri: experience.imageUri,
      label: experience.title,
      tone: index % 2 === 0 ? 'accent' : 'dark',
    }));
}
