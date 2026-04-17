import { WandrScreen } from '@/components/wandr-screen';

export default function StayDetailsScreen() {
  return (
    <WandrScreen
      eyebrow="Stays"
      title="Stay details"
      description="Property detail scaffold with reviews, amenity storytelling, and local neighborhood context."
      sections={[
        {
          title: 'Planned content',
          items: [
            'Large media header with name, location, and primary booking action.',
            'Description, amenity highlights, and stay personality section.',
            'Guest journals, ratings, and neighborhood guidance below the fold.',
          ],
        },
      ]}
    />
  );
}
