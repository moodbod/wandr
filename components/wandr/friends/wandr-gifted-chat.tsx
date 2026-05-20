import { ReactNode, useRef } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { ArrowBendUpLeft, X } from 'phosphor-react-native';

import { FriendChatComposer } from '@/components/wandr/friends/friend-chat-composer';
import { ThemedText } from '@/components/themed-text';
import type { MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type WandrMessageBase = {
  _id: string;
  body: string | null;
  createdAt: number;
  senderAvatarUri: string | null;
  senderName: string;
  senderSlug: string;
  isOwnMessage?: boolean;
  replyTo?: {
    senderName: string;
    preview: string;
    kind: string;
  } | null;
};

export function WandrGiftedChat<TMessage extends WandrMessageBase>({
  bottomOffset,
  header,
  isSending,
  isWidgetMessage,
  messages,
  onChangeText,
  onOpenTools,
  onLongPressMessage,
  onReplyMessage,
  onCancelReply,
  onSendText,
  placeholder,
  replyPreview,
  renderWidgetMessage,
  text,
  topInset,
  userSlug,
}: {
  bottomOffset: number;
  header?: ReactNode;
  isSending: boolean;
  isWidgetMessage?: (message: TMessage) => boolean;
  messages: TMessage[];
  onChangeText: (value: string) => void;
  onOpenTools: () => void;
  onLongPressMessage?: (message: TMessage, anchor: MessageActionAnchor) => void;
  onReplyMessage?: (message: TMessage) => void;
  onCancelReply?: () => void;
  onSendText: () => void;
  placeholder: string;
  replyPreview?: {
    senderName: string;
    preview: string;
  } | null;
  renderWidgetMessage?: (message: TMessage) => ReactNode;
  text: string;
  topInset: number;
  userSlug: string | null | undefined;
}) {
  const isDark = useColorScheme() === 'dark';
  const listRef = useRef<FlatList<TMessage>>(null);

  const scrollToLatestMessage = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
      style={styles.root}>
      <FlatList<TMessage>
        ref={listRef}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset,
            paddingBottom: designSystem.spacing.xl,
          },
        ]}
        data={messages}
        keyExtractor={(message) => message._id}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header ? <View style={styles.header}>{header}</View> : null}
        onContentSizeChange={scrollToLatestMessage}
        onLayout={scrollToLatestMessage}
        renderItem={({ item }) => {
          if (isWidgetMessage?.(item) && renderWidgetMessage) {
            return <View style={styles.messageRow}>{renderWidgetMessage(item)}</View>;
          }

          return (
            <MeasuredWandrBubble
              isDark={isDark}
              isOwnMessage={item.isOwnMessage ?? Boolean(userSlug && item.senderSlug === userSlug)}
              message={item}
              onMeasuredLongPress={(anchor) => onLongPressMessage?.(item, anchor)}
              onSwipeReply={() => onReplyMessage?.(item)}
            />
          );
        }}
        scrollIndicatorInsets={{ top: topInset, bottom: bottomOffset + 88 }}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />

      <View style={[styles.composerDock, { paddingBottom: Math.max(bottomOffset - 12, 8) }]}>
        {replyPreview ? (
          <View style={styles.replyComposerPreview}>
            <View style={styles.replyComposerCopy}>
              <ThemedText style={styles.replyComposerName} numberOfLines={1}>
                Replying to {replyPreview.senderName}
              </ThemedText>
              <ThemedText style={styles.replyComposerText} numberOfLines={1}>
                {replyPreview.preview}
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel="Cancel reply"
              accessibilityRole="button"
              onPress={onCancelReply}
              style={styles.replyComposerCancelButton}>
              <X color={designSystem.colors.copper} size={18} weight="bold" />
            </Pressable>
          </View>
        ) : null}
        <FriendChatComposer
          value={text}
          onChangeText={onChangeText}
          onSubmit={onSendText}
          onOpenTools={onOpenTools}
          placeholder={placeholder}
          isSending={isSending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function MeasuredWandrBubble<TMessage extends WandrMessageBase>({
  isDark,
  isOwnMessage,
  message,
  onMeasuredLongPress,
  onSwipeReply,
}: {
  isDark: boolean;
  isOwnMessage: boolean;
  message: TMessage;
  onMeasuredLongPress?: (anchor: MessageActionAnchor) => void;
  onSwipeReply?: () => void;
}) {
  const bubbleRef = useRef<View>(null);
  const swipeX = useRef(new Animated.Value(0)).current;
  const didSwipeReplyRef = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => {
        const isHorizontalSwipe =
          gesture.dx > 24 &&
          Math.abs(gesture.dy) < 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 3;
        return isHorizontalSwipe;
      },
      onPanResponderGrant: () => {
        didSwipeReplyRef.current = false;
      },
      onPanResponderMove: (_event, gesture) => {
        const nextX = Math.min(72, Math.max(0, gesture.dx));
        swipeX.setValue(nextX);
        if (nextX > 56 && !didSwipeReplyRef.current) {
          didSwipeReplyRef.current = true;
          onSwipeReply?.();
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(swipeX, {
          toValue: 0,
          useNativeDriver: true,
          speed: 24,
          bounciness: 6,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, {
          toValue: 0,
          useNativeDriver: true,
          speed: 24,
          bounciness: 6,
        }).start();
      },
    })
  ).current;

  return (
    <View style={[styles.messageWrap, isOwnMessage ? styles.messageWrapOwn : null]}>
      <View style={styles.swipeShell}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.swipeReplyHint,
            {
              opacity: swipeX.interpolate({ inputRange: [0, 34, 56], outputRange: [0, 0.4, 1], extrapolate: 'clamp' }),
              transform: [
                { scale: swipeX.interpolate({ inputRange: [0, 56], outputRange: [0.82, 1], extrapolate: 'clamp' }) },
              ],
            },
          ]}>
          <ArrowBendUpLeft color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen} size={18} weight="bold" />
        </Animated.View>
        <Animated.View
          ref={bubbleRef}
          collapsable={false}
          style={[
            styles.swipeBubbleLayer,
            isOwnMessage ? styles.swipeBubbleLayerOwn : null,
            { transform: [{ translateX: swipeX }] },
          ]}
          {...panResponder.panHandlers}>
          <Pressable
            accessibilityRole="button"
            delayLongPress={420}
            onLongPress={() => {
              bubbleRef.current?.measureInWindow((x, y, width, height) => {
                onMeasuredLongPress?.({ x, y, width, height });
              });
            }}
            style={[
              styles.bubble,
              isOwnMessage
                ? styles.bubbleOwn
                : [styles.bubbleOther, isDark ? styles.bubbleOtherDark : styles.bubbleOtherLight],
            ]}>
            <ReplyQuote isDark={isDark} isOwnMessage={isOwnMessage} replyTo={message.replyTo} />
            <ThemedText
              style={[
                styles.messageText,
                isOwnMessage ? styles.messageTextOwn : isDark ? styles.messageTextOtherDark : styles.messageTextOtherLight,
              ]}>
              {message.body ?? ''}
            </ThemedText>
            <ThemedText style={[styles.messageTime, isOwnMessage ? styles.messageTimeOwn : styles.messageTimeOther]}>
              {formatChatTime(message.createdAt)}
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function ReplyQuote({
  isDark,
  isOwnMessage,
  replyTo,
}: {
  isDark: boolean;
  isOwnMessage: boolean;
  replyTo?: {
    senderName: string;
    preview: string;
  } | null;
}) {
  if (!replyTo) {
    return null;
  }

  return (
    <View
      style={[
        styles.quotedInBubble,
        isOwnMessage ? styles.quotedInOwnBubble : null,
        !isOwnMessage && isDark ? styles.quotedInDarkBubble : null,
      ]}>
      <ThemedText
        style={[
          styles.quotedSender,
          isOwnMessage ? styles.quotedSenderOwn : null,
          !isOwnMessage && isDark ? styles.quotedSenderDark : null,
        ]}
        numberOfLines={1}>
        {replyTo.senderName}
      </ThemedText>
      <ThemedText
        style={[
          styles.quotedPreview,
          isOwnMessage ? styles.quotedPreviewOwn : null,
          !isOwnMessage && isDark ? styles.quotedPreviewDark : null,
        ]}
        numberOfLines={2}>
        {replyTo.preview}
      </ThemedText>
    </View>
  );
}

function formatChatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: designSystem.spacing.lg,
  },
  header: {
    marginBottom: designSystem.spacing.xl,
  },
  messageRow: {
    marginBottom: 16,
  },
  messageWrap: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  messageWrapOwn: {
    alignItems: 'flex-end',
  },
  swipeShell: {
    justifyContent: 'center',
    width: '100%',
  },
  swipeBubbleLayer: {
    maxWidth: '82%',
    alignSelf: 'flex-start',
  },
  swipeBubbleLayerOwn: {
    alignSelf: 'flex-end',
  },
  swipeReplyHint: {
    position: 'absolute',
    left: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surfaceRaised,
  },
  bubble: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 7,
  },
  bubbleOwn: {
    backgroundColor: designSystem.colors.lime,
    borderTopRightRadius: 8,
  },
  bubbleOther: {
    borderTopLeftRadius: 8,
    borderWidth: 1,
    boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
    elevation: 2,
  },
  bubbleOtherLight: {
    backgroundColor: designSystem.colors.surfaceRaised,
    borderColor: designSystem.colors.borderSoft,
  },
  bubbleOtherDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkSurfaceBorder,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  messageTextOwn: {
    color: designSystem.colors.oliveInk,
  },
  messageTextOtherLight: {
    color: designSystem.colors.lightTextStrong,
  },
  messageTextOtherDark: {
    color: designSystem.colors.darkText,
  },
  messageTime: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
  },
  messageTimeOwn: {
    color: 'rgba(15,20,13,0.56)',
  },
  messageTimeOther: {
    color: designSystem.colors.placeholderText,
  },
  quotedInBubble: {
    marginBottom: 7,
    paddingLeft: 10,
    paddingVertical: 7,
    paddingRight: 12,
    backgroundColor: 'rgba(14,15,12,0.045)',
    borderRadius: 12,
  },
  quotedInOwnBubble: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  quotedInDarkBubble: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  quotedSender: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  quotedSenderOwn: {
    color: designSystem.colors.darkGreen,
  },
  quotedSenderDark: {
    color: designSystem.colors.lime,
  },
  quotedPreview: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  quotedPreviewOwn: {
    color: 'rgba(15,20,13,0.72)',
  },
  quotedPreviewDark: {
    color: designSystem.colors.darkMutedText,
  },
  composerDock: {
    paddingTop: 10,
    paddingHorizontal: designSystem.spacing.lg,
    backgroundColor: 'transparent',
  },
  replyComposerPreview: {
    minHeight: 48,
    marginBottom: 8,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: designSystem.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  replyComposerCopy: {
    flex: 1,
    minWidth: 0,
  },
  replyComposerName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  replyComposerText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: designSystem.colors.gray,
  },
  replyComposerCancelButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
