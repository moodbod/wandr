import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { CalendarBlank, ChatsCircle, Phone, Sun, VideoCamera } from 'phosphor-react-native';
import { useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WandrAvatar } from '@/components/wandr/avatar';
import { RouteMapWidget } from '@/components/wandr/friends/chat-widgets';
import type { MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import type { DirectChatMessage, FriendChatMessage } from '@/types/friends';

const USE_NATIVE_ANIMATED_DRIVER = Platform.OS !== 'web';

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

function getMediaMessage(body: string | null) {
  if (!body?.startsWith('wandr:media:') && !body?.startsWith('wandr:sticker:') && !body?.startsWith('wandr:gif:')) {
    return null;
  }

  if (body.startsWith('wandr:media:')) {
    try {
      const media = JSON.parse(decodeURIComponent(body.replace('wandr:media:', ''))) as {
        kind?: string;
        title?: string;
        uri?: string;
      };
      if (!media.uri) {
        return null;
      }

      return {
        accessibilityLabel: `${media.title ?? media.kind ?? 'Travel media'} ${media.kind === 'gif' ? 'GIF' : 'sticker'}`,
        uri: media.uri,
      };
    } catch {
      return null;
    }
  }

  return null;
}

function ReplyQuote({ replyTo }: { replyTo?: { senderName: string; preview: string } | null }) {
  if (!replyTo) {
    return null;
  }

  return (
    <View style={styles.replyQuote}>
      <ThemedText style={styles.replyQuoteSender} numberOfLines={1}>
        {replyTo.senderName}
      </ThemedText>
      <ThemedText style={styles.replyQuotePreview} numberOfLines={2}>
        {replyTo.preview}
      </ThemedText>
    </View>
  );
}

export type ChatCallCard = NonNullable<FriendChatMessage['callCard'] | DirectChatMessage['callCard']>;

function isJoinableCallStatus(status: ChatCallCard['status']) {
  return status === 'active' || status === 'scheduled';
}

function getCallStatusText(callCard: ChatCallCard) {
  if (callCard.status === 'scheduled' && callCard.scheduledFor) {
    return `Starts ${formatCallTime(callCard.scheduledFor)}${callCard.endsAt ? ` - ${formatCallTime(callCard.endsAt)}` : ''}`;
  }

  if (callCard.status === 'scheduled') {
    return 'Scheduled call.';
  }

  if (callCard.status === 'active') {
    return 'Tap to join the live call.';
  }

  if (callCard.status === 'cancelled') {
    return 'Call cancelled.';
  }

  return 'Call ended.';
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
      useNativeDriver: USE_NATIVE_ANIMATED_DRIVER,
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
  onOpenCallCard,
  onLongPressMessage,
}: {
  message: FriendChatMessage;
  onOpenCallCard?: (callCard: ChatCallCard) => void;
  onLongPressMessage?: (message: FriendChatMessage, anchor: MessageActionAnchor) => void;
}) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { isLargeScreen } = useResponsive();
  const { openCall } = useActiveFriendCall();
  const widgetMessage = getWidgetMessage(message.body);
  const mediaMessage = getMediaMessage(message.body);
  const WidgetIcon = widgetMessage?.icon;
  const CallIcon = message.callCard?.mode === 'video' ? VideoCamera : Phone;
  const isJoinableCall = message.callCard ? isJoinableCallStatus(message.callCard.status) : false;
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
    if (!message.callCard) {
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
    if (!isJoinableCall || !message.callCard.callId) {
      onOpenCallCard?.(message.callCard);
      return;
    }
    if (isLargeScreen) {
      openCall(message.callCard.callId as Id<'calls'>);
      return;
    }
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
          <WandrAvatar
            name={message.senderName || message.senderSlug || 'Traveler'}
            paletteKey={message.senderSlug}
            size={24}
            uri={message.senderAvatarUri}
            style={styles.senderAvatar}
          />
          <ThemedText style={styles.senderName}>{message.senderName}</ThemedText>
        </View>
      ) : null}

      {message.routeCard ? (
        <SpringPressable
          onPress={handleOpenTripMap}
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[styles.routeCard, message.isOwnMessage ? styles.routeCardOwn : null]}>
          <ReplyQuote replyTo={message.replyTo} />
          <RouteMapWidget routeCard={message.routeCard} createdAt={message.createdAt} />
        </SpringPressable>
      ) : message.callCard ? (
        <SpringPressable
          onPress={handleOpenCall}
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[
            styles.callWidget,
            getWidgetSurfaceStyle(isDark),
            !isJoinableCall ? [styles.callWidgetInactive, getInactiveCallSurfaceStyle(isDark)] : null,
            message.isOwnMessage ? styles.callWidgetOwn : null,
          ]}>
          <ReplyQuote replyTo={message.replyTo} />
          <View style={styles.widgetLayout}>
            <View style={[styles.widgetMessageIcon, getWidgetIconStyle(isDark), !isJoinableCall ? styles.callWidgetInactiveIcon : null]}>
              <CallIcon
                color={!isJoinableCall ? designSystem.colors.liked : isDark ? designSystem.colors.lime : designSystem.colors.darkGreen}
                size={isJoinableCall ? 18 : 15}
                weight="bold"
              />
            </View>
            <View style={isJoinableCall ? styles.widgetMessageCopy : styles.callWidgetInactiveCopy}>
              {isJoinableCall ? (
                <>
                  <View style={styles.callTitleRow}>
                    <ThemedText style={[styles.widgetMessageTitle, getWidgetTitleStyle(isDark)]}>
                      {message.callCard.title}
                    </ThemedText>
                    {message.callCard.status === 'scheduled' ? (
                      <View style={[styles.callStatusPill, getWidgetIconStyle(isDark)]}>
                        <CalendarBlank color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen} size={12} weight="bold" />
                        <ThemedText style={[styles.callStatusText, getWidgetAccentTextStyle(isDark)]}>Scheduled</ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText style={[styles.widgetMessageDescription, getWidgetDescriptionStyle(isDark)]}>
                    {getCallStatusText(message.callCard)}
                  </ThemedText>
                  {message.callCard.description ? (
                    <ThemedText style={[styles.callDescription, getWidgetTitleStyle(isDark)]} numberOfLines={2}>
                      {message.callCard.description}
                    </ThemedText>
                  ) : null}
                  <ThemedText style={[styles.widgetMessageBody, getWidgetBodyStyle(isDark)]}>
                    {[message.callCard.mode === 'voice' ? 'Voice call' : 'Video call', formatReminder(message.callCard.reminderMinutesBefore)]
                      .filter(Boolean)
                      .join(' | ')}
                  </ThemedText>
                </>
              ) : (
                <>
                  <ThemedText style={[styles.callWidgetInactiveTitle, getWidgetTitleStyle(isDark)]}>
                    {message.callCard.title}
                  </ThemedText>
                  <ThemedText style={[styles.callWidgetInactiveMeta, getWidgetDescriptionStyle(isDark)]}>
                    {getCallStatusText(message.callCard)}
                  </ThemedText>
                </>
              )}
            </View>
          </View>
        </SpringPressable>
      ) : mediaMessage ? (
        <SpringPressable
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[styles.stickerBubble, message.isOwnMessage ? styles.stickerBubbleOwn : null]}>
          <ReplyQuote replyTo={message.replyTo} />
          <ExpoImage
            accessibilityLabel={mediaMessage.accessibilityLabel}
            source={{ uri: mediaMessage.uri }}
            style={styles.stickerImage}
            contentFit="contain"
          />
        </SpringPressable>
      ) : widgetMessage ? (
        <SpringPressable
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[
            styles.widgetMessage,
            getWidgetSurfaceStyle(isDark),
            message.isOwnMessage ? styles.widgetMessageOwn : null,
          ]}>
          <ReplyQuote replyTo={message.replyTo} />
          <View style={styles.widgetLayout}>
            <View style={[styles.widgetMessageIcon, getWidgetIconStyle(isDark)]}>
              {WidgetIcon ? (
                <WidgetIcon color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen} size={18} weight="bold" />
              ) : null}
            </View>
            <View style={styles.widgetMessageCopy}>
              <ThemedText style={[styles.widgetMessageTitle, getWidgetTitleStyle(isDark)]}>{widgetMessage.title}</ThemedText>
              <ThemedText style={[styles.widgetMessageDescription, getWidgetDescriptionStyle(isDark)]}>
                {widgetMessage.description}
              </ThemedText>
              <ThemedText style={[styles.widgetMessageBody, getWidgetBodyStyle(isDark)]}>{widgetMessage.body}</ThemedText>
            </View>
          </View>
        </SpringPressable>
      ) : (
        <SpringPressable
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={message.isOwnMessage ? [styles.bubble, styles.bubbleOwn] : [styles.bubble, styles.bubbleOther, getOtherBubbleStyle(isDark)]}>
          <ThemedText style={message.isOwnMessage ? [styles.bubbleText, styles.bubbleTextOwn] : [styles.plainOtherText, getPlainOtherTextStyle(isDark)]}>
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

function getWidgetSurfaceStyle(isDark: boolean) {
  return {
    backgroundColor: isDark
      ? designSystem.colors.darkSurface
      : Platform.OS === 'android'
        ? designSystem.colors.surfaceRaised
        : designSystem.colors.whiteGlassMax,
    borderColor: isDark
      ? designSystem.colors.darkSurfaceBorder
      : Platform.OS === 'android'
        ? designSystem.colors.lightSurfaceAlt
        : designSystem.colors.borderSoft,
  };
}

function getInactiveCallSurfaceStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(14,15,12,0.045)',
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(14,15,12,0.06)',
  };
}

function getWidgetIconStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? 'rgba(159,232,112,0.14)' : designSystem.colors.limeSoft,
  };
}

function getWidgetTitleStyle(isDark: boolean) {
  return {
    color: isDark ? designSystem.colors.darkText : designSystem.colors.ink,
  };
}

function getWidgetDescriptionStyle(isDark: boolean) {
  return {
    color: isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray,
  };
}

function getWidgetBodyStyle(isDark: boolean) {
  return {
    color: isDark ? designSystem.colors.darkTextMuted : designSystem.colors.warmDark,
  };
}

function getWidgetAccentTextStyle(isDark: boolean) {
  return {
    color: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen,
  };
}

function getPlainOtherTextStyle(isDark: boolean) {
  return {
    color: isDark ? designSystem.colors.darkText : designSystem.colors.lightTextStrong,
  };
}

function getOtherBubbleStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised,
    borderColor: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
  };
}

export function DirectChatMessageBubble({
  message,
  onOpenCallCard,
  onLongPressMessage,
}: {
  message: DirectChatMessage;
  onOpenCallCard?: (callCard: ChatCallCard) => void;
  onLongPressMessage?: (message: DirectChatMessage, anchor: MessageActionAnchor) => void;
}) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { isLargeScreen } = useResponsive();
  const { openCall } = useActiveFriendCall();
  const CallIcon = message.callCard?.mode === 'video' ? VideoCamera : Phone;
  const mediaMessage = getMediaMessage(message.body);
  const isJoinableCall = message.callCard ? isJoinableCallStatus(message.callCard.status) : false;
  const lastNavigateAtRef = useRef(0);
  const longPressLockUntilRef = useRef(0);

  const handleOpenCall = () => {
    if (!message.callCard) {
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
    if (!isJoinableCall || !message.callCard.callId) {
      onOpenCallCard?.(message.callCard);
      return;
    }
    if (isLargeScreen) {
      openCall(message.callCard.callId as Id<'calls'>);
      return;
    }
    router.push(`/friends/call/${message.callCard.callId}`);
  };

  const handleLongPress = (anchor: MessageActionAnchor) => {
    longPressLockUntilRef.current = Date.now() + 700;
    onLongPressMessage?.(message, anchor);
  };

  return (
    <View style={[styles.messageWrap, message.isOwnMessage ? styles.messageWrapOwn : null]}>
      {!message.isOwnMessage ? (
        <View style={styles.senderRow}>
          <WandrAvatar
            name={message.senderName || message.senderSlug || 'Traveler'}
            paletteKey={message.senderSlug}
            size={24}
            uri={message.senderAvatarUri}
            style={styles.senderAvatar}
          />
          <ThemedText style={styles.senderName}>{message.senderName}</ThemedText>
        </View>
      ) : null}

      {message.callCard ? (
        <SpringPressable
          onPress={handleOpenCall}
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[
            styles.callWidget,
            getWidgetSurfaceStyle(isDark),
            !isJoinableCall ? [styles.callWidgetInactive, getInactiveCallSurfaceStyle(isDark)] : null,
            message.isOwnMessage ? styles.callWidgetOwn : null,
          ]}>
          <ReplyQuote replyTo={message.replyTo} />
          <View style={styles.widgetLayout}>
            <View style={[styles.widgetMessageIcon, getWidgetIconStyle(isDark), !isJoinableCall ? styles.callWidgetInactiveIcon : null]}>
              <CallIcon
                color={!isJoinableCall ? designSystem.colors.liked : isDark ? designSystem.colors.lime : designSystem.colors.darkGreen}
                size={isJoinableCall ? 18 : 15}
                weight="bold"
              />
            </View>
            <View style={isJoinableCall ? styles.widgetMessageCopy : styles.callWidgetInactiveCopy}>
              <ThemedText style={[isJoinableCall ? styles.widgetMessageTitle : styles.callWidgetInactiveTitle, getWidgetTitleStyle(isDark)]}>
                {message.callCard.title}
              </ThemedText>
              <ThemedText style={[isJoinableCall ? styles.widgetMessageDescription : styles.callWidgetInactiveMeta, getWidgetDescriptionStyle(isDark)]}>
                {getCallStatusText(message.callCard)}
              </ThemedText>
              {isJoinableCall ? (
                <ThemedText style={[styles.widgetMessageBody, getWidgetBodyStyle(isDark)]}>
                  {message.callCard.mode === 'voice' ? 'Voice call' : 'Video call'}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </SpringPressable>
      ) : mediaMessage ? (
        <SpringPressable
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={[styles.stickerBubble, message.isOwnMessage ? styles.stickerBubbleOwn : null]}>
          <ReplyQuote replyTo={message.replyTo} />
          <ExpoImage
            accessibilityLabel={mediaMessage.accessibilityLabel}
            source={{ uri: mediaMessage.uri }}
            style={styles.stickerImage}
            contentFit="contain"
          />
        </SpringPressable>
      ) : (
        <SpringPressable
          delayLongPress={420}
          onMeasuredLongPress={handleLongPress}
          style={message.isOwnMessage ? [styles.bubble, styles.bubbleOwn] : [styles.bubble, styles.bubbleOther, getOtherBubbleStyle(isDark)]}>
          <ThemedText style={message.isOwnMessage ? [styles.bubbleText, styles.bubbleTextOwn] : [styles.plainOtherText, getPlainOtherTextStyle(isDark)]}>
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: designSystem.colors.lime,
    borderTopRightRadius: 8,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 8,
    borderWidth: 1,
    boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
    elevation: 2,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.background,
  },
  bubbleTextOwn: {
    color: designSystem.colors.oliveInk,
  },
  plainOtherText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  routeCard: {
    width: 236,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.charcoal,
  },
  routeCardOwn: {
    alignSelf: 'flex-end',
  },
  replyQuote: {
    margin: 10,
    marginBottom: 0,
    paddingLeft: 9,
    paddingVertical: 6,
    paddingRight: 10,
    borderLeftWidth: 3,
    borderLeftColor: designSystem.colors.lime,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
  },
  replyQuoteSender: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: designSystem.colors.lime,
  },
  replyQuotePreview: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    color: designSystem.colors.darkMutedText,
  },
  stickerBubble: {
    minWidth: 116,
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerBubbleOwn: {
    alignSelf: 'flex-end',
  },
  stickerImage: {
    width: 108,
    height: 108,
  },
  widgetMessage: {
    gap: 10,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.surfaceRaised : designSystem.colors.whiteGlassMax,
    borderWidth: 1,
    borderColor: Platform.OS === 'android' ? designSystem.colors.lightSurfaceAlt : designSystem.colors.borderSoft,
  },
  widgetMessageOwn: {
    alignSelf: 'flex-end',
  },
  callWidget: {
    maxWidth: 330,
    minWidth: 260,
    gap: 10,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.surfaceRaised : designSystem.colors.whiteGlassMax,
    borderWidth: 1,
    borderColor: Platform.OS === 'android' ? designSystem.colors.lightSurfaceAlt : designSystem.colors.borderSoft,
  },
  widgetLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  callWidgetInactive: {
    minWidth: 0,
    maxWidth: 260,
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  callWidgetInactiveIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(206,83,96,0.14)',
  },
  callWidgetInactiveCopy: {
    flexShrink: 1,
    gap: 1,
  },
  callWidgetInactiveTitle: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  callWidgetInactiveMeta: {
    fontSize: 13,
    lineHeight: 16,
    color: designSystem.colors.gray,
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
    fontWeight: '600',
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
