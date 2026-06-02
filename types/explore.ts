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
  gems: {
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

export type ExploreTripAvatar = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
};

export type ExploreJoinableTrip = {
  circleId: string;
  tripId: string;
  tripName: string;
  groupName: string;
  hostName: string;
  destinationLabel: string;
  memberCount: number;
  avatarUris: string[];
  avatars: ExploreTripAvatar[];
};

export type ExploreJoinableTripCard = {
  circleId: string;
  experienceSlug: string;
  experienceTitle: string;
  experienceImageUri: string;
  locationLabel: string;
  countryCode?: string;
  countryLabel?: string;
  planningLocationId?: string;
  tripName: string;
  groupName: string;
  hostName: string;
  destinationLabel: string;
  memberCount: number;
  avatarUris: string[];
  avatars: ExploreTripAvatar[];
};

export type ExploreGroupTripDetail = {
  circleId: string;
  groupName: string;
  tripName: string;
  hostName: string;
  destinationLabel: string;
  memberCount: number;
  avatarUris: string[];
  avatars: ExploreTripAvatar[];
  heroImageUri: string;
  locationLabel: string;
  summary: string;
  isMember: boolean;
  hasRequested: boolean;
  itinerary: {
    bookingId: string;
    experienceSlug: string;
    title: string;
    locationLabel: string;
    imageUri: string;
    bookedAt: number;
  }[];
};
