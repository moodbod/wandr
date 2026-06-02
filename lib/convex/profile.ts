import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { AdminUserRole } from './client';

export type UserSettings = {
  travelerSlug: string;
  preferredCurrency: string;
  distanceUnit: 'km' | 'mi';
  temperatureUnit: 'celsius' | 'fahrenheit';
  profileVisibility: 'friends' | 'public' | 'private';
  showSavedPlaces: boolean;
  showTripActivity: boolean;
  locationSharing: 'off' | 'whileUsing' | 'tripOnly';
  showOtherUsersLiveLocation: boolean;
  tripAlertsEnabled: boolean;
  messagesEnabled: boolean;
  bookingUpdatesEnabled: boolean;
  productUpdatesEnabled: boolean;
  updatedAt: number | null;
};

export const getTravelerProfileRef = makeFunctionReference<
  'query', { travelerSlug?: string }, any
>('trip:getCurrentTravelerProfile') as FunctionReference<'query', 'public', { travelerSlug?: string }, any>;

export const getUserSettingsRef = makeFunctionReference<
  'query', { travelerSlug?: string }, UserSettings | null
>('profile:getUserSettings') as FunctionReference<'query', 'public', { travelerSlug?: string }, UserSettings | null>;

export const generateAvatarUploadUrlRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'profile:generateAvatarUploadUrl'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const updateTravelerProfileRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; name: string; countryCode: string; countryLabel: string; homeCity?: string; travelStyle?: 'solo' | 'couple' | 'friends' | 'family'; avatarStorageId?: Id<'_storage'>; clearAvatar?: boolean },
  boolean
>('profile:updateTravelerProfile') as FunctionReference<'mutation', 'public', any, boolean>;

export const updateExperiencePreferencesRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; preferredCurrency: string; distanceUnit: 'km' | 'mi'; temperatureUnit: 'celsius' | 'fahrenheit' },
  boolean
>('profile:updateExperiencePreferences') as FunctionReference<'mutation', 'public', any, boolean>;

export const updatePrivacySettingsRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; profileVisibility: 'friends' | 'public' | 'private'; showSavedPlaces: boolean; showTripActivity: boolean; locationSharing: 'off' | 'whileUsing' | 'tripOnly'; showOtherUsersLiveLocation: boolean },
  boolean
>('profile:updatePrivacySettings') as FunctionReference<'mutation', 'public', any, boolean>;

export const updateNotificationSettingsRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; tripAlertsEnabled: boolean; messagesEnabled: boolean; bookingUpdatesEnabled: boolean; productUpdatesEnabled: boolean },
  boolean
>('profile:updateNotificationSettings') as FunctionReference<'mutation', 'public', any, boolean>;
