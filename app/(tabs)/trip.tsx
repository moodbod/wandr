import { WandrScreen } from '@/components/wandr-screen';

export default function TripScreen() {
  return (
    <WandrScreen
      eyebrow="Wandr"
      title="Trip"
      description="Core saved-trip screen for itinerary planning. This starts with the day plan concept and branches into map-based route viewing."
      actions={[
        {
          href: '/trip/day-plan',
          label: 'Day plan',
          description: 'Daily itinerary with times, activities, and booking-focused moments.',
        },
        {
          href: '/trip/map',
          label: 'Trip map',
          description: 'Route and timeline view for navigating a trip day spatially.',
        },
      ]}
      sections={[
        {
          title: 'Planned content',
          items: [
            'Day-by-day schedule cards with time, status, and transport context.',
            'Upcoming booking or reservation summary for the active day.',
            'Quick links into route map, saved places, and logistics.',
          ],
        },
      ]}
    />
  );
}
