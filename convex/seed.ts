import type { MutationCtx } from './_generated/server';
import { mutation } from './_generated/server';
import { demoExploreBookings } from './seeds/demoExploreBookings';
import { demoExploreTravelers } from './seeds/demoExploreTravelers';
import { seedExperiences } from './seeds/seedExperiences';
import { seedHiddenGems } from './seeds/seedHiddenGems';
import { seedRegions } from './seeds/seedRegions';

export const seed = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    // 1. Clear existing data
    const experiences = await ctx.db.query('experiences').collect();
    for (const experience of experiences) {
      await ctx.db.delete(experience._id);
    }

    const gems = await ctx.db.query('hiddenGems').collect();
    for (const gem of gems) {
      await ctx.db.delete(gem._id);
    }

    const regions = await ctx.db.query('regions').collect();
    for (const region of regions) {
      await ctx.db.delete(region._id);
    }

    const travelers = await ctx.db.query('appUsers').collect();
    for (const traveler of travelers) {
      await ctx.db.delete(traveler._id);
    }

    const travelerProfiles = await ctx.db.query('travelerProfiles').collect();
    for (const travelerProfile of travelerProfiles) {
      await ctx.db.delete(travelerProfile._id);
    }

    const bookings = await ctx.db.query('experienceBookings').collect();
    for (const booking of bookings) {
      await ctx.db.delete(booking._id);
    }

    const stays = await ctx.db.query('stays').collect();
    for (const stay of stays) {
      await ctx.db.delete(stay._id);
    }

    const trips = await ctx.db.query('trips').collect();
    for (const trip of trips) {
      await ctx.db.delete(trip._id);
    }

    // 2. Seed Regions
    const regionIds: Record<string, any> = {};
    for (const region of seedRegions) {
      const id = await ctx.db.insert('regions', region);
      regionIds[region.name] = id;
    }

    // 3. Seed Experiences
    for (const experience of seedExperiences) {
      const regionId = experience.geography?.region ? regionIds[experience.geography.region] : undefined;
      const isHero = experience.slug === 'etosha-game-drive';
      const isDetail = experience.slug === 'windhoek-craft-market-walk';
      const isActivity = ['windhoek-craft-market-walk', 'naankuse-wildlife-encounter', 'etosha-game-drive', 'sossusvlei-sunrise-drive'].includes(experience.slug);

      await ctx.db.insert('experiences', {
        ...experience,
        regionId,
        isFeaturedHero: isHero,
        isFeaturedDetail: isDetail,
        isActivityCard: isActivity,
      } as any);
    }

    // 4. Seed Hidden Gems
    for (const gem of seedHiddenGems) {
      const regionId = gem.geography?.region ? regionIds[gem.geography.region] : undefined;
      await ctx.db.insert('hiddenGems', {
        ...gem,
        regionId,
      } as any);
    }

    // 5. Seed Stays
    const stayProperties = [
      {
        slug: 'olive-grove-lofts',
        name: 'Olive Grove Lofts',
        locationLabel: 'Windhoek West',
        town: 'Windhoek',
        region: 'Khomas',
        coordinate: [17.0788, -22.5661],
        imageUri: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 148,
        currencyCode: 'USD',
        rating: 4.8,
        reviewCount: 214,
        stayStyle: 'design',
        routeVibe: 'city reset',
        sleepSignal: 'Good first or last night before a long drive.',
        summary: 'A calm, design-led base close to cafés, fuel stops, and an easy airport run.',
        idealFor: ['arrival night', 'remote work', 'short city reset'],
        amenities: ['fast wifi', 'breakfast', 'secure parking', 'late check-in'],
        nearbyHighlights: ['Independence Avenue', 'craft walk', 'coffee courtyard'],
        guestJournals: [
          {
            name: 'Marcus Thorne',
            avatarUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
            visitedAtLabel: 'Visited Oct 2023',
            quote: 'Good first or last night before a long drive. Waking up near Windhoek West changed the pacing of the whole route.',
          },
          {
            name: 'Lena Headey',
            avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
            visitedAtLabel: 'Visited Sep 2023',
            quote: 'Minimal, comfortable, and exactly where we needed it. The route fit mattered more than we expected.',
          },
        ],
        bookingNote: 'Best when you want a smooth city landing without overcommitting your first day.',
      },
      {
        slug: 'naankuse-bush-lodge',
        name: 'Naankuse Bush Lodge',
        locationLabel: 'Near Naankuse Reserve',
        town: 'Windhoek',
        region: 'Khomas',
        coordinate: [17.232, -22.434],
        imageUri: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 196,
        currencyCode: 'USD',
        rating: 4.7,
        reviewCount: 143,
        stayStyle: 'lodge',
        routeVibe: 'wildlife stop',
        sleepSignal: 'Smart if your trip opens with wildlife outside Windhoek.',
        summary: 'Bush-facing suites with enough comfort to feel restorative after a flight or reserve drive.',
        idealFor: ['wildlife day', 'quiet reset', 'couples'],
        amenities: ['pool', 'game-drive desk', 'parking', 'dinner service'],
        nearbyHighlights: ['reserve entrance', 'sunset deck', 'animal rehabilitation center'],
        bookingNote: 'Worth it when you want your first sleep to already feel like the trip has started.',
      },
      {
        slug: 'jetty-quarter-house',
        name: 'Jetty Quarter House',
        locationLabel: 'Swakopmund Jetty',
        town: 'Swakopmund',
        region: 'Erongo',
        coordinate: [14.5038, -22.6784],
        imageUri: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 182,
        currencyCode: 'USD',
        rating: 4.9,
        reviewCount: 321,
        stayStyle: 'design',
        routeVibe: 'coast base',
        sleepSignal: 'Best base for multiple Swakopmund activities without repacking.',
        summary: 'A polished coastal stay a short walk from the jetty, restaurants, and beach air after a driving day.',
        idealFor: ['2-3 night coast stop', 'food route', 'walkable base'],
        amenities: ['breakfast', 'ocean-view lounge', 'parking', 'laundry'],
        nearbyHighlights: ['Jetty district', 'old town', 'beach promenade'],
        bookingNote: 'A strong choice if your route stacks Swakopmund, dunes, and Walvis Bay together.',
      },
      {
        slug: 'lagoon-tide-suites',
        name: 'Lagoon Tide Suites',
        locationLabel: 'Walvis Bay Lagoon',
        town: 'Walvis Bay',
        region: 'Erongo',
        coordinate: [14.5062, -22.9551],
        imageUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 164,
        currencyCode: 'USD',
        rating: 4.6,
        reviewCount: 188,
        stayStyle: 'wellness',
        routeVibe: 'coast base',
        sleepSignal: 'Helpful when you want sunrise lagoon access before getting back on the road.',
        summary: 'Quiet lagoon-side suites with easy departures for Sandwich Harbour and coastal mornings.',
        idealFor: ['sunrise starts', 'lagoon kayaking', 'one-night stopover'],
        amenities: ['spa corner', 'secure parking', 'breakfast', 'airport transfer'],
        nearbyHighlights: ['lagoon boardwalk', 'flamingo lookout', 'harbour road'],
        bookingNote: 'Ideal if you prefer a calmer sleep than central Swakopmund.',
      },
      {
        slug: 'spitzkoppe-star-camp',
        name: 'Spitzkoppe Star Camp',
        locationLabel: 'Spitzkoppe Massif',
        town: 'Spitzkoppe',
        region: 'Erongo',
        coordinate: [15.1962, -21.8235],
        imageUri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 138,
        currencyCode: 'USD',
        rating: 4.8,
        reviewCount: 117,
        stayStyle: 'roadside',
        routeVibe: 'desert night',
        sleepSignal: 'A memorable overnight when you want the route itself to feel cinematic.',
        summary: 'Simple but unforgettable sleep under granite domes and exceptionally dark skies.',
        idealFor: ['stargazing', 'one-night route break', 'photography'],
        amenities: ['guided stargazing', 'braai area', 'parking', 'sunrise access'],
        nearbyHighlights: ['arch rock', 'sunset hill', 'night sky platform'],
        bookingNote: 'Less luxury, more atmosphere. Best when the trip needs one iconic overnight.',
      },
      {
        slug: 'damaraland-courtyard-lodge',
        name: 'Damaraland Courtyard Lodge',
        locationLabel: 'Near Twyfelfontein',
        town: 'Khorixas',
        region: 'Kunene',
        coordinate: [14.382, -20.5901],
        imageUri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 172,
        currencyCode: 'USD',
        rating: 4.7,
        reviewCount: 166,
        stayStyle: 'lodge',
        routeVibe: 'wildlife stop',
        sleepSignal: 'Useful when Damaraland becomes a real overnight, not just a pass-through.',
        summary: 'A grounded lodge for splitting the long coast-to-north drive and waking up close to the rock art circuit.',
        idealFor: ['self-drive pacing', 'heritage stop', '2-day northwest loop'],
        amenities: ['dinner service', 'parking', 'pool', 'guide desk'],
        nearbyHighlights: ['Twyfelfontein', 'desert elephant routes', 'rock formations'],
        bookingNote: 'Best for reducing fatigue on the northwest leg of the route.',
      },
      {
        slug: 'etosha-waterhole-lodge',
        name: 'Etosha Waterhole Lodge',
        locationLabel: 'Okaukuejo Gate Area',
        town: 'Etosha',
        region: 'Oshikoto',
        coordinate: [15.9061, -19.1799],
        imageUri: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1549366021-9f761d450615?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 224,
        currencyCode: 'USD',
        rating: 4.9,
        reviewCount: 402,
        stayStyle: 'lodge',
        routeVibe: 'wildlife stop',
        sleepSignal: 'The obvious move if your route includes an Etosha sunrise or late waterhole session.',
        summary: 'A high-confidence safari sleep with early gate access and enough comfort to recover between drives.',
        idealFor: ['safari nights', 'families', 'sunrise game drive'],
        amenities: ['pool', 'safari desk', 'breakfast', 'family rooms'],
        nearbyHighlights: ['Okaukuejo waterhole', 'gate road', 'wildlife briefing deck'],
        bookingNote: 'Strongest when Etosha is one of the trip anchors, not just a quick stop.',
      },
      {
        slug: 'sesriem-dune-house',
        name: 'Sesriem Dune House',
        locationLabel: 'Sesriem Gate',
        town: 'Sossusvlei',
        region: 'Hardap',
        coordinate: [15.349, -24.7312],
        imageUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 236,
        currencyCode: 'USD',
        rating: 4.8,
        reviewCount: 259,
        stayStyle: 'wellness',
        routeVibe: 'desert night',
        sleepSignal: 'Makes the early dune start actually doable and worth it.',
        summary: 'Minimal-luxury suites right where you want them for sunrise access and a slow desert evening.',
        idealFor: ['sunrise launch', 'honeymoon energy', 'one iconic splurge'],
        amenities: ['sunset deck', 'pool', 'breakfast packs', 'parking'],
        nearbyHighlights: ['Sesriem Gate', 'Deadvlei drive', 'sunset dune ridge'],
        bookingNote: 'High value if you want the desert light without a punishing wake-up from far away.',
      },
      {
        slug: 'namibrand-sky-lodge',
        name: 'NamibRand Sky Lodge',
        locationLabel: 'NamibRand Reserve',
        town: 'NamibRand',
        region: 'Hardap',
        coordinate: [16.1019, -25.0465],
        imageUri: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80&fit=crop',
        galleryImages: [
          'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80&fit=crop',
          'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&fit=crop',
        ],
        pricePerNight: 268,
        currencyCode: 'USD',
        rating: 4.9,
        reviewCount: 145,
        stayStyle: 'wellness',
        routeVibe: 'desert night',
        sleepSignal: 'For a route segment that deserves a real dark-sky overnight.',
        summary: 'The most atmospheric sleep in the set: silent desert, star decks, and a long exhale after the road.',
        idealFor: ['dark sky stay', 'slow travel', 'post-Sossusvlei reset'],
        amenities: ['star deck', 'full board', 'guided astronomy', 'parking'],
        nearbyHighlights: ['dark sky reserve', 'sunset drive', 'dune plain'],
        bookingNote: 'Choose this when the overnight itself should be part of the story, not just logistics.',
      },
    ] as const;

    for (const stay of stayProperties) {
      const regionId = stay.region ? regionIds[stay.region] : undefined;
      await ctx.db.insert('stays', {
        ...stay,
        regionId,
      } as any);
    }

    // 6. Seed Travelers
    for (const traveler of demoExploreTravelers) {
      await ctx.db.insert('appUsers', {
        slug: traveler.slug,
        name: traveler.name,
        countryCode: traveler.countryCode,
        countryLabel: traveler.countryLabel,
      });
      await ctx.db.insert('travelerProfiles', {
        travelerSlug: traveler.slug,
        name: traveler.name,
        avatarUri: traveler.avatarUri,
        regionCode: traveler.countryCode,
        regionName: traveler.countryLabel,
      });
    }

    // 7. Seed Bookings
    for (const booking of demoExploreBookings) {
      await ctx.db.insert('experienceBookings', {
        ...booking,
        bookedAt: Date.now(),
      } as any);
    }

    return { success: true };
  },
});
