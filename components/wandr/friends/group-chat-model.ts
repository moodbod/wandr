import type { FriendChatMessage } from '@/types/friends';

const scheduleDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const scheduleClockFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export const quickMessageByKey: Record<string, string> = {
  sunrise: 'We should lock the sunrise departure now so everyone packs for the same timing.',
  checkin: 'Quick check-in: what does everyone need before we lock the next leg?',
};

export function getReplyPreview(message: FriendChatMessage) {
  if (message.routeCard) {
    return message.routeCard.title;
  }
  if (message.callCard) {
    return message.callCard.title;
  }
  if (message.body?.startsWith('wandr:sticker:')) {
    return 'Sticker';
  }
  if (message.body?.startsWith('wandr:gif:')) {
    return 'GIF';
  }
  if (message.body?.startsWith('wandr:media:')) {
    try {
      const media = JSON.parse(decodeURIComponent(message.body.replace('wandr:media:', ''))) as {
        kind?: string;
        title?: string;
      };
      return media.title ?? (media.kind === 'gif' ? 'GIF' : 'Sticker');
    } catch {
      return 'Media';
    }
  }
  return message.body ?? 'Message';
}

export function formatScheduleDate(timestamp: number) {
  return scheduleDateFormatter.format(new Date(timestamp));
}

export function formatScheduleClock(timestamp: number) {
  return scheduleClockFormatter.format(new Date(timestamp));
}

export function addMinutes(timestamp: number, minutes: number) {
  return timestamp + minutes * 60_000;
}

export function clampScheduledTimestamp(timestamp: number) {
  const now = Date.now();
  return Math.min(Math.max(timestamp, now + 60_000), now + 365 * 24 * 60 * 60_000);
}

export const reminderOptions = [0, 5, 15, 30, 60, 1440];

export function formatReminder(minutes: number) {
  if (minutes === 0) {
    return 'At time of event';
  }
  if (minutes === 1440) {
    return '1 day before';
  }
  if (minutes >= 60) {
    return `${minutes / 60} hour${minutes === 60 ? '' : 's'} before`;
  }
  return `${minutes} minutes before`;
}
