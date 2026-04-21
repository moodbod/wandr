import type { Href } from 'expo-router';

export type ActionLink = {
  href: Href;
  label: string;
  description: string;
};

export type ContentSection = {
  title: string;
  items: string[];
};

export type HeaderActionKind =
  | 'avatar'
  | 'back'
  | 'favorite'
  | 'filter'
  | 'locate'
  | 'map'
  | 'search'
  | 'menu'
  | 'notifications'
  | 'settings'
  | 'share';

export type HeaderAction = {
  kind: HeaderActionKind;
  accessibilityLabel?: string;
  href?: Href;
  onPress?: () => void;
  isActive?: boolean;
  tone?: 'plain' | 'surface';
};

export type HeaderConfig = {
  leadingAction?: HeaderAction;
  overlay?: boolean;
  searchPlaceholder?: string;
  showLogo?: boolean;
  subtitle?: string;
  title?: string;
  trailingActions?: HeaderAction[];
};

export type WandrScreenContent = {
  header: HeaderConfig;
  eyebrow: string;
  title: string;
  description: string;
  actionsTitle?: string;
  actions?: ActionLink[];
  sections?: ContentSection[];
};

export const appContent = {
  exploreHome: {
    header: {
      overlay: true,
      trailingActions: [{ kind: 'search', accessibilityLabel: 'Search experiences', href: '/explore/search' }],
    },
    eyebrow: 'Wandr',
    title: 'Explore',
    description:
      'Main discovery hub for places, stories, and local experiences. This scaffold is based on the explore home concept from the design folder.',
    actionsTitle: 'Child screens',
    actions: [
      {
        href: '/explore/search',
        label: 'Search discovery',
        description: 'Browse experiences, tastes, and hidden spots from an Explore search flow.',
      },
      {
        href: '/explore/desert-adrenaline',
        label: 'Experience booking',
        description: 'Booking-first experience detail with highlights, pricing, and next-step actions.',
      },
    ],
    sections: [
      {
        title: 'Planned content',
        items: [
          'Featured destination hero for the current city or region.',
          'Quick category chips for adventure, food, culture, stays, and nightlife.',
          'Trending moments or local stories surfaced from editorial content.',
        ],
      },
    ],
  },
  exploreSearch: {
    header: {
      leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
      searchPlaceholder: 'Search experiences, spots...',
      trailingActions: [],
    },
    eyebrow: 'Explore',
    title: 'Discovery',
    description:
      'Search-led explore screen for experiences, tastes, and hidden spots. This maps to the kinetic discovery mockup.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Large search field with location-aware suggestions.',
          'Featured experience cards such as desert adrenaline and local food routes.',
          'A hidden gems section for editorial picks and off-grid moments.',
        ],
      },
    ],
  },
  exploreStories: {
    header: {
      leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
      title: 'Experience',
      subtitle: 'Booking details',
      trailingActions: [{ kind: 'favorite', tone: 'surface', accessibilityLabel: 'Save experience' }],
    },
    eyebrow: 'Explore',
    title: 'Experience booking',
    description:
      'Booking-first experience detail screen with immersive media, trip-fit context, and clear actions into reservation or stay pairing.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Immersive hero media anchored by a primary booking decision.',
          'Experience highlights, inclusions, and confidence-building social proof.',
          'Actions that move the traveler into reservation, itinerary, or nearby stays.',
        ],
      },
    ],
  },
  tripHome: {
    header: {
      title: 'Trip',
      trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications' }],
    },
    eyebrow: 'Wandr',
    title: 'Trip',
    description:
      'Core saved-trip screen for itinerary planning. This starts with the day plan concept and branches into map-based route viewing.',
    actionsTitle: 'Child screens',
    actions: [
      {
        href: '/(tabs)/trip',
        label: 'Day plan',
        description: 'Daily itinerary with times, activities, and booking-focused moments.',
      },
      {
        href: '/trip/map',
        label: 'Trip map',
        description: 'Route and timeline view for navigating a trip day spatially.',
      },
    ],
    sections: [
      {
        title: 'Planned content',
        items: [
          'Day-by-day schedule cards with time, status, and transport context.',
          'Upcoming booking or reservation summary for the active day.',
          'Quick links into route map, saved places, and logistics.',
        ],
      },
    ],
  },
  tripDayPlan: {
    header: {
      leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
      title: 'Day plan',
      trailingActions: [],
    },
    eyebrow: 'Trip',
    title: 'Day plan',
    description:
      'Daily itinerary scaffold for activities, bookings, and pacing through a single trip day.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Activity timeline with start times, durations, and status.',
          'Featured booking card for the next major experience of the day.',
          'Contextual actions for transport, notes, and saved contacts.',
        ],
      },
    ],
  },
  tripMap: {
    header: {
      leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
      title: 'Trip map',
      trailingActions: [{ kind: 'map', accessibilityLabel: 'Open map tools' }],
    },
    eyebrow: 'Trip',
    title: 'Trip map',
    description:
      'Map-plus-timeline screen for visualizing trip stops, movement, and the route for the current day.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Map hero with current route, key stops, and transport context.',
          'Timeline blocks synchronized to map markers.',
          'Quick jump actions for navigation, check-ins, and place details.',
        ],
      },
    ],
  },
  staysHome: {
    header: {
      title: 'Stays',
      trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications' }],
    },
    eyebrow: 'Wandr',
    title: 'Stays',
    description:
      'Accommodation browsing starts here with a map-first search experience and links into detailed property pages.',
    actionsTitle: 'Child screens',
    actions: [
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
    ],
    sections: [
      {
        title: 'Planned content',
        items: [
          'Search input with filters for dates, price, and vibe.',
          'Pin-based map with synced result cards beneath it.',
          'A highlight card for featured stays and editorial picks.',
        ],
      },
    ],
  },
  staysMapSearch: {
    header: {
      leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
      title: 'Map search',
      trailingActions: [],
    },
    eyebrow: 'Stays',
    title: 'Map search',
    description:
      'Accommodation browsing scaffold built around a search input, map context, and synced stay cards.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Search bar with destination, dates, and occupancy filters.',
          'Interactive map with nearby stay markers.',
          'Swipeable result cards with price, photos, and short summaries.',
        ],
      },
    ],
  },
  stayDetails: {
    header: {
      leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
      title: 'Stay details',
      trailingActions: [],
    },
    eyebrow: 'Stays',
    title: 'Stay details',
    description:
      'Property detail scaffold with reviews, amenity storytelling, and local neighborhood context.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Large media header with name, location, and primary booking action.',
          'Description, amenity highlights, and stay personality section.',
          'Guest journals, ratings, and neighborhood guidance below the fold.',
        ],
      },
    ],
  },
  squadHome: {
    header: {
      title: 'Squad',
      trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications' }],
    },
    eyebrow: 'Wandr',
    title: 'Squad',
    description:
      'Social travel flow for matching with compatible travelers and moving into a shared group chat.',
    actionsTitle: 'Child screens',
    actions: [
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
    ],
    sections: [
      {
        title: 'Planned content',
        items: [
          'Traveler match cards with shared interests and overlapping dates.',
          'Invite and accept actions for building a temporary travel squad.',
          'Shared planning updates once a match becomes a group chat.',
        ],
      },
    ],
  },
  squadDiscover: {
    header: {
      leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
      title: 'Squad discovery',
      trailingActions: [],
    },
    eyebrow: 'Squad',
    title: 'Squad discovery',
    description:
      'Matching screen scaffold for finding travelers with a similar destination, vibe, and schedule.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Traveler cards with avatars, compatibility tags, and destination overlap.',
          'Short bios and travel style signals to help with quick decisions.',
          'Invite, pass, and shortlist actions for forming a temporary squad.',
        ],
      },
    ],
  },
  squadChat: {
    header: {
      leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
      title: 'The Safari Squad',
      subtitle: '4 active members',
      trailingActions: [{ kind: 'settings', accessibilityLabel: 'Squad settings' }],
    },
    eyebrow: 'Squad',
    title: 'Squad chat',
    description:
      'Group chat scaffold for route sharing, message threads, and travel coordination once a squad is active.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Live message feed for group planning and quick decisions.',
          'Pinned updates like route changes, polls, or shared plans.',
          'Composer with attachments for maps, places, and itinerary links.',
        ],
      },
    ],
  },
  profileHome: {
    header: {
      leadingAction: { kind: 'menu', accessibilityLabel: 'Open menu' },
      title: 'Profile',
      trailingActions: [],
    },
    eyebrow: 'Wandr',
    title: 'Profile',
    description:
      'Traveler identity hub for stats, preferences, and progress. This is scaffolded from the profile overview design.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Traveler level, badges, and recent activity summary.',
          'Saved preferences for trip style, budget, and favorite experiences.',
          'Quick actions for editing profile details and reviewing upcoming trips.',
        ],
      },
    ],
  },
  profileOverview: {
    header: {
      leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
      title: 'Profile overview',
      trailingActions: [],
    },
    eyebrow: 'Profile',
    title: 'Profile overview',
    description:
      'Dedicated overview screen scaffold if you want profile opened from other flows outside the bottom tabs.',
    sections: [
      {
        title: 'Planned content',
        items: [
          'Traveler identity summary and visual level progression.',
          'History of recent trips, favorites, and saved places.',
          'Settings and profile editing actions grouped below the main summary.',
        ],
      },
    ],
  },
} satisfies Record<string, WandrScreenContent>;

export type WandrScreenKey = keyof typeof appContent;
