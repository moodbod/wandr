import { ChatCircleDots, CheckCircle, Compass, UsersThree } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WandrAvatar } from '@/components/wandr/avatar';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AppNotification } from '@/types/notifications';

import { formatRelativeTime, getRequestStatus } from './notifications-screen-model';
import { styles } from './notifications-screen.styles';

type NotificationSectionProps = {
  title: string;
  notifications: AppNotification[];
  busyRequestId: string | null;
  onAcceptRequest: (notification: AppNotification) => void;
  onDeclineRequest: (notification: AppNotification) => void;
  onPressNotification: (notification: AppNotification) => void;
};

export function NotificationSection({
  title,
  notifications,
  busyRequestId,
  onAcceptRequest,
  onDeclineRequest,
  onPressNotification,
}: NotificationSectionProps) {
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
            onDecline={() => onDeclineRequest(notification)}
            onPress={() => onPressNotification(notification)}
          />
        ))}
      </View>
    </View>
  );
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

function NotificationRow({
  notification,
  isBusy,
  onAccept,
  onDecline,
  onPress,
}: {
  notification: AppNotification;
  isBusy: boolean;
  onAccept: () => void;
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
  const requestStatus = getRequestStatus(notification);
  const requestLabel =
    notification.kind === 'friend_invite'
      ? 'friend request'
      : notification.kind === 'trip_invite'
        ? 'trip invite'
        : 'trip join request';
  const isPendingRequest = requestStatus === 'pending';
  const canDeclineRequest = notification.kind === 'trip_invite' || notification.kind === 'trip_join_request';
  const showActorAvatar = Boolean(notification.actorSlug);
  const actorName = notification.actorName ?? notification.actorSlug ?? '';
  const actorBaseLabel = notification.actorBaseLabel;
  const requestActionText = notification.kind === 'friend_invite' ? 'sent a request' : notification.body;
  const inlineActionText = showActorAvatar ? requestActionText : notification.title;
  const inlineMeta =
    requestStatus && !isPendingRequest
      ? `${formatRelativeTime(notification.createdAt)} - ${requestStatus === 'approved' ? 'Approved' : 'Declined'}`
      : formatRelativeTime(notification.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !notification.href }}
      disabled={!notification.href && notification.isRead}
      onPress={onPress}
      style={styles.row}>
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
            <ThemedText style={styles.rowBody} numberOfLines={2}>
              {inlineActionText}
            </ThemedText>
          </>
        ) : (
          <>
            <View style={styles.messageLine}>
              <ThemedText style={styles.rowMessage} numberOfLines={2}>
                {inlineActionText} <ThemedText style={styles.rowTime}>{inlineMeta}</ThemedText>
              </ThemedText>
            </View>
            {!requestStatus ? (
              <ThemedText style={styles.rowBody} numberOfLines={2}>
                {notification.body}
              </ThemedText>
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
          {canDeclineRequest ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Decline ${requestLabel}`}
              disabled={isBusy}
              onPress={(event) => {
                event.stopPropagation();
                onDecline();
              }}
              style={[
                styles.requestButton,
                styles.declineButton,
                isBusy ? styles.requestButtonDisabled : null,
              ]}>
              <ThemedText style={styles.declineButtonText}>Decline</ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
