import { WandrScreen } from '@/components/wandr-screen';

export default function ExploreStoriesScreen() {
  return (
    <WandrScreen
      eyebrow="Explore"
      title="Editorial stories"
      description="Story-first discovery screen for immersive travel inspiration and curated destination narratives."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Immersive hero media with a high-impact destination headline.',
            'Curated story cards such as hidden waterfalls or local maker journeys.',
            'A strong call to action that sends the traveler into booking or planning.',
          ],
        },
      ]}
    />
  );
}
