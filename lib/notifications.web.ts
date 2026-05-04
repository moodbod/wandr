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

export function parseTripNotificationPayload() {
  return null;
}

export async function ensureNotificationSetupAsync() {
  return false;
}

export async function getDevicePushRegistrationAsync() {
  return null;
}

export async function presentArrivalNotification() {
  return null;
}

export async function presentIncomingFriendCallNotification() {
  return null;
}

export async function scheduleRatingNotification() {
  return null;
}

export async function cancelScheduledRatingNotification() {
  return null;
}
