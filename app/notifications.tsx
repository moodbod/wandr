import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Bell, ChatCircleDots, CheckCircle, Compass, UsersThree } from 'phosphor-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { listNotificationsRef, markNotificationsReadRef } from '@/lib/convex';
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

function NotificationIcon({ kind }: { kind: AppNotification['kind'] }) {
  switch (kind) {
    case 'friend_invite':
      return <UsersThree color={designSystem.colors.darkGreen} size={18} weight="bold" />;
    case 'friend_added':
      return <CheckCircle color={designSystem.colors.darkGreen} size={18} weight="fill" />;
    case 'trip_arrival':
      return <Compass color={designSystem.colors.darkGreen} size={18} weight="bold" />;
    case 'trip_rating':
      return <ChatCircleDots color={designSystem.colors.darkGreen} size={18} weight="bold" />;
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const notifications = useQuery(listNotificationsRef, { travelerSlug: traveler?.slug ?? '' });
  const markRead = useMutation(markNotificationsReadRef);

  useEffect(() => {
    if (!traveler?.slug || !notifications || notifications.length === 0) {
      return;
    }

    const unreadIds = notifications.filter((notification) => !notification.isRead).map((notification) => notification._id);
    if (unreadIds.length === 0) {
      return;
    }

    void markRead({
      travelerSlug: traveler.slug,
      notificationIds: unreadIds,
    });
  }, [markRead, notifications, traveler?.slug]);

  if (traveler === undefined || notifications === undefined) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          }}
        />
        <View style={[styles.loadingWrap, { paddingTop: insets.top + 96 }]}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

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
        <View style={styles.hero}>
          <ThemedText style={styles.eyebrow}>Inbox</ThemedText>
          <ThemedText style={styles.title}>Notifications</ThemedText>
          <ThemedText style={styles.description}>
            Friend invites, friend-list adds, and trip prompts all land here.
          </ThemedText>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell color={designSystem.colors.gray} size={24} weight="bold" />
            <ThemedText style={styles.emptyTitle}>Nothing new yet</ThemedText>
            <ThemedText style={styles.emptyBody}>
              As soon as someone invites you, adds you to their friend list, or a trip update needs attention, it will show up here.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((notification) => (
              <Pressable
                key={notification._id}
                onPress={() => {
                  if (notification.href) {
                    router.push(notification.href as never);
                  }
                }}
                style={[styles.card, !notification.isRead ? styles.cardUnread : null]}>
                <View style={styles.cardIcon}>
                  <NotificationIcon kind={notification.kind} />
                </View>
                <View style={styles.cardCopy}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.cardTitle}>{notification.title}</ThemedText>
                    <ThemedText style={styles.cardTime}>{formatRelativeTime(notification.createdAt)}</ThemedText>
                  </View>
                  <ThemedText style={styles.cardBody}>{notification.body}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xl,
  },
  hero: {
    gap: 8,
  },
  eyebrow: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  title: {
    fontSize: 42,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1.5,
    textTransform: 'uppercase',
    color: designSystem.colors.ink,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    maxWidth: 320,
    color: designSystem.colors.warmDark,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    padding: designSystem.spacing.xl,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    color: designSystem.colors.ink,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: designSystem.colors.gray,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: designSystem.spacing.lg,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.06)',
  },
  cardUnread: {
    backgroundColor: 'rgba(159,232,112,0.14)',
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  cardCopy: {
    flex: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  cardTime: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: designSystem.colors.gray,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.warmDark,
  },
});
