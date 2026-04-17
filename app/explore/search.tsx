import { WandrScreen } from '@/components/wandr-screen';

export default function ExploreSearchScreen() {
  return (
    <WandrScreen
      eyebrow="Explore"
      title="Search discovery"
      description="Search-led explore screen for experiences, tastes, and hidden spots. This maps to the kinetic discovery mockup."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Large search field with location-aware suggestions.',
            'Featured experience cards such as desert adrenaline and local food routes.',
            'A hidden gems section for editorial picks and off-grid moments.',
          ],
        },
      ]}
    />
  );
}
