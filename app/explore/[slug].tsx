import { useLocalSearchParams } from 'expo-router';

import { ExperienceDetailContent } from '@/components/wandr/explore/experience-detail-content';

export default function ExploreExperienceScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const resolvedSlug = Array.isArray(slug) ? slug[0] : slug;

  if (!resolvedSlug) {
    return null;
  }

  return <ExperienceDetailContent slug={resolvedSlug} />;
}
