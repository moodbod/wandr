import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { noticesTable } from './tables/notices';
import { tokensTable } from './tables/tokens';
import { bookingsTable } from './tables/bookings';
import { experiencesTable } from './tables/experiences';
import { membersTable } from './tables/members';
import { readsTable } from './tables/reads';
import { connectionsTable } from './tables/connections';
import { callsTable } from './tables/calls';
import { circlesTable } from './tables/circles';
import { dmsTable } from './tables/dms';
import { receiptsTable } from './tables/receipts';
import { threadsTable } from './tables/threads';
import { matchesTable } from './tables/matches';
import { messagesTable } from './tables/messages';
import { gemsTable } from './tables/gems';
import { locationsTable } from './tables/locations';
import { likesTable } from './tables/likes';
import { regionsTable } from './tables/regions';
import { staysTable } from './tables/stays';
import { invitesTable } from './tables/invites';
import { tripsTable } from './tables/trips';
import { sharedLocationsTable } from './tables/sharedLocations';

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

    preferredCurrency: v.optional(v.string()),
    distanceUnit: v.optional(v.union(v.literal('km'), v.literal('mi'))),
    temperatureUnit: v.optional(v.union(v.literal('celsius'), v.literal('fahrenheit'))),
    profileVisibility: v.optional(v.union(v.literal('friends'), v.literal('public'), v.literal('private'))),
    showSavedPlaces: v.optional(v.boolean()),
    showTripActivity: v.optional(v.boolean()),
    locationSharing: v.optional(v.union(v.literal('off'), v.literal('whileUsing'), v.literal('tripOnly'))),
    showOtherUsersLiveLocation: v.optional(v.boolean()),
    tripAlertsEnabled: v.optional(v.boolean()),
    messagesEnabled: v.optional(v.boolean()),
    bookingUpdatesEnabled: v.optional(v.boolean()),
    productUpdatesEnabled: v.optional(v.boolean()),
    settingsUpdatedAt: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('by_slug', ['slug']),
  ...authTablesWithoutUsers,

  regions: regionsTable,
  trips: tripsTable,
  invites: invitesTable,
  experiences: experiencesTable,

  ratings: defineTable({
    experienceSlug: v.string(),
    travelerSlug: v.string(),
    rating: v.number(),
    review: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_experience', ['experienceSlug'])
    .index('by_experienceSlug_and_travelerSlug', ['experienceSlug', 'travelerSlug']),

  reviews: defineTable({
    staySlug: v.string(),
    travelerSlug: v.string(),
    rating: v.number(),
    review: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_staySlug', ['staySlug'])
    .index('by_staySlug_and_travelerSlug', ['staySlug', 'travelerSlug']),

  gems: gemsTable,
  locations: locationsTable,
  stays: staysTable,
  notices: noticesTable,
  tokens: tokensTable,
  circles: circlesTable,
  members: membersTable,
  reads: readsTable,
  messages: messagesTable,
  receipts: receiptsTable,
  threads: threadsTable,
  dms: dmsTable,
  matches: matchesTable,
  connections: connectionsTable,
  calls: callsTable,
  sharedLocations: sharedLocationsTable,

  bookings: bookingsTable,
  likes: likesTable,
  adminAuditEvents: defineTable({
    actorUserId: v.id('users'),
    actorSlug: v.string(),
    actorName: v.optional(v.string()),
    action: v.union(
      v.literal('role.update'),
      v.literal('content.create'),
      v.literal('content.update'),
      v.literal('content.status'),
      v.literal('content.migrate'),
      v.literal('request.status'),
      v.literal('photo.status')
    ),
    targetKind: v.union(
      v.literal('user'),
      v.literal('location'),
      v.literal('experience'),
      v.literal('stay'),
      v.literal('booking'),
      v.literal('reservation'),
      v.literal('photo'),
      v.literal('catalog')
    ),
    targetId: v.string(),
    targetLabel: v.optional(v.string()),
    summary: v.string(),
    createdAt: v.number(),
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_actorSlug_and_createdAt', ['actorSlug', 'createdAt'])
    .index('by_targetKind_and_createdAt', ['targetKind', 'createdAt'])
    .index('by_action_and_createdAt', ['action', 'createdAt']),
  photos: defineTable({
    locationKind: v.union(v.literal('location'), v.literal('experience'), v.literal('stay')),
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
  visits: defineTable({
    bookingId: v.id('bookings'),
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
  reservations: defineTable({
    staySlug: v.string(),
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
    checkIn: v.number(),
    checkOut: v.number(),
    status: v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled')),
    totalPrice: v.number(),
    bookedAt: v.number(),
    roomTypeId: v.optional(v.string()),
    roomCount: v.optional(v.number()),
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
    .index('by_staySlug_and_status_and_checkIn', ['staySlug', 'status', 'checkIn'])
    .index('by_status_and_bookedAt', ['status', 'bookedAt'])
    .index('by_travelerSlug', ['travelerSlug'])
    .index('by_travelerSlug_and_bookedAt', ['travelerSlug', 'bookedAt'])
    .index('by_travelerSlug_and_staySlug_and_bookedAt', ['travelerSlug', 'staySlug', 'bookedAt'])
    .index('by_tripId', ['tripId']),
});
