import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';

export const listNotificationsRef = makeFunctionReference<'query', { travelerSlug: string }, any[]>(
  'notifications:listNotifications'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;

export const markNotificationsReadRef = makeFunctionReference<
  'mutation', { travelerSlug: string; notificationIds?: Id<'notices'>[] }, boolean
>('notifications:markNotificationsRead') as FunctionReference<'mutation', 'public', any, boolean>;

export const markNotificationsViewedRef = makeFunctionReference<
  'mutation', { travelerSlug: string; notificationIds?: Id<'notices'>[] }, boolean
>('notifications:markNotificationsViewed') as FunctionReference<'mutation', 'public', any, boolean>;

export const createTripNotificationRef = makeFunctionReference<
  'mutation',
  { recipientSlug: string; kind: 'trip_arrival' | 'trip_rating'; title: string; body: string; href?: string; entityId?: string; entityLabel?: string },
  boolean
>('notifications:createTripNotification') as FunctionReference<'mutation', 'public', any, boolean>;

export const registerDevicePushTokenRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; installationId: string; expoPushToken: string; platform: 'ios' | 'android' },
  boolean
>('notifications:registerDevicePushToken') as FunctionReference<'mutation', 'public', any, boolean>;
