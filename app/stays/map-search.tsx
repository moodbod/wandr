import { WandrScreen } from '@/components/wandr-screen';

export default function StaysMapSearchScreen() {
  return (
    <WandrScreen
      eyebrow="Stays"
      title="Map search"
      description="Accommodation browsing scaffold built around a search input, map context, and synced stay cards."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Search bar with destination, dates, and occupancy filters.',
            'Interactive map with nearby stay markers.',
            'Swipeable result cards with price, photos, and short summaries.',
          ],
        },
      ]}
    />
  );
}
