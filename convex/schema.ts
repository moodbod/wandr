import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import { appUsersTable } from './tables/appUsers';
import { experienceBookingsTable } from './tables/experienceBookings';
import { experiencesTable } from './tables/experiences';
import { hiddenGemsTable } from './tables/hiddenGems';
import { locationLikesTable } from './tables/locationLikes';
import { regionsTable } from './tables/regions';
import { tripsTable } from './tables/trips';

export default defineSchema({
  regions: regionsTable,
  trips: tripsTable,
  experiences: experiencesTable,

  experienceRatings: defineTable({
    experienceSlug: v.string(),
    travelerSlug: v.string(),
    rating: v.number(),
    review: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_experience', ['experienceSlug'])
    .index('by_experienceSlug_and_travelerSlug', ['experienceSlug', 'travelerSlug']),

  travelerProfiles: defineTable({
    travelerSlug: v.string(),
    name: v.string(),
    avatarUri: v.optional(v.string()),
    regionCode: v.string(), // e.g. "DE", "ZA", "NA"
    regionName: v.string(), // e.g. "Germany", "South Africa"
  }).index('by_slug', ['travelerSlug']),
  hiddenGems: hiddenGemsTable,

  appUsers: appUsersTable,
  experienceBookings: experienceBookingsTable,
  locationLikes: locationLikesTable,
  tripVisits: defineTable({
    bookingId: v.id('experienceBookings'),
    tripId: v.optional(v.id('trips')),
    travelerSlug: v.string(),
    experienceSlug: v.string(),
    arrivedAt: v.number(),
    arrivalSource: v.union(v.literal('gps'), v.literal('manual')),
    coordinate: v.optional(v.array(v.number())),
  })
    .index('by_bookingId', ['bookingId'])
    .index('by_tripId_and_arrivedAt', ['tripId', 'arrivedAt'])
    .index('by_travelerSlug_and_arrivedAt', ['travelerSlug', 'arrivedAt']),
});
