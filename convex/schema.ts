import { defineSchema } from 'convex/server';

import { appUsersTable } from './tables/appUsers';
import { experienceBookingsTable } from './tables/experienceBookings';
import { experiencesTable } from './tables/experiences';
import { hiddenGemsTable } from './tables/hiddenGems';
import { locationLikesTable } from './tables/locationLikes';
import { regionsTable } from './tables/regions';

export default defineSchema({
  regions: regionsTable,
  experiences: experiencesTable,
  hiddenGems: hiddenGemsTable,

  appUsers: appUsersTable,
  experienceBookings: experienceBookingsTable,
  locationLikes: locationLikesTable,
});