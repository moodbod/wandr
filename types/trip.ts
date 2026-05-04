import type { ExploreExperience } from '@/constants/explore-content';
import type { StayBookingDetails, StayProperty } from '@/types/stays';

export type TripItemKind = 'experience' | 'stay' | 'hiddenGem';

export type TripItineraryItem = {
  _id: string;
  _creationTime: number;
  experienceSlug: string;
  travelerSlug: string;
  tripId?: string;
  bookedAt: number;
  kind: TripItemKind;
  experience: ExploreExperience;
  stay?: StayProperty | null;
  checkIn?: number;
  checkOut?: number;
  totalPrice?: number;
  stayBookingDetails?: StayBookingDetails;
};

export type TripDashboardItem = TripItineraryItem & {
  status: 'completed' | 'active' | 'upcoming';
  visitedAt?: number;
};

export type TripGroupMember = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
  baseLabel: string;
  status: 'active' | 'invited';
  role: 'host' | 'member';
};

export type TripGroupDetails = {
  circleId: string;
  name: string;
  destinationLabel: string;
  memberCount: number;
  invitedCount: number;
  isHost: boolean;
  members: TripGroupMember[];
};

export type TripListItem = {
  _id: string;
  name: string;
  travelerSlug: string;
  createdAt: number;
  status: 'active' | 'completed' | 'archived';
  visibility: 'private' | 'public';
  previewImage: string | null;
  centerCoordinate?: readonly [number, number] | null;
  isGroupTrip: boolean;
  circleId?: string;
  groupRole?: 'host' | 'member';
  sourceTripId?: string;
};

export type ProfilePlaceItem = {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  imageUri: string | null;
  createdAt: number;
  kind: TripItemKind;
  tripId?: string;
};

export type TravelerHistoryItem = ProfilePlaceItem;

export type TravelerBookingItem = {
  _id: string;
  source: 'experienceBooking' | 'stayBooking';
  slug: string;
  title: string;
  subtitle: string;
  imageUri: string | null;
  bookedAt: number;
  kind: TripItemKind;
  status: 'planned' | 'pending' | 'confirmed' | 'cancelled';
  statusLabel: string;
  tripId?: string;
  tripName?: string | null;
  checkIn?: number;
  checkOut?: number;
  totalPrice?: number;
  detailLabel?: string;
};

export type TripDashboard = {
  dayTitle: string;
  locationLabel: string;
  centerCoordinate: readonly [number, number] | null;
  progressPercentage: number;
  stopCount: number;
  completedCount: number;
  activeIndex: number;
  activeItem: TripDashboardItem | null;
  tripId: string | null;
  tripName: string | null;
  visibility: 'private' | 'public';
  isGroupTrip: boolean;
  group: TripGroupDetails | null;
  items: readonly TripDashboardItem[];
};

export type TripInviteFriend = {
  slug: string;
  name: string;
  avatarUri: string | null;
  baseLabel: string;
  phoneNumber: string | null;
};

export type TripSettings = {
  tripId: string;
  name: string;
  visibility: 'private' | 'public';
  canChangeVisibility: boolean;
  isGroupTrip: boolean;
  invitedFriendSlugs: string[];
  friends: TripInviteFriend[];
};
