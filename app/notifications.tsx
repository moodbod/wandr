import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Bell, CaretRight, ChatCircleDots, CheckCircle, Compass, UsersThree } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import {
  approveTripJoinRequestRef,
  declineTripJoinRequestRef,
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
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const traveler = useCurrentTraveler();
  const travelerSlug = traveler?.slug;
  const notifications = useQuery(listNotificationsRef, travelerSlug ? { travelerSlug } : 'skip');
  const approveTripJoinRequest = useMutation(approveTripJoinRequestRef);
  const declineTripJoinRequest = useMutation(declineTripJoinRequestRef);
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
  const hasNotifications = Boolean(notifications && notifications.length > 0);
  const emptyTitle = filter === 'unread' && hasNotifications ? 'All caught up' : 'Nothing new yet';
  const emptyBody =
    filter === 'unread' && hasNotifications
      ? 'Every notification has been read. Switch back to all to revisit older trip updates and friend activity.'
      : 'Friend invites, trip prompts, and join requests will collect here when they need your attention.';

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

  const handleApproveRequest = async (notification: AppNotification) => {
    if (!travelerSlug || busyRequestId) {
      return;
    }

    setBusyRequestId(notification._id);
    try {
      await approveTripJoinRequest({
        travelerSlug,
        notificationId: notification._id,
      });
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleDeclineRequest = async (notification: AppNotification) => {
    if (!travelerSlug || busyRequestId) {
      return;
    }

    setBusyRequestId(notification._id);
    try {
      await declineTripJoinRequest({
        travelerSlug,
        notificationId: notification._id,
      });
    } finally {
      setBusyRequestId(null);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 88,
            paddingBottom: insets.bottom + 64,
          },
        ]}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Notifications</ThemedText>
          {unreadNotifications.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={handleMarkAllRead} hitSlop={8}>
              <ThemedText style={[styles.markReadText, isDark ? styles.markReadTextDark : null]}>
                Mark all read
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <SegmentedTabs
          value={filter}
          options={[
            { key: 'all', label: 'All' },
            { key: 'unread', label: unreadNotifications.length > 0 ? `Unread ${unreadNotifications.length}` : 'Unread' },
          ]}
          onChange={setFilter}
        />

        {isLoading ? (
          <View style={styles.list}>
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={`notification-skeleton-${index}`} style={styles.notificationSkeleton} />
            ))}
          </View>
        ) : visibleNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray} size={24} weight="bold" />
            <ThemedText style={styles.emptyTitle}>{emptyTitle}</ThemedText>
            <ThemedText style={styles.emptyBody}>{emptyBody}</ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {recentNotifications.length > 0 ? (
              <NotificationSection
                title="Last 7 days"
                notifications={recentNotifications}
                busyRequestId={busyRequestId}
                onApproveRequest={handleApproveRequest}
                onDeclineRequest={handleDeclineRequest}
                onPressNotification={handleNotificationPress}
              />
            ) : null}
            {olderNotifications.length > 0 ? (
              <NotificationSection
                title="Earlier"
                notifications={olderNotifications}
                busyRequestId={busyRequestId}
                onApproveRequest={handleApproveRequest}
                onDeclineRequest={handleDeclineRequest}
                onPressNotification={handleNotificationPress}
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function NotificationSection({
  title,
  notifications,
  busyRequestId,
  onApproveRequest,
  onDeclineRequest,
  onPressNotification,
}: {
  title: string;
  notifications: AppNotification[];
  busyRequestId: string | null;
  onApproveRequest: (notification: AppNotification) => void;
  onDeclineRequest: (notification: AppNotification) => void;
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
            onApprove={() => onApproveRequest(notification)}
            onDecline={() => onDeclineRequest(notification)}
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
  onApprove,
  onDecline,
  onPress,
}: {
  notification: AppNotification;
  isBusy: boolean;
  onApprove: () => void;
  onDecline: () => void;
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
    notification.kind === 'trip_join_request'
      ? notification.actionStatus ?? 'pending'
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !notification.href }}
      disabled={!notification.href && notification.isRead}
      onPress={onPress}
      style={styles.row}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
        <NotificationIcon kind={notification.kind} unread={unread} />
      </View>

      <View style={styles.rowCopy}>
        <View style={styles.titleLine}>
          <ThemedText style={styles.rowTitle} numberOfLines={2}>
            {notification.title}
          </ThemedText>
          <ThemedText style={styles.rowTime}>{formatRelativeTime(notification.createdAt)}</ThemedText>
        </View>
        <ThemedText style={styles.rowBody} numberOfLines={2}>{notification.body}</ThemedText>
        {requestStatus === 'pending' ? (
          <View style={styles.requestActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Approve trip join request"
              disabled={isBusy}
              onPress={(event) => {
                event.stopPropagation();
                onApprove();
              }}
              style={[styles.requestButton, styles.approveButton, isBusy ? styles.requestButtonDisabled : null]}>
              <ThemedText style={styles.approveButtonText}>{isBusy ? 'Working' : 'Approve'}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decline trip join request"
              disabled={isBusy}
              onPress={(event) => {
                event.stopPropagation();
                onDecline();
              }}
              style={[styles.requestButton, styles.declineButton, isBusy ? styles.requestButtonDisabled : null]}>
              <ThemedText style={styles.declineButtonText}>Decline</ThemedText>
            </Pressable>
          </View>
        ) : requestStatus ? (
          <View style={styles.requestStatusPill}>
            <ThemedText style={styles.requestStatusText}>
              {requestStatus === 'approved' ? 'Approved' : 'Declined'}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {unread ? <View style={styles.unreadDot} /> : null}
      {notification.href ? (
        <CaretRight color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray} size={18} weight="bold" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
  },
  markReadText: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.darkGreen,
  },
  markReadTextDark: {
    color: designSystem.colors.lime,
  },
  title: {
    ...designSystem.type.pageTitle,
    color: designSystem.colors.ink,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    padding: designSystem.spacing.xl,
    borderRadius: 30,
    backgroundColor: designSystem.colors.whiteGlass,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
    gap: designSystem.spacing.lg,
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
  rowCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: designSystem.spacing.xs,
  },
  rowTitle: {
    flex: 1,
    ...designSystem.type.cardTitle,
    color: designSystem.colors.ink,
  },
  rowTime: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  rowBody: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.warmDark,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.xs,
    paddingTop: designSystem.spacing.xs,
  },
  requestButton: {
    minHeight: 34,
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    paddingHorizontal: designSystem.spacing.md,
  },
  approveButton: {
    backgroundColor: designSystem.colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderAccent,
  },
  declineButton: {
    backgroundColor: designSystem.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderSoft,
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  approveButtonText: {
    ...designSystem.type.label,
    color: designSystem.colors.darkGreen,
  },
  declineButtonText: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  requestStatusPill: {
    alignSelf: 'flex-start',
    marginTop: designSystem.spacing.xs,
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 15,
    paddingHorizontal: designSystem.spacing.md,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  requestStatusText: {
    ...designSystem.type.label,
    color: designSystem.colors.gray,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designSystem.colors.lime,
  },
});
