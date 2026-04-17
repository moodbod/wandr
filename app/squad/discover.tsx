import { WandrScreen } from '@/components/wandr-screen';

export default function SquadDiscoverScreen() {
  return (
    <WandrScreen
      eyebrow="Squad"
      title="Squad discovery"
      description="Matching screen scaffold for finding travelers with a similar destination, vibe, and schedule."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Traveler cards with avatars, compatibility tags, and destination overlap.',
            'Short bios and travel style signals to help with quick decisions.',
            'Invite, pass, and shortlist actions for forming a temporary squad.',
          ],
        },
      ]}
    />
  );
}
