import { WandrScreen } from '@/components/wandr-screen';

export default function ProfileScreen() {
  return (
    <WandrScreen
      eyebrow="Wandr"
      title="Profile"
      description="Traveler identity hub for stats, preferences, and progress. This is scaffolded from the profile overview design."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Traveler level, badges, and recent activity summary.',
            'Saved preferences for trip style, budget, and favorite experiences.',
            'Quick actions for editing profile details and reviewing upcoming trips.',
          ],
        },
      ]}
    />
  );
}
