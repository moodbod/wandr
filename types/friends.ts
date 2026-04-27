import type { Id } from '@/convex/_generated/dataModel';

export type FriendCandidate = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
  countryLabel: string;
  baseLabel: string;
  destinationLabel: string;
  headline: string;
  bio: string;
  vibe: 'adventure' | 'culture' | 'social' | 'relaxation' | 'food';
  travelPace: 'slow' | 'balanced' | 'fast';
  arrivalWindowLabel: string;
  interests: string[];
  sharedInterests: string[];
  matchScore: number;
  actionState: 'invited' | 'passed' | 'friended' | null;
};

export type FriendCircleMember = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
  baseLabel: string;
  status: 'active' | 'invited';
  role: 'host' | 'member';
};

export type FriendCircleSummary = {
  _id: Id<'friendCircles'>;
  slug: string;
  name: string;
  destinationLabel: string;
  heroLabel: string;
  status: 'active' | 'planning';
  memberCount: number;
  invitedCount: number;
  members: FriendCircleMember[];
  avatarUris: string[];
  latestMessagePreview: string | null;
  latestActivityAt: number;
};

export type FriendChatMessage = {
  _id: Id<'friendMessages'>;
  kind: 'text' | 'route' | 'system';
  body: string | null;
  createdAt: number;
  senderSlug: string;
  senderName: string;
  senderAvatarUri: string | null;
  isOwnMessage: boolean;
  routeCard: {
    title: string;
    summary: string;
    distanceLabel: string;
    stopCount: number;
    stopsPreview: string[];
  } | null;
};

export type FriendRouteShare = {
  routeTitle: string;
  routeSummary: string;
  routeDistanceLabel: string;
  routeStopCount: number;
  routeStopsPreview: string[];
};

export type FriendsDashboard = {
  traveler: {
    slug: string;
    name: string;
    countryLabel: string;
    avatarUri: string | null;
  } | null;
  profile: {
    destinationLabel: string;
    vibe: string | null;
    arrivalWindowLabel: string;
    interests: string[];
  } | null;
  activeCircle: FriendCircleSummary | null;
  topMatches: FriendCandidate[];
  stats: {
    invitedCount: number;
    friendCount: number;
    freshCount: number;
  };
};

export type FriendDiscoveryPayload = {
  intro: {
    title: string;
    destinationLabel: string;
    vibe: string | null;
    matchCount: number;
  };
  activeCircle: FriendCircleSummary | null;
  filters: {
    vibes: string[];
  };
  candidates: FriendCandidate[];
};

export type FriendChatPayload = {
  circle: FriendCircleSummary;
  members: FriendCircleMember[];
  messages: FriendChatMessage[];
  composer: {
    placeholder: string;
    quickActions: { key: string; label: string }[];
    routeShare: FriendRouteShare;
  };
} | null;
