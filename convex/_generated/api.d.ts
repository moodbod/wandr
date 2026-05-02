/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calls from "../calls.js";
import type * as explore from "../explore.js";
import type * as friends from "../friends.js";
import type * as locationPhotos from "../locationPhotos.js";
import type * as notifications from "../notifications.js";
import type * as sedd from "../sedd.js";
import type * as seed from "../seed.js";
import type * as seeds_constants from "../seeds/constants.js";
import type * as seeds_demoExploreBookings from "../seeds/demoExploreBookings.js";
import type * as seeds_demoExploreTravelers from "../seeds/demoExploreTravelers.js";
import type * as seeds_seedExperiences from "../seeds/seedExperiences.js";
import type * as seeds_seedFriends from "../seeds/seedFriends.js";
import type * as seeds_seedHiddenGems from "../seeds/seedHiddenGems.js";
import type * as seeds_seedRegions from "../seeds/seedRegions.js";
import type * as seeds_seedStays from "../seeds/seedStays.js";
import type * as tables_appNotifications from "../tables/appNotifications.js";
import type * as tables_appUsers from "../tables/appUsers.js";
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
import type * as trip from "../trip.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  calls: typeof calls;
  explore: typeof explore;
  friends: typeof friends;
  locationPhotos: typeof locationPhotos;
  notifications: typeof notifications;
  sedd: typeof sedd;
  seed: typeof seed;
  "seeds/constants": typeof seeds_constants;
  "seeds/demoExploreBookings": typeof seeds_demoExploreBookings;
  "seeds/demoExploreTravelers": typeof seeds_demoExploreTravelers;
  "seeds/seedExperiences": typeof seeds_seedExperiences;
  "seeds/seedFriends": typeof seeds_seedFriends;
  "seeds/seedHiddenGems": typeof seeds_seedHiddenGems;
  "seeds/seedRegions": typeof seeds_seedRegions;
  "seeds/seedStays": typeof seeds_seedStays;
  "tables/appNotifications": typeof tables_appNotifications;
  "tables/appUsers": typeof tables_appUsers;
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
