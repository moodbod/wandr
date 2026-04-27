import type { ExploreExperience } from '@/constants/explore-content';
import type { StayBookingDetails, StayProperty } from '@/types/stays';

export type TripItemKind = 'experience' | 'stay';

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
  items: readonly TripDashboardItem[];
};
