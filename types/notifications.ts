import type { Id } from '@/convex/_generated/dataModel';

export type AppNotification = {
  _id: Id<'notices'>;
  recipientSlug: string;
  actorSlug?: string;
  kind:
    | 'friend_invite'
    | 'friend_added'
    | 'trip_invite'
    | 'trip_join_request'
    | 'trip_arrival'
    | 'trip_rating'
    | 'friend_call'
    | 'friend_call_reminder';
  title: string;
  body: string;
  actorName?: string | null;
  actorAvatarUri?: string | null;
  actorBaseLabel?: string | null;
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
