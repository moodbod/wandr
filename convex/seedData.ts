export * from './seeds/constants';
export * from './seeds/demoExploreBookings';
export * from './seeds/demoExploreTravelers';
export * from './seeds/seedExperiences';
export * from './seeds/seedHiddenGems';
export * from './seeds/seedRegions';

import { seedExperiences } from './seeds/seedExperiences';
import { seedHiddenGems } from './seeds/seedHiddenGems';

export const defaultExplorePageSeed = {
  slug: 'default',
  content: {
    home: {
      hero: {
        title: 'Explore Namibia',
        locationLabel: 'Windhoek, NA',
        centerCoordinate: [17.0832, -22.5609],
      },
      section: {
        eyebrow: 'Nationwide Picks',
        title: 'Start in Windhoek, then branch out',
      },
      activities: seedExperiences.filter((exp: any) => 
        ['windhoek-craft-market-walk', 'naankuse-wildlife-encounter', 'etosha-game-drive', 'sossusvlei-sunrise-drive'].includes(exp.slug)
      ),
    },
    search: {
      intro: {
        title: 'Explore Namibia',
        description: 'From Windhoek to the coast, desert, wildlife reserves, and river country, uncover trips that move across Namibia with real regional coverage.',
        tags: ['Namibia', 'Nationwide'],
        searchPlaceholder: 'Search Windhoek, Etosha, Sossusvlei...',
      },
      featured: {
        hero: {
          experienceSlug: 'etosha-game-drive',
          badge: 'Safari',
          title: 'Etosha Game Drive',
          description: 'Track elephants, lions, and late-afternoon herds around Etosha waterholes.',
          imageUri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0wm5QppAYT1Y59Xf-t7Q8NjKOdQ3-1zbNaAKkUBFT7qlGx5lF3-HOvxHyYk56VsuncX4xuRuF7jkAdUWMXQ2tSg3ZYJjrueufiAq_zJIwBh0ZiynWwX2lAXETq5bYVMe-Pbg1JfD6SM67ZQdjxcMnfSpgfCnqFxlwtb5s8RIr9antErPacM3N0xtwD6CasUVxbKq012XAcU08p4qXob6ZsskdGdCzkdK_1w7_pq_vMLqPo4p9YBNX-EQQFwibYwFffcdWyU70EQ',
          ctaLabel: 'Book Experience',
        },
        detail: {
          experienceSlug: 'windhoek-craft-market-walk',
          category: 'Culture',
          title: 'Windhoek Craft Walk',
          description: 'A capital-city route across design studios, coffee stops, and contemporary Namibian makers.',
          price: 'N$650',
          priceSuffix: '/pp',
          imageUri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJddW1UqyZ1RaFB7sRKZ94sGChYpjH1dDAXWD1tJTszBNUSM63gTe_-VY_leNsGeY4DglaeBwdXV_QcQJ8-ImEIp3sZWUiTQTCWjQ91cjbnvS8jFBRYWI11ZkyZFJFLLc1tsYXWDSGcQ6QZz1OKyTlyWwZ7J5BxoGEqrX4B5L4Pip6vpjhe6w1x3QPIbfj01fPy_bVMusTNgM7lvGZlDumVx0CUXk-2PYcuW00nj7tyao1NB8Z9KgqYJWub5RPI1zkHLdfK647xtc',
          ctaLabel: 'Book Experience',
        },
      },
      hiddenGems: {
        title: 'Hidden Gems',
        ctaLabel: 'View All',
        items: seedHiddenGems,
      },
      map: {
        title: 'Live Map',
        description: '12 active experiences spread across Namibia.',
        ctaLabel: 'Expand View',
        centerCoordinate: [17.0832, -22.5609],
      },
    },
    experiences: seedExperiences,
  },
} as const;

