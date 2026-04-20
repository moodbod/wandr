import type {
  ExploreActivityCard,
  ExploreExperience,
  ExploreFeatureDetail,
  ExploreFeatureHero,
  ExploreHiddenGem,
  ExploreMapMarker,
} from '@/constants/explore-content';

export type ExploreHomeContent = {
  hero: {
    title: string;
    locationLabel: string;
    centerCoordinate: readonly [number, number];
    markers: readonly ExploreMapMarker[];
  };
  section: {
    eyebrow: string;
    title: string;
  };
  activities: readonly ExploreActivityCard[];
};

export type ExploreSearchContent = {
  intro: {
    title: string;
    description: string;
    tags: readonly string[];
    searchPlaceholder: string;
  };
  featured: {
    hero: ExploreFeatureHero;
    detail: ExploreFeatureDetail;
  };
  hiddenGems: {
    title: string;
    ctaLabel: string;
    items: readonly ExploreHiddenGem[];
  };
  map: {
    title: string;
    description: string;
    ctaLabel: string;
    centerCoordinate: readonly [number, number];
    markers: readonly ExploreMapMarker[];
  };
};

export type ExplorePageContent = {
  slug: string;
  home: ExploreHomeContent;
  search: ExploreSearchContent;
  experiences: readonly ExploreExperience[];
  updatedAt: number;
};
