import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const staysTable = defineTable({
  slug: v.string(),
  managerSlug: v.optional(v.string()),
  name: v.string(),
  locationLabel: v.string(),
  town: v.string(),
  region: v.string(),
  countryCode: v.optional(v.string()),
  countryLabel: v.optional(v.string()),
  planningLocationId: v.optional(v.string()),
  coordinate: v.array(v.number()),
  imageUri: v.string(),
  galleryImages: v.array(v.string()),
  pricePerNight: v.number(),
  currencyCode: v.string(),
  rating: v.number(),
  reviewCount: v.number(),
  stayStyle: v.union(
    v.literal('design'),
    v.literal('lodge'),
    v.literal('roadside'),
    v.literal('wellness')
  ),
  routeVibe: v.union(
    v.literal('city reset'),
    v.literal('coast base'),
    v.literal('wildlife stop'),
    v.literal('desert night')
  ),
  sleepSignal: v.string(),
  summary: v.string(),
  idealFor: v.array(v.string()),
  amenities: v.array(v.string()),
  nearbyHighlights: v.array(v.string()),
  bookingProfile: v.optional(
    v.object({
      roomOptions: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          detail: v.string(),
          maxAdults: v.number(),
          maxChildren: v.number(),
          maxRooms: v.number(),
          bedOptions: v.array(
            v.object({
              id: v.string(),
              label: v.string(),
            })
          ),
        })
      ),
      arrivalOptions: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
        })
      ),
      defaultRoomOptionId: v.string(),
      defaultArrivalOptionId: v.string(),
    })
  ),
  guestJournals: v.optional(
    v.array(
      v.object({
        name: v.string(),
        avatarUri: v.string(),
        visitedAtLabel: v.string(),
        quote: v.string(),
      })
    )
  ),
  bookingNote: v.string(),
  bookingUrl: v.optional(v.string()),
  bookingProvider: v.optional(v.string()),
  regionId: v.optional(v.id('regions')),
})
  .index('by_slug', ['slug'])
  .index('by_managerSlug', ['managerSlug'])
  .index('by_region', ['region'])
  .index('by_town', ['town']);
