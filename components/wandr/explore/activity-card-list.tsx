import type { Href } from 'expo-router';

import { ExploreActivityCard, type ExploreActivityCardProps } from './activity-card';
import { ExploreActivityCardSkeleton } from './card-skeletons';

type ExploreActivityCardListProps = {
  activities: readonly ExploreActivityCardProps['card'][];
  getHref: (activity: ExploreActivityCardProps['card'], index: number) => Href;
  onPressActivity?: (activity: ExploreActivityCardProps['card'], index: number) => void;
  isLoading?: boolean;
  skeletonCount?: number;
};

export function ExploreActivityCardList({
  activities,
  getHref,
  onPressActivity,
  isLoading = false,
  skeletonCount = 3,
}: ExploreActivityCardListProps) {
  if (isLoading) {
    return Array.from({ length: skeletonCount }).map((_, index) => (
      <ExploreActivityCardSkeleton key={`activity-skeleton-${index}`} />
    ));
  }

  return activities.map((activity, index) => (
    <ExploreActivityCard
      card={activity}
      href={getHref(activity, index)}
      onPress={onPressActivity ? () => onPressActivity(activity, index) : undefined}
      key={`activity-${activity.experienceSlug}-${index}`}
    />
  ));
}
