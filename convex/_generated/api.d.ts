/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as calls from "../calls.js";
import type * as explore from "../explore.js";
import type * as friends from "../friends.js";
import type * as http from "../http.js";
import type * as locationPhotos from "../locationPhotos.js";
import type * as notifications from "../notifications.js";
import type * as profile from "../profile.js";
import type * as tables_appNotifications from "../tables/appNotifications.js";
import type * as tables_appUsers from "../tables/appUsers.js";
import type * as tables_devicePushTokens from "../tables/devicePushTokens.js";
import type * as tables_experienceBookings from "../tables/experienceBookings.js";
import type * as tables_experiences from "../tables/experiences.js";
import type * as tables_friendCalls from "../tables/friendCalls.js";
import type * as tables_friendCircleMembers from "../tables/friendCircleMembers.js";
import type * as tables_friendCircleReadStates from "../tables/friendCircleReadStates.js";
import type * as tables_friendCircles from "../tables/friendCircles.js";
import type * as tables_friendConnections from "../tables/friendConnections.js";
import type * as tables_friendDirectMessages from "../tables/friendDirectMessages.js";
import type * as tables_friendDirectReadStates from "../tables/friendDirectReadStates.js";
import type * as tables_friendDirectThreads from "../tables/friendDirectThreads.js";
import type * as tables_friendMatchActions from "../tables/friendMatchActions.js";
import type * as tables_friendMessages from "../tables/friendMessages.js";
import type * as tables_friendProfiles from "../tables/friendProfiles.js";
import type * as tables_hiddenGems from "../tables/hiddenGems.js";
import type * as tables_locationLikes from "../tables/locationLikes.js";
import type * as tables_regions from "../tables/regions.js";
import type * as tables_stays from "../tables/stays.js";
import type * as tables_tripInvites from "../tables/tripInvites.js";
import type * as tables_trips from "../tables/trips.js";
import type * as tables_userSettings from "../tables/userSettings.js";
import type * as trip from "../trip.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  calls: typeof calls;
  explore: typeof explore;
  friends: typeof friends;
  http: typeof http;
  locationPhotos: typeof locationPhotos;
  notifications: typeof notifications;
  profile: typeof profile;
  "tables/appNotifications": typeof tables_appNotifications;
  "tables/appUsers": typeof tables_appUsers;
  "tables/devicePushTokens": typeof tables_devicePushTokens;
  "tables/experienceBookings": typeof tables_experienceBookings;
  "tables/experiences": typeof tables_experiences;
  "tables/friendCalls": typeof tables_friendCalls;
  "tables/friendCircleMembers": typeof tables_friendCircleMembers;
  "tables/friendCircleReadStates": typeof tables_friendCircleReadStates;
  "tables/friendCircles": typeof tables_friendCircles;
  "tables/friendConnections": typeof tables_friendConnections;
  "tables/friendDirectMessages": typeof tables_friendDirectMessages;
  "tables/friendDirectReadStates": typeof tables_friendDirectReadStates;
  "tables/friendDirectThreads": typeof tables_friendDirectThreads;
  "tables/friendMatchActions": typeof tables_friendMatchActions;
  "tables/friendMessages": typeof tables_friendMessages;
  "tables/friendProfiles": typeof tables_friendProfiles;
  "tables/hiddenGems": typeof tables_hiddenGems;
  "tables/locationLikes": typeof tables_locationLikes;
  "tables/regions": typeof tables_regions;
  "tables/stays": typeof tables_stays;
  "tables/tripInvites": typeof tables_tripInvites;
  "tables/trips": typeof tables_trips;
  "tables/userSettings": typeof tables_userSettings;
  trip: typeof trip;
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
