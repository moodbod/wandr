import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { WandrHeader } from '@/components/wandr/header';
import { LargeScreenPanel, LargeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { AppMapWorkspace } from '@/components/wandr/maps/app-map-workspace';
import { isRecentNotification } from '@/components/wandr/notifications/notifications-screen-model';
import { NotificationSection } from '@/components/wandr/notifications/notifications-screen-section';
import { styles } from '@/components/wandr/notifications/notifications-screen.styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useResponsive } from '@/hooks/use-responsive';
import {
  acceptFriendRequestRef,
  acceptTripInviteRef,
  approveTripJoinRequestRef,
  declineTripInviteRef,
  declineTripJoinRequestRef,
  listNotificationsRef,
  markNotificationsReadRef,
  markNotificationsViewedRef,
  rejectFriendRequestRef,
} from '@/lib/convex';
import type { AppNotification } from '@/types/notifications';

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
  const declineTripInvite = useMutation(declineTripInviteRef);
  const declineTripJoinRequest = useMutation(declineTripJoinRequestRef);
  const markRead = useMutation(markNotificationsReadRef);
  const markViewed = useMutation(markNotificationsViewedRef);
  const rejectFriendRequest = useMutation(rejectFriendRequestRef);
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

  const handleDeclineRequest = async (notification: AppNotification) => {
    if (!travelerSlug || busyRequestId) {
      return;
    }

    if (
      notification.kind !== 'friend_invite' &&
      notification.kind !== 'trip_invite' &&
      notification.kind !== 'trip_join_request'
    ) {
      return;
    }

    setBusyRequestId(notification._id);
    try {
      if (notification.kind === 'friend_invite') {
        await rejectFriendRequest({
          travelerSlug,
          notificationId: notification._id,
        });
      } else if (notification.kind === 'trip_invite') {
        await declineTripInvite({
          travelerSlug,
          notificationId: notification._id,
        });
      } else {
        await declineTripJoinRequest({
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
                onDeclineRequest={handleDeclineRequest}
                onPressNotification={handleNotificationPress}
              />
            ) : null}
            {olderNotifications.length > 0 ? (
              <NotificationSection
                title="Earlier"
                notifications={olderNotifications}
                busyRequestId={busyRequestId}
                onAcceptRequest={handleAcceptRequest}
                onDeclineRequest={handleDeclineRequest}
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
