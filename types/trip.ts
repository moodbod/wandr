import type { ExploreExperience } from '@/constants/explore-content';

export type TripItineraryItem = {
  _id: string;
  _creationTime: number;
  experienceSlug: string;
  travelerSlug: string;
  tripId?: string;
  bookedAt: number;
  experience: ExploreExperience;
};

export type TripDashboardItem = TripItineraryItem & {
  status: 'completed' | 'active' | 'upcoming';
  visitedAt?: number;
};

export type TripDashboard = {
  dayTitle: string;
  locationLabel: string;
  centerCoordinate: readonly [number, number];
  progressPercentage: number;
  stopCount: number;
  completedCount: number;
  activeIndex: number;
  activeItem: TripDashboardItem | null;
  items: readonly TripDashboardItem[];
};
