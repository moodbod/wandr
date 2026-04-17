import { WandrScreen } from '@/components/wandr-screen';

export default function SquadScreen() {
  return (
    <WandrScreen
      eyebrow="Wandr"
      title="Squad"
      description="Social travel flow for matching with compatible travelers and moving into a shared group chat."
      actions={[
        {
          href: '/squad/discover',
          label: 'Squad discovery',
          description: 'Find travelers that match destination, pace, and travel vibe.',
        },
        {
          href: '/squad/chat',
          label: 'Squad chat',
          description: 'Group conversation screen for planning together once the squad is formed.',
        },
      ]}
      sections={[
        {
          title: 'Planned content',
          items: [
            'Traveler match cards with shared interests and overlapping dates.',
            'Invite and accept actions for building a temporary travel squad.',
            'Shared planning updates once a match becomes a group chat.',
          ],
        },
      ]}
    />
  );
}
