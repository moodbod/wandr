/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as explore from "../explore.js";
import type * as seedData from "../seedData.js";
import type * as seeds_constants from "../seeds/constants.js";
import type * as seeds_demoExploreBookings from "../seeds/demoExploreBookings.js";
import type * as seeds_demoExploreTravelers from "../seeds/demoExploreTravelers.js";
import type * as seeds_seedExperiences from "../seeds/seedExperiences.js";
import type * as seeds_seedHiddenGems from "../seeds/seedHiddenGems.js";
import type * as seeds_seedRegions from "../seeds/seedRegions.js";
import type * as tables_appUsers from "../tables/appUsers.js";
import type * as tables_experienceBookings from "../tables/experienceBookings.js";
import type * as tables_experiences from "../tables/experiences.js";
import type * as tables_hiddenGems from "../tables/hiddenGems.js";
import type * as tables_locationLikes from "../tables/locationLikes.js";
import type * as tables_regions from "../tables/regions.js";
import type * as trip from "../trip.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  explore: typeof explore;
  seedData: typeof seedData;
  "seeds/constants": typeof seeds_constants;
  "seeds/demoExploreBookings": typeof seeds_demoExploreBookings;
  "seeds/demoExploreTravelers": typeof seeds_demoExploreTravelers;
  "seeds/seedExperiences": typeof seeds_seedExperiences;
  "seeds/seedHiddenGems": typeof seeds_seedHiddenGems;
  "seeds/seedRegions": typeof seeds_seedRegions;
  "tables/appUsers": typeof tables_appUsers;
  "tables/experienceBookings": typeof tables_experienceBookings;
  "tables/experiences": typeof tables_experiences;
  "tables/hiddenGems": typeof tables_hiddenGems;
  "tables/locationLikes": typeof tables_locationLikes;
  "tables/regions": typeof tables_regions;
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
