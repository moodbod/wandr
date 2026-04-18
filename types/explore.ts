import type {
  ExploreActivityCard,
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
    markers: ReadonlyArray<ExploreMapMarker>;
  };
  section: {
    eyebrow: string;
    title: string;
  };
  activities: ReadonlyArray<ExploreActivityCard>;
};

export type ExploreSearchContent = {
  intro: {
    title: string;
    description: string;
    tags: ReadonlyArray<string>;
    searchPlaceholder: string;
  };
  featured: {
    hero: ExploreFeatureHero;
    detail: ExploreFeatureDetail;
  };
  hiddenGems: {
    title: string;
    ctaLabel: string;
    items: ReadonlyArray<ExploreHiddenGem>;
  };
  map: {
    title: string;
    description: string;
    ctaLabel: string;
    centerCoordinate: readonly [number, number];
    markers: ReadonlyArray<ExploreMapMarker>;
  };
};

export type ExplorePageContent = {
  slug: string;
  home: ExploreHomeContent;
  search: ExploreSearchContent;
  updatedAt: number;
};
