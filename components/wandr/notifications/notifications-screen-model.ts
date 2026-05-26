import type { AppNotification } from '@/types/notifications';

export function formatRelativeTime(timestamp: number) {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function isRecentNotification(notification: AppNotification) {
  return Date.now() - notification.createdAt <= 7 * 24 * 60 * 60 * 1000;
}

function isFriendRequestNotification(notification: AppNotification) {
  return (
    notification.kind === 'friend_invite' &&
    Boolean(notification.actorSlug) &&
    (notification.actionStatus === 'pending' ||
      notification.href === '/notifications' ||
      notification.entityId === notification.actorSlug)
  );
}

export function getRequestStatus(notification: AppNotification) {
  if (notification.actionStatus === 'approved' || notification.actionStatus === 'declined') {
    return notification.actionStatus;
  }

  if (notification.kind === 'trip_invite' || notification.kind === 'trip_join_request' || isFriendRequestNotification(notification)) {
    return 'pending';
  }

  return null;
}
