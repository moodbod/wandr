import type { Id } from '@/convex/_generated/dataModel';

export type AppNotification = {
  _id: Id<'appNotifications'>;
  recipientSlug: string;
  actorSlug?: string;
  kind: 'friend_invite' | 'friend_added' | 'trip_invite' | 'trip_join_request' | 'trip_arrival' | 'trip_rating';
  title: string;
  body: string;
  href?: string;
  entityId?: string;
  entityLabel?: string;
  actionStatus?: 'pending' | 'approved' | 'declined';
  createdAt: number;
  viewedAt?: number;
  readAt?: number;
  isViewed: boolean;
  isRead: boolean;
};
