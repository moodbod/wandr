import type { ExploreExperience } from '@/constants/explore-content';

export type TripItineraryItem = {
  _id: string;
  _creationTime: number;
  experienceSlug: string;
  travelerSlug: string;
  bookedAt: number;
  experience: ExploreExperience;
};

export type TripDashboardItem = TripItineraryItem & {
  status: 'completed' | 'active' | 'upcoming';
};

export type TripDashboard = {
  dayTitle: string;
  locationLabel: string;
  centerCoordinate: readonly [number, number];
  progressPercentage: number;
  stopCount: number;
  completedCount: number;
  activeIndex: number;
  activeItem: TripItineraryItem | null;
  items: readonly TripDashboardItem[];
};
