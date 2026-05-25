import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { ChatCircleDots, CheckCircle, Compass, UsersThree } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { WandrAvatar } from '@/components/wandr/avatar';
import { WandrHeader } from '@/components/wandr/header';
import { LargeScreenPanel, LargeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { AppMapWorkspace } from '@/components/wandr/maps/app-map-workspace';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useResponsive } from '@/hooks/use-responsive';
import {
  acceptFriendRequestRef,
  acceptTripInviteRef,
  approveTripJoinRequestRef,
  listNotificationsRef,
  markNotificationsReadRef,
  markNotificationsViewedRef,
} from '@/lib/convex';
import type { AppNotification } from '@/types/notifications';

function formatRelativeTime(timestamp: number) {
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

function isRecentNotification(notification: AppNotification) {
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

function getRequestStatus(notification: AppNotification) {
  if (notification.actionStatus === 'approved' || notification.actionStatus === 'declined') {
    return notification.actionStatus;
  }

  if (notification.kind === 'trip_invite' || notification.kind === 'trip_join_request' || isFriendRequestNotification(notification)) {
    return 'pending';
  }

  return null;
}

function NotificationIcon({ kind, unread }: { kind: AppNotification['kind']; unread: boolean }) {
  const isDark = useColorScheme() === 'dark';
  const color = unread
    ? designSystem.colors.darkGreen
    : isDark
      ? designSystem.colors.darkMutedText
      : designSystem.colors.gray;

  switch (kind) {
    case 'friend_invite':
      return <UsersThree color={color} size={20} weight="bold" />;
    case 'friend_added':
      return <CheckCircle color={color} size={20} weight="fill" />;
    case 'trip_invite':
      return <UsersThree color={color} size={20} weight="bold" />;
    case 'trip_join_request':
      return <UsersThree color={color} size={20} weight="fill" />;
    case 'trip_arrival':
      return <Compass color={color} size={20} weight="bold" />;
    case 'trip_rating':
      return <ChatCircleDots color={color} size={20} weight="bold" />;
    case 'friend_call':
    case 'friend_call_reminder':
      return <ChatCircleDots color={color} size={20} weight="fill" />;
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { isLargeScreen } = useResponsive();
  const traveler = useCurrentTraveler();
  const travelerSlug = traveler?.slug;
  const notifications = useQuery(listNotificationsRef, travelerSlug ? { travelerSlug } : 'skip');
  const acceptFriendRequest = useMutation(acceptFriendRequestRef);
  const acceptTripInvite = useMutation(acceptTripInviteRef);
  const approveTripJoinRequest = useMutation(approveTripJoinRequestRef);
  const markRead = useMutation(markNotificationsReadRef);
  const markViewed = useMutation(markNotificationsViewedRef);
  const viewedRequestsRef = useRef(new Set<string>());
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const unreadNotifications = useMemo(
    () => notifications?.filter((notification) => !notification.isRead) ?? [],
    [notifications]
  );
  const isLoading = traveler === undefined || notifications === undefined;
  const visibleNotifications = filter === 'unread' ? unreadNotifications : (notifications ?? []);
  const recentNotifications = visibleNotifications.filter(isRecentNotification);
  const olderNotifications = visibleNotifications.filter((notification) => !isRecentNotification(notification));

  useEffect(() => {
    if (!travelerSlug || !notifications || notifications.length === 0) {
      return;
    }

    const unviewedIds = notifications
      .filter((notification) => !notification.isViewed && !viewedRequestsRef.current.has(notification._id))
      .map((notification) => notification._id);

    if (unviewedIds.length === 0) {
      return;
    }

    for (const notificationId of unviewedIds) {
      viewedRequestsRef.current.add(notificationId);
    }

    void markViewed({
      travelerSlug,
      notificationIds: unviewedIds,
    });
  }, [markViewed, notifications, travelerSlug]);

  const handleMarkAllRead = () => {
    if (!travelerSlug || unreadNotifications.length === 0) {
      return;
    }

    void markRead({
      travelerSlug,
      notificationIds: unreadNotifications.map((notification) => notification._id),
    });
  };

  const handleNotificationPress = (notification: AppNotification) => {
    if (!travelerSlug) {
      return;
    }

    if (!notification.isRead) {
      void markRead({
        travelerSlug,
        notificationIds: [notification._id],
      });
    }

    if (notification.href) {
      router.push(notification.href as never);
    }
  };

  const handleAcceptRequest = async (notification: AppNotification) => {
    if (!travelerSlug || busyRequestId) {
      return;
    }

    setBusyRequestId(notification._id);
    try {
      if (notification.kind === 'friend_invite') {
        await acceptFriendRequest({
          travelerSlug,
          notificationId: notification._id,
        });
      } else if (notification.kind === 'trip_invite') {
        await acceptTripInvite({
          travelerSlug,
          notificationId: notification._id,
        });
      } else {
        await approveTripJoinRequest({
          travelerSlug,
          notificationId: notification._id,
        });
      }
    } finally {
      setBusyRequestId(null);
    }
  };

  const content = (
    <>
      {!isLargeScreen ? (
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          }}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: isLargeScreen ? insets.top + 24 : insets.top + 72,
            paddingBottom: insets.bottom + 64,
          },
        ]}>
        <View style={styles.controlsRow}>
          <View style={styles.tabsWrap}>
            <SegmentedTabs
              value={filter}
              options={[
                { key: 'all', label: 'All' },
                { key: 'unread', label: unreadNotifications.length > 0 ? `Unread ${unreadNotifications.length}` : 'Unread' },
              ]}
              onChange={setFilter}
            />
          </View>
          {unreadNotifications.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={handleMarkAllRead} hitSlop={8}>
              <ThemedText style={[styles.markReadText, isDark ? styles.markReadTextDark : null]}>
                Mark all read
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.list}>
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={`notification-skeleton-${index}`} style={styles.notificationSkeleton} />
            ))}
          </View>
        ) : visibleNotifications.length === 0 && filter === 'all' ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyTitle}>No notifications yet</ThemedText>
          </View>
        ) : visibleNotifications.length === 0 ? (
          <View style={styles.emptyUnreadState} />
        ) : (
          <View style={styles.list}>
            {recentNotifications.length > 0 ? (
              <NotificationSection
                title="Last 7 days"
                notifications={recentNotifications}
                busyRequestId={busyRequestId}
                onAcceptRequest={handleAcceptRequest}
                onPressNotification={handleNotificationPress}
              />
            ) : null}
            {olderNotifications.length > 0 ? (
              <NotificationSection
                title="Earlier"
                notifications={olderNotifications}
                busyRequestId={busyRequestId}
                onAcceptRequest={handleAcceptRequest}
                onPressNotification={handleNotificationPress}
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </>
  );

  if (isLargeScreen) {
    return (
      <ThemedView style={styles.root}>
        <LargeScreenWorkspace mapContent={<AppMapWorkspace />}>
          <LargeScreenPanel kind="main">
            {content}
          </LargeScreenPanel>
        </LargeScreenWorkspace>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.root}>
      {content}
    </ThemedView>
  );
}

function NotificationSection({
  title,
  notifications,
  busyRequestId,
  onAcceptRequest,
  onPressNotification,
}: {
  title: string;
  notifications: AppNotification[];
  busyRequestId: string | null;
  onAcceptRequest: (notification: AppNotification) => void;
  onPressNotification: (notification: AppNotification) => void;
}) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.rows}>
        {notifications.map((notification) => (
          <NotificationRow
            key={notification._id}
            notification={notification}
            isBusy={busyRequestId === notification._id}
            onAccept={() => onAcceptRequest(notification)}
            onPress={() => onPressNotification(notification)}
          />
        ))}
      </View>
    </View>
  );
}

function NotificationRow({
  notification,
  isBusy,
  onAccept,
  onPress,
}: {
  notification: AppNotification;
  isBusy: boolean;
  onAccept: () => void;
  onPress: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const unread = !notification.isRead;
  const iconBackground = unread
    ? designSystem.colors.limeSoft
    : isDark
      ? designSystem.colors.darkSurface
      : designSystem.colors.surface;
  const requestStatus =
    getRequestStatus(notification);
  const requestLabel =
    notification.kind === 'friend_invite'
      ? 'friend request'
      : notification.kind === 'trip_invite'
        ? 'trip invite'
        : 'trip join request';
  const isPendingRequest = requestStatus === 'pending';
  const showActorAvatar = Boolean(notification.actorSlug);
  const actorName = notification.actorName ?? notification.actorSlug ?? '';
  const actorBaseLabel = notification.actorBaseLabel;
  const requestActionText = notification.kind === 'friend_invite' ? 'sent a request' : notification.body;
  const inlineActionText = showActorAvatar
    ? requestActionText
    : notification.title;
  const inlineMeta =
    requestStatus && !isPendingRequest
      ? `${formatRelativeTime(notification.createdAt)} · ${requestStatus === 'approved' ? 'Approved' : 'Declined'}`
      : formatRelativeTime(notification.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !notification.href }}
      disabled={!notification.href && notification.isRead}
      onPress={onPress}
      style={styles.row}
    >
      {showActorAvatar ? (
        <WandrAvatar
          name={notification.actorName ?? notification.actorSlug ?? 'Wandr'}
          paletteKey={notification.actorSlug}
          size={52}
          uri={notification.actorAvatarUri}
          style={styles.actorAvatar}
        />
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
          <NotificationIcon kind={notification.kind} unread={unread} />
        </View>
      )}

      <View style={styles.rowCopy}>
        {showActorAvatar ? (
          <>
            <View style={styles.actorTitleRow}>
              <View style={styles.actorTitleCopy}>
                <ThemedText style={styles.actorName} numberOfLines={1}>
                  {actorName}
                </ThemedText>
                {actorBaseLabel ? (
                  <ThemedText style={styles.actorBaseLabel} numberOfLines={1}>
                    {actorBaseLabel}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText style={styles.rowTime}>{inlineMeta}</ThemedText>
            </View>
            <ThemedText style={styles.rowBody} numberOfLines={2}>{inlineActionText}</ThemedText>
          </>
        ) : (
          <>
            <View style={styles.messageLine}>
              <ThemedText style={styles.rowMessage} numberOfLines={2}>
                {inlineActionText}
                {' '}
                <ThemedText style={styles.rowTime}>{inlineMeta}</ThemedText>
              </ThemedText>
            </View>
            {!requestStatus ? (
              <ThemedText style={styles.rowBody} numberOfLines={2}>{notification.body}</ThemedText>
            ) : null}
          </>
        )}
      </View>

      {isPendingRequest ? (
        <View style={styles.requestActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Accept ${requestLabel}`}
            disabled={isBusy}
            onPress={(event) => {
              event.stopPropagation();
              onAccept();
            }}
            style={[
              styles.requestButton,
              styles.approveButton,
              isDark ? styles.approveButtonDark : null,
              isBusy ? styles.requestButtonDisabled : null,
            ]}>
            <ThemedText style={styles.approveButtonText}>{isBusy ? '...' : 'Accept'}</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.lg,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
  },
  tabsWrap: {
    flex: 1,
  },
  markReadText: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.darkGreen,
  },
  markReadTextDark: {
    color: designSystem.colors.lime,
  },
  emptyState: {
    paddingTop: designSystem.spacing.md,
  },
  emptyUnreadState: {
    minHeight: 1,
  },
  emptyTitle: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  list: {
    gap: designSystem.spacing.xl,
  },
  notificationSkeleton: {
    height: 76,
    borderRadius: 24,
  },
  section: {
    gap: designSystem.spacing.md,
  },
  sectionTitle: {
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  rows: {
    gap: designSystem.spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.md,
    minHeight: 66,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorAvatar: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  messageLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.sm,
  },
  actorTitleCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rowMessage: {
    ...designSystem.type.cardTitle,
    color: designSystem.colors.ink,
  },
  actorName: {
    ...designSystem.type.cardTitle,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  actorBaseLabel: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.gray,
    flexShrink: 1,
  },
  rowTime: {
    ...designSystem.type.cardTitle,
    color: designSystem.colors.gray,
  },
  rowBody: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.warmDark,
  },
  requestActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  requestButton: {
    minHeight: 30,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    paddingHorizontal: designSystem.spacing.sm,
  },
  approveButton: {
    backgroundColor: designSystem.colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderAccent,
  },
  approveButtonDark: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  approveButtonText: {
    ...designSystem.type.label,
    color: designSystem.colors.darkGreen,
  },
});
