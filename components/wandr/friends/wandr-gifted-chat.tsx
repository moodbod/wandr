import { ReactNode, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Bubble, GiftedChat, Time, type BubbleProps, type IMessage } from 'react-native-gifted-chat';
import { ArrowBendUpLeft, X } from 'phosphor-react-native';

import { FriendChatComposer } from '@/components/wandr/friends/friend-chat-composer';
import { ThemedText } from '@/components/themed-text';
import type { MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type WandrGiftedMessage<TMessage> = IMessage & {
  sourceMessage: TMessage;
};

type WandrMessageBase = {
  _id: string;
  body: string | null;
  createdAt: number;
  senderAvatarUri: string | null;
  senderName: string;
  senderSlug: string;
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
  const giftedMessages = useMemo(
    () =>
      messages.map((message) => ({
        _id: message._id,
        text: message.body ?? '',
        createdAt: new Date(message.createdAt),
        sourceMessage: message,
        user: {
          _id: message.senderSlug,
          name: message.senderName,
          avatar: message.senderAvatarUri ?? undefined,
        },
      })),
    [messages]
  );

  return (
    <GiftedChat<WandrGiftedMessage<TMessage>>
      alwaysShowSend
      bottomOffset={bottomOffset}
      infiniteScroll={false}
      inverted={false}
      isKeyboardInternallyHandled
      keyboardShouldPersistTaps="handled"
      maxComposerHeight={144}
      messages={giftedMessages}
      messagesContainerStyle={[
        styles.messagesContainer,
        styles.content,
        {
          paddingTop: topInset,
          paddingBottom: designSystem.spacing.xl,
        },
      ]}
      minComposerHeight={52}
      minInputToolbarHeight={72 + bottomOffset}
      onInputTextChanged={onChangeText}
      onSend={onSendText}
      placeholder={placeholder}
      renderAvatar={null}
      renderBubble={(props) => {
        const sourceMessage = (props.currentMessage as WandrGiftedMessage<TMessage>).sourceMessage;

        if (isWidgetMessage?.(sourceMessage) && renderWidgetMessage) {
          return <View style={styles.messageRow}>{renderWidgetMessage(sourceMessage)}</View>;
        }

        return (
          <MeasuredGiftedBubble
            isDark={isDark}
            onMeasuredLongPress={(anchor) => onLongPressMessage?.(sourceMessage, anchor)}
            onSwipeReply={() => onReplyMessage?.(sourceMessage)}
            props={props as BubbleProps<WandrGiftedMessage<TMessage>>}
          />
        );
      }}
      renderChatEmpty={() => null}
      renderDay={() => null}
      renderInputToolbar={() => (
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
      )}
      renderUsernameOnMessage={false}
      text={text}
      user={{ _id: userSlug ?? 'wandr-user' }}
      listViewProps={{
        ListHeaderComponent: header ? <View style={styles.header}>{header}</View> : null,
      } as any}
    />
  );
}

function MeasuredGiftedBubble<TMessage extends WandrMessageBase>({
  isDark,
  onMeasuredLongPress,
  onSwipeReply,
  props,
}: {
  isDark: boolean;
  onMeasuredLongPress?: (anchor: MessageActionAnchor) => void;
  onSwipeReply?: () => void;
  props: BubbleProps<WandrGiftedMessage<TMessage>>;
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
    <View style={styles.swipeShell}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.swipeReplyHint,
          {
            opacity: swipeX.interpolate({ inputRange: [0, 34, 56], outputRange: [0, 0.4, 1], extrapolate: 'clamp' }),
            transform: [{ scale: swipeX.interpolate({ inputRange: [0, 56], outputRange: [0.82, 1], extrapolate: 'clamp' }) }],
          },
        ]}>
        <ArrowBendUpLeft color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen} size={18} weight="bold" />
      </Animated.View>
      <Animated.View
        ref={bubbleRef}
        collapsable={false}
        style={[styles.swipeBubbleLayer, { transform: [{ translateX: swipeX }] }]}
        {...panResponder.panHandlers}>
        <Bubble
          {...props}
          containerStyle={{
            left: styles.libBubbleContainer,
            right: styles.libBubbleContainer,
          }}
          textStyle={{
            left: [styles.libBubbleText, isDark ? styles.libBubbleTextDark : styles.libBubbleTextLeft],
            right: [styles.libBubbleText, styles.libBubbleTextRight],
          }}
          renderTime={(timeProps) => (
            <Time
              {...timeProps}
              timeTextStyle={{
                left: styles.libBubbleTimeLeft,
                right: styles.libBubbleTimeRight,
              }}
            />
          )}
          renderCustomView={(bubbleProps) => {
            const quotedMessage = (bubbleProps.currentMessage as WandrGiftedMessage<TMessage>).sourceMessage.replyTo;
            if (!quotedMessage) {
              return null;
            }

            const isOwnBubble = bubbleProps.position === 'right';
            return (
              <View
                style={[
                  styles.quotedInBubble,
                  isOwnBubble ? styles.quotedInOwnBubble : null,
                  !isOwnBubble && isDark ? styles.quotedInDarkBubble : null,
                ]}>
                <ThemedText
                  style={[
                    styles.quotedSender,
                    isOwnBubble ? styles.quotedSenderOwn : null,
                    !isOwnBubble && isDark ? styles.quotedSenderDark : null,
                  ]}
                  numberOfLines={1}>
                  {quotedMessage.senderName}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.quotedPreview,
                    isOwnBubble ? styles.quotedPreviewOwn : null,
                    !isOwnBubble && isDark ? styles.quotedPreviewDark : null,
                  ]}
                  numberOfLines={2}>
                  {quotedMessage.preview}
                </ThemedText>
              </View>
            );
          }}
          isCustomViewBottom={false}
          onLongPress={() => {
            bubbleRef.current?.measureInWindow((x, y, width, height) => {
              onMeasuredLongPress?.({ x, y, width, height });
            });
          }}
          wrapperStyle={{
            left: [isDark ? styles.libBubbleLeftDark : null],
            right: styles.libBubbleRight,
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  messagesContainer: {
    backgroundColor: 'transparent',
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
  swipeShell: {
    justifyContent: 'center',
    width: '100%',
  },
  swipeBubbleLayer: {
    width: '100%',
    alignSelf: 'stretch',
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
  libBubbleContainer: {
    marginBottom: 6,
  },
  libBubbleLeftDark: {
    backgroundColor: designSystem.colors.darkSurface,
  },
  libBubbleRight: {
    backgroundColor: designSystem.colors.lime,
  },
  libBubbleText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  libBubbleTextLeft: {
    color: designSystem.colors.lightTextStrong,
  },
  libBubbleTextDark: {
    color: designSystem.colors.darkText,
  },
  libBubbleTextRight: {
    color: designSystem.colors.oliveInk,
  },
  libBubbleTimeLeft: {
    color: designSystem.colors.placeholderText,
    fontSize: 11,
    fontWeight: '600',
  },
  libBubbleTimeRight: {
    color: 'rgba(15,20,13,0.56)',
    fontSize: 11,
    fontWeight: '600',
  },
  quotedInBubble: {
    marginHorizontal: 7,
    marginTop: 7,
    marginBottom: 0,
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
