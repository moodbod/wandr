import { WandrScreen } from '@/components/wandr-screen';

export default function SquadChatScreen() {
  return (
    <WandrScreen
      eyebrow="Squad"
      title="Squad chat"
      description="Group chat scaffold for route sharing, message threads, and travel coordination once a squad is active."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Live message feed for group planning and quick decisions.',
            'Pinned updates like route changes, polls, or shared plans.',
            'Composer with attachments for maps, places, and itinerary links.',
          ],
        },
      ]}
    />
  );
}
