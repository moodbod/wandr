import { WandrScreen } from '@/components/wandr-screen';

export default function ProfileOverviewScreen() {
  return (
    <WandrScreen
      eyebrow="Profile"
      title="Profile overview"
      description="Dedicated overview screen scaffold if you want profile opened from other flows outside the bottom tabs."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Traveler identity summary and visual level progression.',
            'History of recent trips, favorites, and saved places.',
            'Settings and profile editing actions grouped below the main summary.',
          ],
        },
      ]}
    />
  );
}
