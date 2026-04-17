import { WandrScreen } from '@/components/wandr-screen';

export default function StaysScreen() {
  return (
    <WandrScreen
      eyebrow="Wandr"
      title="Stays"
      description="Accommodation browsing starts here with a map-first search experience and links into detailed property pages."
      actions={[
        {
          href: '/stays/map-search',
          label: 'Map search',
          description: 'Map-led browsing for nearby stays, availability, and pricing.',
        },
        {
          href: '/stays/details',
          label: 'Stay details',
          description: 'Property detail, reviews, and neighborhood content for a selected stay.',
        },
      ]}
      sections={[
        {
          title: 'Planned content',
          items: [
            'Search input with filters for dates, price, and vibe.',
            'Pin-based map with synced result cards beneath it.',
            'A highlight card for featured stays and editorial picks.',
          ],
        },
      ]}
    />
  );
}
