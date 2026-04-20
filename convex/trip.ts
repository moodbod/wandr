import { queryGeneric } from 'convex/server';
import { v } from 'convex/values';

export const getUserItinerary = queryGeneric({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    // Get bookings
    const bookings = await ctx.db
      .query('experienceBookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) => q.eq('travelerSlug', args.travelerSlug))
      .collect();

    if (bookings.length === 0) {
      return [];
    }

    // Get experiences from default page
    const page = await ctx.db
      .query('explorePages')
      .withIndex('by_slug', (q) => q.eq('slug', 'default'))
      .unique();

    if (!page || !page.experiences) {
      return [];
    }

    // Map bookings to experiences
    const itinerary = bookings
      .map((booking) => {
        const experience = page.experiences!.find((e) => e.slug === booking.experienceSlug);
        if (!experience) return null;
        return {
          ...booking,
          experience,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => a.bookedAt - b.bookedAt);

    return itinerary;
  },
});
