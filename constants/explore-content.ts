export type ExploreFeatureHero = {
  badge: string;
  title: string;
  description: string;
  imageUri: string;
};

export type ExploreFeatureDetail = {
  category: string;
  title: string;
  description: string;
  price: string;
  priceSuffix: string;
  imageUri: string;
};

export type ExploreHiddenGem = {
  title: string;
  description: string;
  imageUri: string;
};

export type ExploreExperienceBookingContent = {
  badge: string;
  title: string;
  location: string;
  heroImageUri: string;
  price: string;
  priceSuffix: string;
  summary: string;
  socialProof: {
    summary: string;
    market: string;
  };
  highlights: readonly string[];
  inclusions: readonly string[];
  bookingSteps: readonly {
    title: string;
    description: string;
  }[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
  nearbyStay: {
    eyebrow: string;
    title: string;
    description: string;
    imageUri: string;
  };
};

export type ExploreMapMarker = {
  id: string;
  coordinate: readonly [number, number];
  label?: string;
  tone?: 'accent' | 'dark';
};

export type ExploreActivityCard = {
  badge: string;
  badgeTone?: 'accent' | 'soft';
  ctaLabel: string;
  imageUri: string;
  price: string;
  priceSuffix: string;
  subtitle: string;
  title: string;
};

export const exploreHomeContent = {
  hero: {
    title: 'Explore',
    locationLabel: 'Swakopmund, NA',
    centerCoordinate: [14.5266, -22.6784] as const,
    markers: [
      { id: 'skydiving', coordinate: [14.513, -22.682], label: 'Skydiving', tone: 'accent' as const },
      { id: 'sandboard', coordinate: [14.543, -22.667], label: 'Sandboard', tone: 'dark' as const },
    ] satisfies ExploreMapMarker[],
  },
  section: {
    eyebrow: 'Adventure Hub',
    title: 'Today in the Dunes',
  },
  activities: [
    {
      badge: 'Top Rated',
      badgeTone: 'accent' as const,
      ctaLabel: 'Book Experience',
      imageUri:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBBtfFbx9Hxjs7g3GkzDVpEWx9aqpns22anS7muKu-SPG-PGqg-iyo3gXW4yoiCyW-q2h0lrRrL1IMDArraoamsxBwHMQO8i4_UYQXBMCFn7_0Ta2B-VIbTtuwCqoBsFMq1Z5SRsOoxtCEabmseOnWRw-6j-MDgV1wizNi1MdpjZzzLIGeSwayEOOBjAnl7CF2CfEANJfcZMJTPqJJGeMmepv7iFPzUL0tesS0BEPp5CXZeOgRh7fl7igTIESOPjuh9jXyrZKPQ9dQ',
      price: '€180',
      priceSuffix: 'Per person',
      subtitle: 'Freefall over the Namib Desert',
      title: 'Tandem Skydive',
    },
    {
      badge: 'Best Value',
      badgeTone: 'soft' as const,
      ctaLabel: 'Book Experience',
      imageUri:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCKYdhOl4BZwNRIgtwmgTzMBOFCqRQHfe6Dt55uex7GmKnMAxv5C2O32HnN_30lQGYaaOu4jZ_L7pPe8gQS4cEpFYOWyxdHcOcGbJPbXYLi5S_832Sza2QipVFnZs6DKgjLONvzwG1yrojTImsSRS1As5bKLztnVFXXq0QFCyDmKev3p-rVhfZAu5HZMRiaS2uXuCZUwO3sd9c4-3sF4MkmSqP-cj9w26WAOZkT1k9bUQYFVHNDuPNhJ7Lk841-wTrDuPBdpkn35PA',
      price: '€65',
      priceSuffix: 'Per person',
      subtitle: '4-Hour desert adventure',
      title: 'Quad + Sandboard',
    },
  ] satisfies ExploreActivityCard[],
} as const;

export const exploreSearchContent = {
  intro: {
    title: 'Explore',
    description: 'Uncover the raw beauty of Swakopmund through curated kinetic experiences.',
    tags: ['Namibia', 'Active Search'],
    searchPlaceholder: 'Search experiences, spots...',
  },
  featured: {
    hero: {
      badge: 'Adrenaline',
      title: 'Desert Adrenaline',
      description: 'Conquer the dunes of the Namib via 4x4 or high-speed sandboarding.',
      imageUri:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0wm5QppAYT1Y59Xf-t7Q8NjKOdQ3-1zbNaAKkUBFT7qlGx5lF3-HOvxHyYk56VsuncX4xuRuF7jkAdUWMXQ2tSg3ZYJjrueufiAq_zJIwBh0ZiynWwX2lAXETq5bYVMe-Pbg1JfD6SM67ZQdjxcMnfSpgfCnqFxlwtb5s8RIr9antErPacM3N0xtwD6CasUVxbKq012XAcU08p4qXob6ZsskdGdCzkdK_1w7_pq_vMLqPo4p9YBNX-EQQFwibYwFffcdWyU70EQ',
    } satisfies ExploreFeatureHero,
    detail: {
      category: 'Gastronomy',
      title: 'Taste of Swakop',
      description: 'The freshest Atlantic oysters paired with local craft brews at the Jetty.',
      price: '$45',
      priceSuffix: '/pp',
      imageUri:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBJddW1UqyZ1RaFB7sRKZ94sGChYpjH1dDAXWD1tJTszBNUSM63gTe_-VY_leNsGeY4DglaeBwdXV_QcQJ8-ImEIp3sZWUiTQTCWjQ91cjbnvS8jFBRYWI11ZkyZFJFLLc1tsYXWDSGcQ6QZz1OKyTlyWwZ7J5BxoGEqrX4B5L4Pip6vpjhe6w1x3QPIbfj01fPy_bVMusTNgM7lvGZlDumVx0CUXk-2PYcuW00nj7tyao1NB8Z9KgqYJWub5RPI1zkHLdfK647xtc',
    } satisfies ExploreFeatureDetail,
  },
  hiddenGems: {
    title: 'Hidden Gems',
    ctaLabel: 'View All',
    items: [
      {
        title: 'The Red Lighthouse',
        description: 'A nocturnal tour of the historic 1902 beacon and its hidden chambers.',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCBFjeeT3dJYW6Jp2cHVCA7XVcup2uuU0vPoniYX1qDhn9DQcWTr0rUzojiNGWk5P2JdxqBEexWXWnBs5iZHZScgi9GugsIIgbJW8PRnoE4TTtaBxG1EqyezRcZitnLjBSF8o0Fu8EyF684C2pLITOOOD832cGT3pzyd3xXHGq9WNq1OFXre-sanXlu_Iq2Tz2vMxsr4GGY2hq72wbVr9Sh-vea_6HXnC9MIvxxqneRuKVPA3aA2ZMtyV4buJ27bGFXRElQZ7TBKy8',
      },
      {
        title: 'Pink Salt Pans',
        description: 'Discover where the desert meets the sea in a surreal landscape of pink water.',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuC7DswLY8zqOIb9iDcjyR1gG8VJjEKdRFZrONWpG8BXd6nBiuL_h2BzdWJUxH4rP35v-vFX_1oUm9ntWI9HvsR8B0b20HkXBNDHS4rV6PH0YMrN9jZQvbzOK5VxPNo3lW9XpLq4s2HFRIwUw8PdwFbxyXjFbwQKe_pF1cn1_DdgUX6DKzmZk11PW8GDqy8YcaisPHABd_pK8G-bfdJxENgrdCdtGjjxiPByEpCIOMKU3FyMwTIj4MDwk8CNPrAEjR82Uj6yP6lmcv0',
      },
      {
        title: 'Art Alleyway',
        description: 'Guided walk through the evolving street art scene in the downtown district.',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCo-PHRiyIgPnNeHOoWN9VibSom9bcCeDOK9Ey3acqY_lwZJ7DBJrvlZHVTSrVR6wxsBsgK21e0Vr9X9XeS5N1e83aaRPbgrm26dPC0o5hihzm3fDCjQKy_bnjsM-YYraH-1fCpq6ydObN7VseNYW2YjqvPLoXoaV6zDd-mdCTm6m6L5rksLF6rL4aZ2ZjxfWinelc2nnQpNKbUIr5KlmyGmGEJw8yu471FXs29EiQlGHNg56NvfVGvz71YYuuHqwIyNUwekC6rCdTc',
      },
    ] satisfies ExploreHiddenGem[],
  },
  map: {
    title: 'Live Map',
    description: '42 active experiences available nearby.',
    ctaLabel: 'Expand View',
    centerCoordinate: [14.5266, -22.6784] as [number, number],
    markers: [
      { id: 'restaurant', coordinate: [14.514, -22.673], label: 'Eat', tone: 'accent' as const },
      { id: 'explore', coordinate: [14.543, -22.689], label: 'Go', tone: 'dark' as const },
    ],
  },
} as const;

export const exploreExperienceBookingContent = {
  badge: 'Bookable now',
  title: 'Desert Adrenaline',
  location: 'Swakopmund, Namibia',
  heroImageUri:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0wm5QppAYT1Y59Xf-t7Q8NjKOdQ3-1zbNaAKkUBFT7qlGx5lF3-HOvxHyYk56VsuncX4xuRuF7jkAdUWMXQ2tSg3ZYJjrueufiAq_zJIwBh0ZiynWwX2lAXETq5bYVMe-Pbg1JfD6SM67ZQdjxcMnfSpgfCnqFxlwtb5s8RIr9antErPacM3N0xtwD6CasUVxbKq012XAcU08p4qXob6ZsskdGdCzkdK_1w7_pq_vMLqPo4p9YBNX-EQQFwibYwFffcdWyU70EQ',
  price: 'N$1,850',
  priceSuffix: 'per rider',
  summary:
    'A dune-racing half day that starts with a guided 4x4 pickup, rolls into sandboarding sessions, and ends with a golden-hour ridge stop above the Atlantic line.',
  socialProof: {
    summary: 'Booked by 42 travelers from Germany this month',
    market: 'Germany',
  },
  highlights: ['4x4 dune transfer', 'Sandboard gear included', 'Golden-hour photo stop', 'Small group pace'],
  inclusions: ['Hotel pickup in Swakopmund', 'Certified desert guide', 'Boards, helmets, and safety brief', 'Cold drinks after the final run'],
  bookingSteps: [
    {
      title: 'Choose your day',
      description: 'Morning and sunset departures can both slot into your live trip plan.',
    },
    {
      title: 'Lock the experience',
      description: 'Reserve now and keep the booking attached to your itinerary timeline.',
    },
    {
      title: 'Pair a nearby stay',
      description: 'Bundle the ride with a stay close to the dunes for an easy early start.',
    },
  ],
  primaryActionLabel: 'Reserve experience',
  secondaryActionLabel: 'Stay nearby',
  nearbyStay: {
    eyebrow: 'Nearby stay',
    title: 'Jetty Dune House',
    description: 'A quiet design stay fifteen minutes from the launch point, with early breakfast and transfer support.',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDIgRTC0YEq2u30Xj5yarczjLpMTqhu3-_IBktzIAvq1hcwdGtF_kluCKj6Ogb_yVjO4vw20R0YQBM4ngBZENCtea03G-0gofqxWfIbEjI9xmr9Z7CasYlsGAHF_kPhx9PuiITSMKh0zgXBKAFtMI4m5KeTH31RQvRdcteeBOsgxIyzL_i7zvQxR8MKSq9s2jG4XiGjo7xS8SnD9FObcKhFxcG3EQfxN8EN_Cq454PGPmklpQB9msmZj9POseaeKU5zwZI2TmE6KSs',
  },
} as const satisfies ExploreExperienceBookingContent;
