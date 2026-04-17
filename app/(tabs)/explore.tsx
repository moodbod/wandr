import { WandrScreen } from '@/components/wandr-screen';

export default function ExploreScreen() {
  return (
    <WandrScreen
      eyebrow="Wandr"
      title="Explore"
      description="Main discovery hub for places, stories, and local experiences. This scaffold is based on the explore home concept from the design folder."
      actions={[
        {
          href: '/explore/search',
          label: 'Search discovery',
          description: 'Browse experiences, tastes, and hidden spots from an Explore search flow.',
        },
        {
          href: '/explore/stories',
          label: 'Editorial stories',
          description: 'Curated inspiration and immersive story-driven destination content.',
        },
      ]}
      sections={[
        {
          title: 'Planned content',
          items: [
            'Featured destination hero for the current city or region.',
            'Quick category chips for adventure, food, culture, stays, and nightlife.',
            'Trending moments or local stories surfaced from editorial content.',
          ],
        },
      ]}
    />
  );
}
