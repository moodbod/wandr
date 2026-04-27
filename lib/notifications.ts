import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const ARRIVAL_RADIUS_METERS = 180;
export const RATING_DELAY_SECONDS = 60 * 45;

const ARRIVAL_CHANNEL_ID = 'trip-arrivals';
const RATING_CHANNEL_ID = 'trip-ratings';
const ARRIVAL_CATEGORY_ID = 'tripArrival';
const RATING_CATEGORY_ID = 'tripRating';

export type TripNotificationPayload =
  | {
      kind: 'arrival';
      bookingId: string;
      experienceSlug: string;
      title: string;
      locationLabel?: string;
      imageUri?: string;
    }
  | {
      kind: 'rating';
      bookingId: string;
      experienceSlug: string;
      title: string;
      locationLabel?: string;
      imageUri?: string;
    };

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function serializeNotificationPayload(payload: TripNotificationPayload) {
  return {
    kind: payload.kind,
    bookingId: payload.bookingId,
    experienceSlug: payload.experienceSlug,
    title: payload.title,
    locationLabel: payload.locationLabel ?? '',
    imageUri: payload.imageUri ?? '',
  };
}

function getIosAttachments(imageUri?: string) {
  if (Platform.OS !== 'ios' || !imageUri) {
    return undefined;
  }

  return [
    {
      identifier: 'place-image',
      url: imageUri,
      type: 'image',
      typeHint: 'public.jpeg',
    },
  ];
}

export function parseTripNotificationPayload(
  data: Record<string, unknown> | undefined | null
): TripNotificationPayload | null {
  if (!data) {
    return null;
  }

  const kind = data.kind;
  const bookingId = data.bookingId;
  const experienceSlug = data.experienceSlug;
  const title = data.title;

  if (
    (kind !== 'arrival' && kind !== 'rating') ||
    typeof bookingId !== 'string' ||
    typeof experienceSlug !== 'string' ||
    typeof title !== 'string'
  ) {
    return null;
  }

  return {
    kind,
    bookingId,
    experienceSlug,
    title,
    locationLabel: typeof data.locationLabel === 'string' && data.locationLabel.length > 0 ? data.locationLabel : undefined,
    imageUri: typeof data.imageUri === 'string' && data.imageUri.length > 0 ? data.imageUri : undefined,
  };
}

export async function ensureNotificationSetupAsync() {
  if (Platform.OS === 'web') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ARRIVAL_CHANNEL_ID, {
      name: 'Trip arrivals',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: '#9fe870',
    });

    await Notifications.setNotificationChannelAsync(RATING_CHANNEL_ID, {
      name: 'Trip ratings',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#9fe870',
    });
  }

  await Notifications.setNotificationCategoryAsync(ARRIVAL_CATEGORY_ID, [
    {
      identifier: 'openTrip',
      buttonTitle: 'Open trip',
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(RATING_CATEGORY_ID, [
    {
      identifier: 'rateNow',
      buttonTitle: 'Rate now',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'leaveNote',
      buttonTitle: 'Leave note',
      options: { opensAppToForeground: true },
      textInput: {
        placeholder: 'Optional note',
        submitButtonTitle: 'Save',
      },
    },
  ]);

  const existingPermissions = await Notifications.getPermissionsAsync();
  if (existingPermissions.status === 'granted') {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.status === 'granted';
}

export async function presentArrivalNotification(payload: Extract<TripNotificationPayload, { kind: 'arrival' }>) {
  if (Platform.OS === 'web') {
    return null;
  }

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: 'You made it',
      body: `${payload.title} is right here. Open Wandr to keep the day moving.`,
      data: serializeNotificationPayload(payload),
      attachments: getIosAttachments(payload.imageUri),
      categoryIdentifier: ARRIVAL_CATEGORY_ID,
      ...(Platform.OS === 'android' ? { channelId: ARRIVAL_CHANNEL_ID } : null),
    },
    trigger: null,
  });
}

export async function scheduleRatingNotification(payload: Extract<TripNotificationPayload, { kind: 'rating' }>) {
  if (Platform.OS === 'web') {
    return null;
  }

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: `How was ${payload.title}?`,
      body: 'Leave a quick star rating and an optional note for your trip memory.',
      data: serializeNotificationPayload(payload),
      attachments: getIosAttachments(payload.imageUri),
      categoryIdentifier: RATING_CATEGORY_ID,
      ...(Platform.OS === 'android' ? { channelId: RATING_CHANNEL_ID } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: RATING_DELAY_SECONDS,
    },
  });
}

export async function presentRatingNotification(payload: Extract<TripNotificationPayload, { kind: 'rating' }>) {
  if (Platform.OS === 'web') {
    return null;
  }

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: `How was ${payload.title}?`,
      body: 'Tap to open Wandr and leave a quick star rating with an optional note.',
      data: serializeNotificationPayload(payload),
      attachments: getIosAttachments(payload.imageUri),
      categoryIdentifier: RATING_CATEGORY_ID,
      ...(Platform.OS === 'android' ? { channelId: RATING_CHANNEL_ID } : null),
    },
    trigger: null,
  });
}
