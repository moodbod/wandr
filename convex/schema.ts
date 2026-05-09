import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { appNotificationsTable } from './tables/appNotifications';
import { devicePushTokensTable } from './tables/devicePushTokens';
import { experienceBookingsTable } from './tables/experienceBookings';
import { experiencesTable } from './tables/experiences';
import { friendCircleMembersTable } from './tables/friendCircleMembers';
import { friendCircleReadStatesTable } from './tables/friendCircleReadStates';
import { friendConnectionsTable } from './tables/friendConnections';
import { friendCallsTable } from './tables/friendCalls';
import { friendCirclesTable } from './tables/friendCircles';
import { friendDirectMessagesTable } from './tables/friendDirectMessages';
import { friendDirectReadStatesTable } from './tables/friendDirectReadStates';
import { friendDirectThreadsTable } from './tables/friendDirectThreads';
import { friendMatchActionsTable } from './tables/friendMatchActions';
import { friendMessagesTable } from './tables/friendMessages';
import { friendProfilesTable } from './tables/friendProfiles';
import { hiddenGemsTable } from './tables/hiddenGems';
import { locationLikesTable } from './tables/locationLikes';
import { regionsTable } from './tables/regions';
import { staysTable } from './tables/stays';
import { tripInvitesTable } from './tables/tripInvites';
import { tripsTable } from './tables/trips';
import { userSettingsTable } from './tables/userSettings';

const { users: _authUsersTable, ...authTablesWithoutUsers } = authTables;

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    slug: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    countryLabel: v.optional(v.string()),
    role: v.optional(v.union(v.literal('traveler'), v.literal('admin'))),
    homeCity: v.optional(v.string()),
    travelStyle: v.optional(v.union(v.literal('solo'), v.literal('couple'), v.literal('friends'), v.literal('family'))),
    onboardingCompletedAt: v.optional(v.number()),

    avatarUri: v.optional(v.string()),
    avatarStorageId: v.optional(v.id('_storage')),
    regionCode: v.optional(v.string()),
    regionName: v.optional(v.string()),
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    baseLabel: v.optional(v.string()),
    destinationLabel: v.optional(v.string()),
    discoverViewCount: v.optional(v.number()),
    travelPace: v.optional(v.union(v.literal('slow'), v.literal('balanced'), v.literal('fast'))),
    vibe: v.optional(
      v.union(
        v.literal('adventure'),
        v.literal('culture'),
        v.literal('social'),
        v.literal('relaxation'),
        v.literal('food')
      )
    ),
    arrivalWindowLabel: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    profileUpdatedAt: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('by_slug', ['slug']),
  ...authTablesWithoutUsers,

  regions: regionsTable,
  trips: tripsTable,
  tripInvites: tripInvitesTable,
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

  stayRatings: defineTable({
    staySlug: v.string(),
    travelerSlug: v.string(),
    rating: v.number(),
    review: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_staySlug', ['staySlug'])
    .index('by_staySlug_and_travelerSlug', ['staySlug', 'travelerSlug']),

  travelerProfiles: defineTable({
    travelerSlug: v.string(),
    name: v.string(),
    avatarUri: v.optional(v.string()),
    avatarStorageId: v.optional(v.id('_storage')),
    regionCode: v.string(), // e.g. "DE", "ZA", "NA"
    regionName: v.string(), // e.g. "Germany", "South Africa"
  }).index('by_slug', ['travelerSlug']),
  hiddenGems: hiddenGemsTable,
  stays: staysTable,
  appNotifications: appNotificationsTable,
  devicePushTokens: devicePushTokensTable,
  friendProfiles: friendProfilesTable,
  friendCircles: friendCirclesTable,
  friendCircleMembers: friendCircleMembersTable,
  friendCircleReadStates: friendCircleReadStatesTable,
  friendMessages: friendMessagesTable,
  friendDirectReadStates: friendDirectReadStatesTable,
  friendDirectThreads: friendDirectThreadsTable,
  friendDirectMessages: friendDirectMessagesTable,
  friendMatchActions: friendMatchActionsTable,
  friendConnections: friendConnectionsTable,
  friendCalls: friendCallsTable,

  userSettings: userSettingsTable,
  experienceBookings: experienceBookingsTable,
  locationLikes: locationLikesTable,
  locationPhotos: defineTable({
    locationKind: v.union(v.literal('experience'), v.literal('stay')),
    locationSlug: v.string(),
    travelerSlug: v.string(),
    storageId: v.id('_storage'),
    caption: v.optional(v.string()),
    source: v.union(v.literal('user'), v.literal('host')),
    status: v.union(v.literal('approved'), v.literal('pending'), v.literal('rejected')),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
  })
    .index('by_location_and_status', ['locationKind', 'locationSlug', 'status'])
    .index('by_status_and_createdAt', ['status', 'createdAt'])
    .index('by_travelerSlug_and_createdAt', ['travelerSlug', 'createdAt']),
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
  stayBookings: defineTable({
    staySlug: v.string(),
    travelerSlug: v.string(),
    checkIn: v.number(),
    checkOut: v.number(),
    status: v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled')),
    totalPrice: v.number(),
    bookedAt: v.number(),
    stayBookingDetails: v.optional(
      v.object({
        guestCounts: v.object({
          adults: v.number(),
          children: v.number(),
        }),
        roomCount: v.number(),
        roomTypeId: v.string(),
        roomTypeLabel: v.string(),
        bedOptionId: v.string(),
        bedOptionLabel: v.string(),
        arrivalWindowId: v.string(),
        arrivalWindowLabel: v.string(),
        specialRequest: v.optional(v.string()),
        guestSummary: v.string(),
        roomSummary: v.string(),
      })
    ),
  })
    .index('by_staySlug', ['staySlug'])
    .index('by_status_and_bookedAt', ['status', 'bookedAt'])
    .index('by_travelerSlug', ['travelerSlug'])
    .index('by_travelerSlug_and_bookedAt', ['travelerSlug', 'bookedAt']),
});
