import { WandrScreen } from '@/components/wandr-screen';

export default function TripMapScreen() {
  return (
    <WandrScreen
      eyebrow="Trip"
      title="Trip map"
      description="Map-plus-timeline screen for visualizing trip stops, movement, and the route for the current day."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Map hero with current route, key stops, and transport context.',
            'Timeline blocks synchronized to map markers.',
            'Quick jump actions for navigation, check-ins, and place details.',
          ],
        },
      ]}
    />
  );
}
