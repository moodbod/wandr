import { WandrScreen } from '@/components/wandr-screen';

export default function TripDayPlanScreen() {
  return (
    <WandrScreen
      eyebrow="Trip"
      title="Day plan"
      description="Daily itinerary scaffold for activities, bookings, and pacing through a single trip day."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Activity timeline with start times, durations, and status.',
            'Featured booking card for the next major experience of the day.',
            'Contextual actions for transport, notes, and saved contacts.',
          ],
        },
      ]}
    />
  );
}
