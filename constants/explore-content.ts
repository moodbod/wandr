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
  countryCode?: string;
  countryLabel?: string;
  coordinate?: readonly [number, number];
  planningLocationId?: string;
  geography?: ExploreGeography;
  badge?: string;
  locationLabel?: string;
  summary?: string;
  tripFit?: readonly {
    label: string;
    value: string;
    detail: string;
    icon: 'compass' | 'clock' | 'users';
    tone?: 'dark' | 'light' | 'accent';
  }[];
  sections?: readonly {
    title: string;
    body: string;
  }[];
  visitTips?: readonly string[];
  primaryLabel?: string;
  secondaryLabel?: string;
};

export type ExploreMapMarker = {
  id: string;
  coordinate: readonly [number, number];
  experienceSlug?: string;
  itemKind?: 'experience' | 'stay' | 'hiddenGem';
  imageUri?: string;
  label?: string;
  priceLabel?: string;
  popularityScore?: number;
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
  avatarUris?: string[];
};

export type ExploreExperience = {
  slug: string;
  itemKind?: 'experience' | 'hiddenGem';
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
  reviewCount?: number;
  countryCode?: string;
  countryLabel?: string;
  planningLocationId?: string;
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
  sections?: readonly {
    title: string;
    body: string;
  }[];
  summary?: string;
  visitTips?: readonly string[];
  primaryLabel?: string;
  secondaryLabel?: string;
  galleryImages?: readonly string[];
  travelerMomentum?: {
    countryCode: string;
    countryLabel: string;
    visitorCount: number;
    summary: string;
    avatarUris?: readonly string[];
  };
  booking?: {
    availabilityLabel: string;
    confirmMode: string;
    addToTripLabel: string;
    continueWithoutTripLabel: string;
  };
  includes: readonly string[];
};
