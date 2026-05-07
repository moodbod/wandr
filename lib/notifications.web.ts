export const ARRIVAL_RADIUS_METERS = 180;
export const RATING_DELAY_SECONDS = 60 * 45;

export const CHAT_CHANNEL_ID = 'friend-chat-messages';
export const VOICE_CALL_CHANNEL_ID = 'friend-voice-calls';
export const VIDEO_CALL_CHANNEL_ID = 'friend-video-calls';
export const VOICE_CALL_SOUND = 'voice_call_ring.wav';
export const VIDEO_CALL_SOUND = 'video_call_ring.wav';
export const FRIEND_CALL_CATEGORY_ID = 'friendCall';
export const FRIEND_CALL_ANSWER_ACTION_ID = 'answerFriendCall';
export const FRIEND_CALL_DECLINE_ACTION_ID = 'declineFriendCall';

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

const scheduledNotifications = new Map<string, ReturnType<typeof setTimeout>>();

function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
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

function getNotificationTag(payload: TripNotificationPayload) {
  return `wandr-${payload.kind}-${payload.bookingId}`;
}

function presentBrowserNotification({
  body,
  payload,
  title,
}: {
  body: string;
  payload: TripNotificationPayload;
  title: string;
}) {
  if (!canUseBrowserNotifications() || window.Notification.permission !== 'granted') {
    return null;
  }

  return new window.Notification(title, {
    body,
    data: serializeNotificationPayload(payload),
    icon: '/wandr-favicon.png',
    tag: getNotificationTag(payload),
  });
}

export function parseTripNotificationPayload(data?: Record<string, unknown> | null): TripNotificationPayload | null {
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
  if (!canUseBrowserNotifications()) {
    return false;
  }

  if (window.Notification.permission === 'granted') {
    return true;
  }

  if (window.Notification.permission === 'denied') {
    return false;
  }

  const permission = await window.Notification.requestPermission();
  return permission === 'granted';
}

export async function getDevicePushRegistrationAsync() {
  return null;
}

export async function presentArrivalNotification(payload: Extract<TripNotificationPayload, { kind: 'arrival' }>) {
  const hasPermission = await ensureNotificationSetupAsync();
  if (!hasPermission) {
    return null;
  }

  return presentBrowserNotification({
    title: 'You made it',
    body: `${payload.title} is right here. Open Wandr to keep the day moving.`,
    payload,
  });
}

export async function presentIncomingFriendCallNotification() {
  return null;
}

export async function scheduleRatingNotification(payload: Extract<TripNotificationPayload, { kind: 'rating' }>) {
  const hasPermission = await ensureNotificationSetupAsync();
  if (!hasPermission) {
    return null;
  }

  const tag = getNotificationTag(payload);
  const existingTimeout = scheduledNotifications.get(tag);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeout = setTimeout(() => {
    void presentBrowserNotification({
      title: `How was ${payload.title}?`,
      body: 'Leave a quick star rating and an optional note for your trip memory.',
      payload,
    });
    scheduledNotifications.delete(tag);
  }, RATING_DELAY_SECONDS * 1000);

  scheduledNotifications.set(tag, timeout);
  return tag;
}

export async function cancelScheduledRatingNotification(identifier?: string | null) {
  if (!identifier) {
    return null;
  }

  const timeout = scheduledNotifications.get(identifier);
  if (timeout) {
    clearTimeout(timeout);
    scheduledNotifications.delete(identifier);
  }

  return null;
}
