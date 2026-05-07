import type { Id } from '@/convex/_generated/dataModel';

export type FriendCandidate = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
  countryLabel: string;
  sameCountry: boolean;
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

export type FriendViewerProfile = {
  traveler: {
    slug: string;
    name: string;
    countryLabel: string;
    baseLabel: string;
    avatarUri: string | null;
  };
  profile: {
    headline: string;
    bio: string;
    destinationLabel: string;
    vibe: FriendCandidate['vibe'];
    travelPace: FriendCandidate['travelPace'];
    arrivalWindowLabel: string;
    interests: string[];
    sharedInterests: string[];
    matchScore: number | null;
  } | null;
  relationship: {
    state: 'self' | 'friend' | 'invited' | 'available';
    directThreadId: Id<'friendDirectThreads'> | null;
  };
  stats: {
    friendCount: number;
  };
} | null;

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
  kind: 'text' | 'route' | 'system' | 'call' | 'scheduled_call';
  body: string | null;
  createdAt: number;
  senderSlug: string;
  senderName: string;
  senderAvatarUri: string | null;
  isOwnMessage: boolean;
  replyTo: {
    messageId: Id<'friendMessages'>;
    senderName: string;
    preview: string;
    kind: string;
  } | null;
  routeCard: {
    title: string;
    summary: string;
    distanceLabel: string;
    stopCount: number;
    stopsPreview: string[];
    centerCoordinate: readonly [number, number] | null;
    heroImageUri: string | null;
    mapMarkers: {
      id: string;
      coordinate: readonly [number, number];
      imageUri?: string;
      label?: string;
      status?: 'completed' | 'active' | 'upcoming';
    }[];
  } | null;
  callCard: {
    callId: Id<'friendCalls'> | null;
    mode: 'voice' | 'video';
    status: 'active' | 'scheduled' | 'ended' | 'cancelled';
    scheduledFor: number | null;
    endsAt: number | null;
    reminderMinutesBefore: number | null;
    title: string;
    description: string | null;
  } | null;
};

export type FriendCallDetail = {
  _id: Id<'friendCalls'>;
  circleId: Id<'friendCircles'> | null;
  directThreadId?: Id<'friendDirectThreads'> | null;
  circleName: string;
  roomName: string;
  createdBySlug: string;
  createdByName: string;
  mode: 'voice' | 'video';
  status: 'active' | 'scheduled' | 'ended' | 'cancelled';
  title: string;
  description: string | null;
  scheduledFor: number | null;
  endsAt: number | null;
  reminderMinutesBefore: number | null;
  startedAt: number | null;
  members: FriendCircleMember[];
};

export type FriendRouteShare = {
  routeTitle: string;
  routeSummary: string;
  routeDistanceLabel: string;
  routeStopCount: number;
  routeStopsPreview: string[];
  routeCenterCoordinate: readonly [number, number] | null;
  routeHeroImageUri: string | null;
  routeMapMarkers: {
    id: string;
    coordinate: readonly [number, number];
    imageUri?: string;
    label?: string;
    status?: 'completed' | 'active' | 'upcoming';
  }[];
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
  activeCircles: FriendCircleSummary[];
  topMatches: FriendCandidate[];
  stats: {
    invitedCount: number;
    friendCount: number;
    freshCount: number;
  };
};

export type DirectChatMessage = {
  _id: Id<'friendDirectMessages'>;
  kind: 'text' | 'call' | 'scheduled_call';
  body: string;
  createdAt: number;
  senderSlug: string;
  senderName: string;
  senderAvatarUri: string | null;
  isOwnMessage: boolean;
  replyTo: {
    messageId: Id<'friendDirectMessages'>;
    senderName: string;
    preview: string;
    kind: string;
  } | null;
  callCard: {
    callId: Id<'friendCalls'> | null;
    mode: 'voice' | 'video';
    status: 'active' | 'scheduled' | 'ended' | 'cancelled';
    scheduledFor: number | null;
    endsAt: number | null;
    reminderMinutesBefore: number | null;
    title: string;
    description: string | null;
  } | null;
};

export type FriendDiscoveryPayload = {
  intro: {
    title: string;
    countryLabel: string;
    destinationLabel: string;
    vibe: string | null;
    matchCount: number;
    showIntro: boolean;
  };
  filters: {
    vibes: string[];
  };
  candidates: FriendCandidate[];
};

export type FriendChatListItem = {
  id: string;
  kind: 'group' | 'direct';
  title: string;
  subtitle: string;
  preview: string | null;
  updatedAt: number;
  travelerSlug?: string;
  avatarUri?: string | null;
  avatarUris?: string[];
  memberCount?: number;
  href: string;
};

export type JoinableFriendGroup = {
  id: Id<'friendCircles'>;
  kind: 'group';
  title: string;
  subtitle: string;
  preview: string | null;
  updatedAt: number;
  avatarUris: string[];
  memberCount: number;
  href: string;
};

export type PhoneContactMatch = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
  baseLabel: string;
  phoneNumber: string;
  isFriend: boolean;
};

export type FriendPickerItem = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
  baseLabel: string;
};

export type FriendChatListPayload = {
  groups: FriendChatListItem[];
  directs: FriendChatListItem[];
  joinableGroups: JoinableFriendGroup[];
  friends: FriendPickerItem[];
};

export type FriendChatPayload = {
  circle: FriendCircleSummary;
  members: FriendCircleMember[];
  messages: FriendChatMessage[];
  composer: {
    placeholder: string;
    quickActions: { key: string; label: string; description: string }[];
    routeShare: FriendRouteShare;
  };
} | null;

export type DirectChatPayload = {
  threadId: Id<'friendDirectThreads'>;
  title: string;
  participant: {
    slug: string;
    name: string;
    avatarUri: string | null;
    baseLabel: string;
  };
  messages: DirectChatMessage[];
  composer: {
    placeholder: string;
  };
} | null;
