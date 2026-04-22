export type ExploreGeography = {
  region: string;
  town?: string;
};

export type ExploreFeatureHero = {
  experienceSlug: string;
  badge: string;
  title: string;
  description: string;
  imageUri: string;
  ctaLabel: string;
};

export type ExploreFeatureDetail = {
  experienceSlug: string;
  category: string;
  title: string;
  description: string;
  price: string;
  priceSuffix: string;
  imageUri: string;
  ctaLabel: string;
};

export type ExploreHiddenGem = {
  title: string;
  description: string;
  imageUri: string;
  geography?: ExploreGeography;
};

export type ExploreMapMarker = {
  id: string;
  coordinate: readonly [number, number];
  experienceSlug?: string;
  imageUri?: string;
  label?: string;
  tone?: 'accent' | 'dark';
  status?: 'completed' | 'active' | 'upcoming';
};

export type ExploreActivityCard = {
  experienceSlug: string;
  badge: string;
  badgeTone?: 'accent' | 'soft' | 'dark';
  ctaLabel: string;
  imageUri: string;
  price: string;
  priceSuffix: string;
  subtitle: string;
  title: string;
  visitorCount?: number;
  countryLabel?: string;
  visitorNames?: string[];
  viewerName?: string;
};

export type ExploreExperience = {
  slug: string;
  badge: string;
  badgeTone?: 'accent' | 'soft' | 'dark';
  ctaLabel: string;
  title: string;
  subtitle: string;
  description: string;
  imageUri: string;
  price: string;
  priceSuffix: string;
  category?: string;
  coordinate?: readonly [number, number];
  geography?: ExploreGeography;
  locationLabel?: string;
  durationLabel?: string;
  groupSizeLabel?: string;
  tripFit?: readonly {
    label: string;
    value: string;
    detail: string;
    icon: 'compass' | 'clock' | 'users';
    tone?: 'dark' | 'light' | 'accent';
  }[];
  galleryImages?: readonly string[];
  travelerMomentum?: {
    countryCode: string;
    countryLabel: string;
    visitorCount: number;
    summary: string;
  };
  booking?: {
    availabilityLabel: string;
    confirmMode: string;
    addToTripLabel: string;
    continueWithoutTripLabel: string;
  };
  includes: readonly string[];
};
