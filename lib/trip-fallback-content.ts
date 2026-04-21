import type { TripDashboard } from '@/types/trip';
import { fallbackExplorePageContent } from '@/lib/explore-fallback-content';

const fallbackExperiences = fallbackExplorePageContent.experiences.slice(0, 3);

const fallbackItems: TripDashboard['items'] = fallbackExperiences.map((experience, index) => ({
  _id: `fallback-trip-item-${experience.slug}`,
  _creationTime: index,
  experienceSlug: experience.slug,
  travelerSlug: 'demo-traveler',
  bookedAt: index + 1,
  experience,
  status: index === 0 ? 'active' : 'upcoming',
}));

export const fallbackTripDashboard: TripDashboard = {
  dayTitle: 'Namibia Day',
  locationLabel: fallbackExperiences[0]?.locationLabel ?? fallbackExplorePageContent.home.hero.locationLabel,
  centerCoordinate:
    fallbackExperiences[0]?.coordinate ?? fallbackExplorePageContent.home.hero.centerCoordinate,
  progressPercentage: 33,
  stopCount: fallbackItems.length,
  completedCount: 0,
  activeIndex: 0,
  activeItem: fallbackItems[0] ?? null,
  items: fallbackItems,
};

