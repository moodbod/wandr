import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { ChatsCircle, Sun } from 'phosphor-react-native';
import { useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WandrAvatar } from '@/components/wandr/avatar';
import { RouteMapWidget } from '@/components/wandr/friends/chat-widgets';
import type { MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DirectChatMessage, FriendChatMessage } from '@/types/friends';

const USE_NATIVE_ANIMATED_DRIVER = Platform.OS !== 'web';

const messageTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

function formatTime(timestamp: number) {
  return messageTimeFormatter.format(new Date(timestamp));
}

function getWidgetMessage(body: string | null) {
  if (!body) return null;

  if (body === 'We should lock the sunrise departure now so everyone packs for the same timing.') {
    return { icon: Sun, title: 'Sunrise plan', description: 'Departure timing is ready for the group to follow.', body };
  }

  if (body === 'Quick check-in: what does everyone need before we lock the next leg?') {
    return { icon: ChatsCircle, title: 'Quick check-in', description: 'A group check-in is open before the next leg.', body };
  }

  return null;
}

function getMediaMessage(body: string | null) {
  if (!body?.startsWith('wandr:media:') && !body?.startsWith('wandr:sticker:') && !body?.startsWith('wandr:gif:')) {
    return null;
  }

  if (body.startsWith('wandr:media:')) {
    try {
      const media = JSON.parse(decodeURIComponent(body.replace('wandr:media:', ''))) as { kind?: string; title?: string; uri?: string };
      if (!media.uri) return null;
      return { accessibilityLabel: `${media.title ?? media.kind ?? 'Travel media'} ${media.kind === 'gif' ? 'GIF' : 'sticker'}`, uri: media.uri };
    } catch {
      return null;
    }
  }

  return null;
}

function ReplyQuote({ replyTo }: { replyTo?: { senderName: string; preview: string } | null }) {
  const isDark = useColorScheme() === 'dark';
  if (!replyTo) return null;
  return (
    <View style={[styles.replyQuote, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
      <ThemedText style={styles.replyQuoteSender} numberOfLines={1}>{replyTo.senderName}</ThemedText>
      <ThemedText style={styles.replyQuotePreview} numberOfLines={2}>{replyTo.preview}</ThemedText>
    </View>
  );
}

function SpringPressable({
  children, style, onPressIn, onPressOut, onMeasuredLongPress, ...props
}: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle>; onMeasuredLongPress?: (anchor: MessageActionAnchor) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const containerRef = useRef<View>(null);

  const animateTo = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: USE_NATIVE_ANIMATED_DRIVER, speed: 24, bounciness: 7 }).start();
  };

  return (
    <Animated.View ref={containerRef} style={[style, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        onLongPress={(event) => {
          containerRef.current?.measureInWindow((x, y, width, height) => { onMeasuredLongPress?.({ x, y, width, height }); });
          props.onLongPress?.(event);
        }}
        onPressIn={(e) => { animateTo(0.975); onPressIn?.(e); }}
        onPressOut={(e) => { animateTo(1); onPressOut?.(e); }}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

function getWidgetSurfaceStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised,
    borderColor: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
  };
}

function getWidgetIconStyle(isDark: boolean) {
  return { backgroundColor: isDark ? 'rgba(159,232,112,0.14)' : designSystem.colors.limeSoft };
}

function getWidgetTitleStyle(isDark: boolean) {
  return { color: isDark ? designSystem.colors.darkText : designSystem.colors.ink };
}

function getWidgetDescriptionStyle(isDark: boolean) {
  return { color: isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray };
}

function getWidgetBodyStyle(isDark: boolean) {
  return { color: isDark ? designSystem.colors.darkTextMuted : designSystem.colors.warmDark };
}

function getPlainOtherTextStyle(isDark: boolean) {
  return { color: isDark ? designSystem.colors.darkText : designSystem.colors.lightTextStrong };
}

function getOtherBubbleStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised,
    borderColor: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
  };
}

export function FriendChatMessageBubble({
  message,
  onLongPressMessage,
}: {
  message: FriendChatMessage;
  onLongPressMessage?: (message: FriendChatMessage, anchor: MessageActionAnchor) => void;
}) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const widgetMessage = getWidgetMessage(message.body);
  const mediaMessage = getMediaMessage(message.body);
  const WidgetIcon = widgetMessage?.icon;
  const lastNavigateAtRef = useRef(0);
  const longPressLockUntilRef = useRef(0);

  const handleOpenTripMap = () => {
    const now = Date.now();
    if (now < longPressLockUntilRef.current || now - lastNavigateAtRef.current < 900) return;
    lastNavigateAtRef.current = now;
    router.push('/trip/map');
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
          <WandrAvatar name={message.senderName || message.senderSlug || 'Traveler'} paletteKey={message.senderSlug} size={24} uri={message.senderAvatarUri} style={styles.senderAvatar} />
          <ThemedText style={styles.senderName}>{message.senderName}</ThemedText>
        </View>
      ) : null}

      {message.routeCard ? (
        <SpringPressable onPress={handleOpenTripMap} delayLongPress={420} onMeasuredLongPress={handleLongPress} style={[styles.routeCard, message.isOwnMessage ? styles.routeCardOwn : null]}>
          <ReplyQuote replyTo={message.replyTo} />
          <RouteMapWidget routeCard={message.routeCard} createdAt={message.createdAt} />
        </SpringPressable>
      ) : mediaMessage ? (
        <SpringPressable delayLongPress={420} onMeasuredLongPress={handleLongPress} style={[styles.stickerBubble, message.isOwnMessage ? styles.stickerBubbleOwn : null]}>
          <ReplyQuote replyTo={message.replyTo} />
          <ExpoImage accessibilityLabel={mediaMessage.accessibilityLabel} source={{ uri: mediaMessage.uri }} style={styles.stickerImage} contentFit="contain" />
        </SpringPressable>
      ) : widgetMessage ? (
        <SpringPressable delayLongPress={420} onMeasuredLongPress={handleLongPress} style={[styles.widgetMessage, getWidgetSurfaceStyle(isDark), message.isOwnMessage ? styles.widgetMessageOwn : null]}>
          <ReplyQuote replyTo={message.replyTo} />
          <View style={styles.widgetLayout}>
            <View style={[styles.widgetMessageIcon, getWidgetIconStyle(isDark)]}>
              {WidgetIcon ? <WidgetIcon color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen} size={18} weight="bold" /> : null}
            </View>
            <View style={styles.widgetMessageCopy}>
              <ThemedText style={[styles.widgetMessageTitle, getWidgetTitleStyle(isDark)]}>{widgetMessage.title}</ThemedText>
              <ThemedText style={[styles.widgetMessageDescription, getWidgetDescriptionStyle(isDark)]}>{widgetMessage.description}</ThemedText>
              <ThemedText style={[styles.widgetMessageBody, getWidgetBodyStyle(isDark)]}>{widgetMessage.body}</ThemedText>
            </View>
          </View>
        </SpringPressable>
      ) : (
        <SpringPressable delayLongPress={420} onMeasuredLongPress={handleLongPress} style={message.isOwnMessage ? [styles.bubble, styles.bubbleOwn] : [styles.bubble, styles.bubbleOther, getOtherBubbleStyle(isDark)]}>
          <ThemedText style={message.isOwnMessage ? [styles.bubbleText, styles.bubbleTextOwn] : [styles.plainOtherText, getPlainOtherTextStyle(isDark)]}>{message.body}</ThemedText>
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
  const isDark = useColorScheme() === 'dark';
  const mediaMessage = getMediaMessage(message.body);
  const longPressLockUntilRef = useRef(0);

  const handleLongPress = (anchor: MessageActionAnchor) => {
    longPressLockUntilRef.current = Date.now() + 700;
    onLongPressMessage?.(message, anchor);
  };

  return (
    <View style={[styles.messageWrap, message.isOwnMessage ? styles.messageWrapOwn : null]}>
      {!message.isOwnMessage ? (
        <View style={styles.senderRow}>
          <WandrAvatar name={message.senderName || message.senderSlug || 'Traveler'} paletteKey={message.senderSlug} size={24} uri={message.senderAvatarUri} style={styles.senderAvatar} />
          <ThemedText style={styles.senderName}>{message.senderName}</ThemedText>
        </View>
      ) : null}

      {mediaMessage ? (
        <SpringPressable delayLongPress={420} onMeasuredLongPress={handleLongPress} style={[styles.stickerBubble, message.isOwnMessage ? styles.stickerBubbleOwn : null]}>
          <ReplyQuote replyTo={message.replyTo} />
          <ExpoImage accessibilityLabel={mediaMessage.accessibilityLabel} source={{ uri: mediaMessage.uri }} style={styles.stickerImage} contentFit="contain" />
        </SpringPressable>
      ) : (
        <SpringPressable delayLongPress={420} onMeasuredLongPress={handleLongPress} style={message.isOwnMessage ? [styles.bubble, styles.bubbleOwn] : [styles.bubble, styles.bubbleOther, getOtherBubbleStyle(isDark)]}>
          <ThemedText style={message.isOwnMessage ? [styles.bubbleText, styles.bubbleTextOwn] : [styles.plainOtherText, getPlainOtherTextStyle(isDark)]}>{message.body}</ThemedText>
        </SpringPressable>
      )}

      <ThemedText style={[styles.timeText, message.isOwnMessage ? styles.timeTextOwn : null]}>
        {formatTime(message.createdAt)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  systemRow: { alignItems: 'center', marginVertical: 6 },
  systemText: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: designSystem.colors.gray },
  messageWrap: { maxWidth: '86%', gap: 6 },
  messageWrapOwn: { alignSelf: 'flex-end' },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  senderAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: designSystem.colors.surface },
  senderName: { fontSize: 12, lineHeight: 14, fontWeight: '600', color: designSystem.colors.gray },
  bubble: { borderRadius: 28, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOwn: { backgroundColor: designSystem.colors.lime, borderTopRightRadius: 8 },
  bubbleOther: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bubbleText: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: designSystem.colors.background },
  bubbleTextOwn: { color: designSystem.colors.oliveInk },
  plainOtherText: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  routeCard: { width: 236, borderRadius: 22, overflow: 'hidden', backgroundColor: designSystem.colors.charcoal },
  routeCardOwn: { alignSelf: 'flex-end' },
  replyQuote: {
    margin: 10, marginBottom: 0, paddingLeft: 9, paddingVertical: 6, paddingRight: 10,
    borderLeftWidth: 3, borderLeftColor: designSystem.colors.lime,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
  },
  replyQuoteSender: { fontSize: 12, lineHeight: 15, fontWeight: '700', color: designSystem.colors.lime },
  replyQuotePreview: { fontSize: 12, lineHeight: 15, fontWeight: '500', color: designSystem.colors.mutedText },
  stickerBubble: { minWidth: 116, minHeight: 116, alignItems: 'center', justifyContent: 'center' },
  stickerBubbleOwn: { alignSelf: 'flex-end' },
  stickerImage: { width: 108, height: 108 },
  widgetMessage: {
    gap: 10, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: designSystem.colors.surfaceRaised, borderWidth: 1, borderColor: designSystem.colors.borderSoft,
  },
  widgetMessageOwn: { alignSelf: 'flex-end' },
  widgetLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  widgetMessageIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: designSystem.colors.limeSoft },
  widgetMessageCopy: { flex: 1, gap: 3 },
  widgetMessageTitle: { fontSize: 12, lineHeight: 14, fontWeight: '600', color: designSystem.colors.ink },
  widgetMessageDescription: { fontSize: 14, lineHeight: 18, color: designSystem.colors.gray },
  widgetMessageBody: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: designSystem.colors.warmDark },
  timeText: { fontSize: 11, lineHeight: 12, fontWeight: '600', color: designSystem.colors.placeholderText, marginLeft: 8 },
  timeTextOwn: { alignSelf: 'flex-end', marginLeft: 0, marginRight: 8 },
});
