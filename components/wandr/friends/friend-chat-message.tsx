import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { CalendarBlank, ChatsCircle, Phone, Sun, VideoCamera } from 'phosphor-react-native';
import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { RouteMapWidget } from '@/components/wandr/friends/chat-widgets';
import type { MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { designSystem } from '@/constants/design-system';
import type { DirectChatMessage, FriendChatMessage } from '@/types/friends';

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatCallTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatReminder(minutes: number | null) {
  if (minutes === null) {
    return null;
  }
  if (minutes === 0) {
    return 'Reminder at start';
  }
  if (minutes === 1440) {
    return 'Reminder 1 day before';
  }
  if (minutes >= 60) {
    return `Reminder ${minutes / 60} hour${minutes === 60 ? '' : 's'} before`;
  }
  return `Reminder ${minutes} minutes before`;
}

function getWidgetMessage(body: string | null) {
  if (!body) {
    return null;
  }

  if (body === 'We should lock the sunrise departure now so everyone packs for the same timing.') {
    return {
      icon: Sun,
      title: 'Sunrise plan',
      description: 'Departure timing is ready for the group to follow.',
      body,
    };
  }

  if (body === 'Quick check-in: what does everyone need before we lock the next leg?') {
    return {
      icon: ChatsCircle,
      title: 'Quick check-in',
      description: 'A group check-in is open before the next leg.',
      body,
    };
  }

  return null;
}

function SpringPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  onMeasuredLongPress,
  ...props
}: PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onMeasuredLongPress?: (anchor: MessageActionAnchor) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const containerRef = useRef<View>(null);

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 7,
    }).start();
  };

  return (
    <Animated.View ref={containerRef} style={[style, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        onLongPress={(event) => {
          containerRef.current?.measureInWindow((x, y, width, height) => {
            onMeasuredLongPress?.({ x, y, width, height });
          });
          props.onLongPress?.(event);
        }}
        onPressIn={(event) => {
          animateTo(0.975);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateTo(1);
          onPressOut?.(event);
        }}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function FriendChatMessageBubble({
  message,
  onLongPressMessage,
}: {
  message: FriendChatMessage;
  onLongPressMessage?: (message: FriendChatMessage, anchor: MessageActionAnchor) => void;
}) {
  const router = useRouter();
  const widgetMessage = getWidgetMessage(message.body);
  const WidgetIcon = widgetMessage?.icon;
  const CallIcon = message.callCard?.mode === 'video' ? VideoCamera : Phone;
  const lastNavigateAtRef = useRef(0);
  const longPressLockUntilRef = useRef(0);

  const handleOpenTripMap = () => {
    const now = Date.now();
    if (now < longPressLockUntilRef.current) {
      return;
    }
    if (now - lastNavigateAtRef.current < 900) {
      return;
    }
    lastNavigateAtRef.current = now;
    router.push('/trip/map');
  };

  const handleOpenCall = () => {
    if (!message.callCard?.callId) {
      return;
    }
    const now = Date.now();
    if (now < longPressLockUntilRef.current) {
      return;
    }
    if (now - lastNavigateAtRef.current < 900) {
      return;
    }
    lastNavigateAtRef.current = now;
    router.push(`/friends/call/${message.callCard.callId}`);
  };

  const handleLongPress = (anchor: MessageActionAnchor) => {
    longPressLockUntilRef.current = Date.now() + 700;
    onLongPressMessage?.(message, anchor);
  };

  if (message.kind === 'system') {
    return (
      <View style={styles.systemRow}>
        <ThemedText style={styles.systemText}>{message.body}</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.messageWrap, message.isOwnMessage ? styles.messageWrapOwn : null]}>
      {!message.isOwnMessage ? (
        <View style={styles.senderRow}>
          {message.senderAvatarUri ? <ExpoImage source={message.senderAvatarUri} style={styles.senderAvatar} contentFit="cover" /> : null}
          <ThemedText style={styles.senderName}>{message.senderName}</ThemedText>
        </View>
      ) : null}

      {message.routeCard ? (
        <SpringPressable
          onPress={handleOpenTripMap}
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[styles.routeCard, message.isOwnMessage ? styles.routeCardOwn : null]}>
          <RouteMapWidget routeCard={message.routeCard} createdAt={message.createdAt} />
        </SpringPressable>
      ) : message.callCard ? (
        <SpringPressable
          onPress={handleOpenCall}
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[styles.callWidget, message.isOwnMessage ? styles.callWidgetOwn : null]}>
          <View style={styles.widgetMessageIcon}>
            <CallIcon color={designSystem.colors.darkGreen} size={18} weight="bold" />
          </View>
          <View style={styles.widgetMessageCopy}>
            <View style={styles.callTitleRow}>
              <ThemedText style={styles.widgetMessageTitle}>{message.callCard.title}</ThemedText>
              {message.callCard.status === 'scheduled' ? (
                <View style={styles.callStatusPill}>
                  <CalendarBlank color={designSystem.colors.darkGreen} size={12} weight="bold" />
                  <ThemedText style={styles.callStatusText}>Scheduled</ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText style={styles.widgetMessageDescription}>
              {message.callCard.status === 'scheduled' && message.callCard.scheduledFor
                ? `Starts ${formatCallTime(message.callCard.scheduledFor)}${
                    message.callCard.endsAt ? ` - ${formatCallTime(message.callCard.endsAt)}` : ''
                  }`
                : message.callCard.status === 'active'
                  ? 'Tap to join the live call.'
                  : 'Call ended.'}
            </ThemedText>
            {message.callCard.description ? (
              <ThemedText style={styles.callDescription} numberOfLines={2}>
                {message.callCard.description}
              </ThemedText>
            ) : null}
            <ThemedText style={styles.widgetMessageBody}>
              {[message.callCard.mode === 'voice' ? 'Voice call' : 'Video call', formatReminder(message.callCard.reminderMinutesBefore)]
                .filter(Boolean)
                .join(' | ')}
            </ThemedText>
          </View>
        </SpringPressable>
      ) : widgetMessage ? (
        <SpringPressable
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[styles.widgetMessage, message.isOwnMessage ? styles.widgetMessageOwn : null]}>
          <View style={styles.widgetMessageIcon}>
            {WidgetIcon ? <WidgetIcon color={designSystem.colors.darkGreen} size={18} weight="bold" /> : null}
          </View>
          <View style={styles.widgetMessageCopy}>
            <ThemedText style={styles.widgetMessageTitle}>{widgetMessage.title}</ThemedText>
            <ThemedText style={styles.widgetMessageDescription}>{widgetMessage.description}</ThemedText>
            <ThemedText style={styles.widgetMessageBody}>{widgetMessage.body}</ThemedText>
          </View>
        </SpringPressable>
      ) : (
        <SpringPressable
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[styles.bubble, message.isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]}>
          <ThemedText style={[styles.bubbleText, message.isOwnMessage ? styles.bubbleTextOwn : null]}>
            {message.body}
          </ThemedText>
        </SpringPressable>
      )}

      <ThemedText style={[styles.timeText, message.isOwnMessage ? styles.timeTextOwn : null]}>
        {formatTime(message.createdAt)}
      </ThemedText>
    </View>
  );
}

export function DirectChatMessageBubble({
  message,
  onLongPressMessage,
}: {
  message: DirectChatMessage;
  onLongPressMessage?: (message: DirectChatMessage, anchor: MessageActionAnchor) => void;
}) {
  const handleLongPress = (anchor: MessageActionAnchor) => {
    onLongPressMessage?.(message, anchor);
  };

  return (
    <View style={[styles.messageWrap, message.isOwnMessage ? styles.messageWrapOwn : null]}>
      {!message.isOwnMessage ? (
        <View style={styles.senderRow}>
          {message.senderAvatarUri ? (
            <ExpoImage source={message.senderAvatarUri} style={styles.senderAvatar} contentFit="cover" />
          ) : null}
          <ThemedText style={styles.senderName}>{message.senderName}</ThemedText>
        </View>
      ) : null}

      <SpringPressable
        delayLongPress={420}
        onMeasuredLongPress={handleLongPress}
        style={[styles.bubble, message.isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]}>
        <ThemedText style={[styles.bubbleText, message.isOwnMessage ? styles.bubbleTextOwn : null]}>
          {message.body}
        </ThemedText>
      </SpringPressable>

      <ThemedText style={[styles.timeText, message.isOwnMessage ? styles.timeTextOwn : null]}>
        {formatTime(message.createdAt)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  systemRow: {
    alignItems: 'center',
    marginVertical: 6,
  },
  systemText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  messageWrap: {
    maxWidth: '86%',
    gap: 6,
  },
  messageWrapOwn: {
    alignSelf: 'flex-end',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: designSystem.colors.surface,
  },
  senderName: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  bubble: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  bubbleOwn: {
    backgroundColor: designSystem.colors.lime,
    borderTopRightRadius: 8,
  },
  bubbleOther: {
    backgroundColor: designSystem.colors.ink,
    borderTopLeftRadius: 8,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.background,
  },
  bubbleTextOwn: {
    color: designSystem.colors.darkGreen,
  },
  routeCard: {
    width: 286,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.charcoal,
  },
  routeCardOwn: {
    alignSelf: 'flex-end',
  },
  widgetMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: designSystem.colors.whiteGlassMax,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  widgetMessageOwn: {
    alignSelf: 'flex-end',
  },
  callWidget: {
    maxWidth: 330,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: designSystem.colors.whiteGlassMax,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  callWidgetOwn: {
    alignSelf: 'flex-end',
  },
  widgetMessageIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.limeSoft,
  },
  widgetMessageCopy: {
    flex: 1,
    gap: 3,
  },
  widgetMessageTitle: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  callTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  callStatusPill: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: designSystem.colors.limeSoft,
  },
  callStatusText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  widgetMessageDescription: {
    fontSize: 14,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
  callDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.ink,
  },
  widgetMessageBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  timeText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.placeholderText,
    marginLeft: 8,
  },
  timeTextOwn: {
    alignSelf: 'flex-end',
    marginLeft: 0,
    marginRight: 8,
  },
});
