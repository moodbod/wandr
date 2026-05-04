import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const userSettingsTable = defineTable({
  travelerSlug: v.string(),
  preferredCurrency: v.string(),
  distanceUnit: v.union(v.literal('km'), v.literal('mi')),
  temperatureUnit: v.union(v.literal('celsius'), v.literal('fahrenheit')),
  profileVisibility: v.union(v.literal('friends'), v.literal('public'), v.literal('private')),
  showSavedPlaces: v.boolean(),
  showTripActivity: v.boolean(),
  locationSharing: v.union(v.literal('off'), v.literal('whileUsing'), v.literal('tripOnly')),
  tripAlertsEnabled: v.boolean(),
  friendMessagesEnabled: v.boolean(),
  bookingUpdatesEnabled: v.boolean(),
  productUpdatesEnabled: v.boolean(),
  updatedAt: v.number(),
}).index('by_travelerSlug', ['travelerSlug']);
