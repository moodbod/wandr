import type { ExplorePageContent } from '@/types/explore';
import { defaultExplorePageSeed } from '@/convex/seedData';

export const fallbackExplorePageContent: ExplorePageContent = {
  slug: defaultExplorePageSeed.slug,
  home: defaultExplorePageSeed.content.home as any,
  search: defaultExplorePageSeed.content.search as any,
  experiences: defaultExplorePageSeed.content.experiences as any,
  updatedAt: Date.now(),
};

