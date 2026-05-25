/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appProfiles from "../appProfiles.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as authIdentity from "../authIdentity.js";
import type * as authSession from "../authSession.js";
import type * as calls from "../calls.js";
import type * as catalog from "../catalog.js";
import type * as explore from "../explore.js";
import type * as friends from "../friends.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as photos from "../photos.js";
import type * as profile from "../profile.js";
import type * as tables_bookings from "../tables/bookings.js";
import type * as tables_calls from "../tables/calls.js";
import type * as tables_circles from "../tables/circles.js";
import type * as tables_connections from "../tables/connections.js";
import type * as tables_dms from "../tables/dms.js";
import type * as tables_experiences from "../tables/experiences.js";
import type * as tables_gems from "../tables/gems.js";
import type * as tables_invites from "../tables/invites.js";
import type * as tables_likes from "../tables/likes.js";
import type * as tables_locations from "../tables/locations.js";
import type * as tables_matches from "../tables/matches.js";
import type * as tables_members from "../tables/members.js";
import type * as tables_messages from "../tables/messages.js";
import type * as tables_notices from "../tables/notices.js";
import type * as tables_reads from "../tables/reads.js";
import type * as tables_receipts from "../tables/receipts.js";
import type * as tables_regions from "../tables/regions.js";
import type * as tables_stays from "../tables/stays.js";
import type * as tables_threads from "../tables/threads.js";
import type * as tables_tokens from "../tables/tokens.js";
import type * as tables_trips from "../tables/trips.js";
import type * as trip from "../trip.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appProfiles: typeof appProfiles;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  authIdentity: typeof authIdentity;
  authSession: typeof authSession;
  calls: typeof calls;
  catalog: typeof catalog;
  explore: typeof explore;
  friends: typeof friends;
  http: typeof http;
  notifications: typeof notifications;
  photos: typeof photos;
  profile: typeof profile;
  "tables/bookings": typeof tables_bookings;
  "tables/calls": typeof tables_calls;
  "tables/circles": typeof tables_circles;
  "tables/connections": typeof tables_connections;
  "tables/dms": typeof tables_dms;
  "tables/experiences": typeof tables_experiences;
  "tables/gems": typeof tables_gems;
  "tables/invites": typeof tables_invites;
  "tables/likes": typeof tables_likes;
  "tables/locations": typeof tables_locations;
  "tables/matches": typeof tables_matches;
  "tables/members": typeof tables_members;
  "tables/messages": typeof tables_messages;
  "tables/notices": typeof tables_notices;
  "tables/reads": typeof tables_reads;
  "tables/receipts": typeof tables_receipts;
  "tables/regions": typeof tables_regions;
  "tables/stays": typeof tables_stays;
  "tables/threads": typeof tables_threads;
  "tables/tokens": typeof tables_tokens;
  "tables/trips": typeof tables_trips;
  trip: typeof trip;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
