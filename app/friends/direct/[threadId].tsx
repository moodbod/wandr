import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CallHistorySheet } from '@/components/wandr/friends/call-history-sheet';
import { CallOptionsMenu } from '@/components/wandr/friends/call-options-menu';
import { DirectChatOptionsSheet } from '@/components/wandr/friends/direct-chat-options-sheet';
import { DirectChatMessageBubble, type ChatCallCard } from '@/components/wandr/friends/friend-chat-message';
import { FriendChatToolsSheet } from '@/components/wandr/friends/friend-chat-tools-sheet';
import { MessageActionMenu, type MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { WandrGiftedChat } from '@/components/wandr/friends/wandr-gifted-chat';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { useResponsive } from '@/hooks/use-responsive';
import {
  deleteDirectFriendMessageRef,
  deleteDirectFriendThreadRef,
  getDirectChatRef,
  markDirectChatReadRef,
  renameDirectFriendThreadRef,
  sendDirectFriendMessageRef,
  startDirectFriendCallRef,
} from '@/lib/convex';
import type { DirectChatMessage } from '@/types/friends';

type DirectChatScreenProps = {
  onClose?: () => void;
  threadId?: string;
};

function getReplyPreview(message: DirectChatMessage) {
  if (message.callCard) {
    return message.callCard.title;
  }
  if (message.body?.startsWith('wandr:sticker:')) {
    return 'Sticker';
  }
  if (message.body?.startsWith('wandr:gif:')) {
    return 'GIF';
  }
  if (message.body?.startsWith('wandr:media:')) {
    try {
      const media = JSON.parse(decodeURIComponent(message.body.replace('wandr:media:', ''))) as { kind?: string; title?: string };
      return media.title ?? (media.kind === 'gif' ? 'GIF' : 'Sticker');
    } catch {
      return 'Media';
    }
  }
  return message.body || 'Message';
}

export default function DirectChatScreen({ onClose, threadId: threadIdProp }: DirectChatScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const routeThreadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const threadId = threadIdProp ?? routeThreadId;
  const { isLargeScreen } = useResponsive();
  const { openCall } = useActiveFriendCall();
  const traveler = useCurrentTraveler();
  const { bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const chat = useQuery(
    getDirectChatRef,
    traveler?.slug && threadId
      ? {
          travelerSlug: traveler.slug,
          threadId: threadId as never,
        }
      : 'skip'
  );
  const deleteMessage = useMutation(deleteDirectFriendMessageRef);
  const deleteThread = useMutation(deleteDirectFriendThreadRef);
  const markRead = useMutation(markDirectChatReadRef);
  const renameThread = useMutation(renameDirectFriendThreadRef);
  const sendMessage = useMutation(sendDirectFriendMessageRef);
  const startCall = useMutation(startDirectFriendCallRef);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCallBusy, setIsCallBusy] = useState(false);
  const [isSheetBusy, setIsSheetBusy] = useState(false);
  const [selectedCallCard, setSelectedCallCard] = useState<ChatCallCard | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<DirectChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<DirectChatMessage | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<MessageActionAnchor | null>(null);
  const menuSheetRef = useRef<BottomSheet>(null);
  const callHistorySheetRef = useRef<BottomSheet>(null);
  const toolsSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (!isLargeScreen || threadIdProp || !routeThreadId) {
      return;
    }

    router.replace({
      pathname: '/friends/chat',
      params: { directThreadId: routeThreadId },
    });
  }, [isLargeScreen, routeThreadId, router, threadIdProp]);

  useEffect(() => {
    if (!traveler?.slug || !chat?.threadId) {
      return;
    }

    void markRead({
      threadId: chat.threadId,
      travelerSlug: traveler.slug,
    });
  }, [chat?.messages.length, chat?.threadId, markRead, traveler?.slug]);

  const handleSend = async () => {
    if (!traveler?.slug || !chat?.threadId || !draft.trim() || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await sendMessage({
        threadId: chat.threadId,
        travelerSlug: traveler.slug,
        body: draft,
        replyToMessageId: replyingToMessage?._id,
      });
      setDraft('');
      setReplyingToMessage(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartCall = async (mode: 'voice' | 'video') => {
    if (!traveler?.slug || !chat?.threadId || isCallBusy) {
      return;
    }

    setIsCallBusy(true);
    try {
      const call = await startCall({
        threadId: chat.threadId,
        travelerSlug: traveler.slug,
        mode,
      });
      if (call?._id) {
        if (isLargeScreen) {
          openCall(call._id as Id<'calls'>);
          return;
        }
        router.push(`/friends/call/${call._id}`);
      }
    } catch (error) {
      Alert.alert(
        'Call unavailable',
        error instanceof Error ? error.message : 'Unable to start this call right now.'
      );
    } finally {
      setIsCallBusy(false);
    }
  };

  const handleSendMedia = async (body: string) => {
    if (!traveler?.slug || !chat?.threadId || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await sendMessage({
        threadId: chat.threadId,
        travelerSlug: traveler.slug,
        body,
        replyToMessageId: replyingToMessage?._id,
      });
      setReplyingToMessage(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (message: DirectChatMessage) => {
    if (!traveler?.slug || !message.isOwnMessage) {
      return;
    }

    await deleteMessage({
      messageId: message._id,
      travelerSlug: traveler.slug,
    });
  };

  const handleRenameThread = async (nextTitle: string) => {
    if (!traveler?.slug || !chat?.threadId || isSheetBusy) {
      return;
    }

    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle || trimmedTitle === chat.title) {
      return;
    }

    setIsSheetBusy(true);
    try {
      await renameThread({
        threadId: chat.threadId,
        travelerSlug: traveler.slug,
        title: trimmedTitle,
      });
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleDeleteThread = () => {
    if (!traveler?.slug || !chat?.threadId || isSheetBusy) {
      return;
    }

    Alert.alert('Delete chat?', `This deletes your chat with ${chat.participant.name} and clears its messages.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsSheetBusy(true);
          try {
            const deleted = await deleteThread({
              threadId: chat.threadId,
              travelerSlug: traveler.slug,
            });
            if (deleted) {
              menuSheetRef.current?.close();
              if (onClose) {
                onClose();
                return;
              }
              router.replace('/friends/chat');
            }
          } finally {
            setIsSheetBusy(false);
          }
        },
      },
    ]);
  };

  const handleMessageLongPress = (message: DirectChatMessage, anchor: MessageActionAnchor) => {
    setSelectedMessage(message);
    setMessageMenuAnchor(anchor);
  };

  const handleTextMessageLongPress = (message: DirectChatMessage, anchor: MessageActionAnchor) => {
    setSelectedMessage(message);
    setMessageMenuAnchor(anchor);
  };

  const handleOpenCallCard = (callCard: ChatCallCard) => {
    setSelectedCallCard(callCard);
    callHistorySheetRef.current?.snapToIndex(0);
  };

  if (isLargeScreen && !threadIdProp) {
    return null;
  }

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back', onPress: onClose },
          trailingActions: [
            {
              kind: 'call',
              accessibilityLabel: 'Call this friend',
              render: ({ iconColor }) => (
                <CallOptionsMenu
                  disabled={isCallBusy || !traveler?.slug || !chat?.threadId}
                  iconColor={iconColor}
                  onStartVideoCall={() => handleStartCall('video')}
                  onStartVoiceCall={() => handleStartCall('voice')}
                />
              ),
            },
            {
              kind: 'menu',
              accessibilityLabel: 'Chat options',
              onPress: () => menuSheetRef.current?.snapToIndex(0),
            },
          ],
        }}
      />

      <WandrGiftedChat<DirectChatMessage>
        bottomOffset={insets.bottom}
        header={
          <>
        <View style={styles.hero}>
          <ThemedText style={styles.title}>{chat?.title ?? 'Chat'}</ThemedText>
          <ThemedText style={styles.subtitle}>{chat?.participant.baseLabel ?? ''}</ThemedText>
        </View>

        {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}
          </>
        }
        isSending={isSending}
        isWidgetMessage={(message) =>
          Boolean(
              message.callCard ||
              message.body?.startsWith('wandr:sticker:') ||
              message.body?.startsWith('wandr:gif:') ||
              message.body?.startsWith('wandr:media:')
          )
        }
        messages={chat?.messages ?? []}
        onChangeText={setDraft}
        onCancelReply={() => setReplyingToMessage(null)}
        onLongPressMessage={handleTextMessageLongPress}
        onReplyMessage={setReplyingToMessage}
        onOpenTools={() => {
          toolsSheetRef.current?.snapToIndex(0);
        }}
        onSendText={handleSend}
        placeholder={chat?.composer.placeholder ?? 'Message'}
        replyPreview={
          replyingToMessage
            ? {
                senderName: replyingToMessage.senderName,
                preview: getReplyPreview(replyingToMessage),
              }
            : null
        }
        renderWidgetMessage={(message) => (
          <DirectChatMessageBubble
            message={message}
            onOpenCallCard={handleOpenCallCard}
            onLongPressMessage={handleMessageLongPress}
          />
        )}
        text={draft}
        topInset={insets.top + 88}
        userSlug={traveler?.slug}
      />

      <MessageActionMenu
        visible={Boolean(selectedMessage)}
        anchor={messageMenuAnchor}
        canDelete={Boolean(selectedMessage?.isOwnMessage)}
        onClose={() => {
          setSelectedMessage(null);
          setMessageMenuAnchor(null);
        }}
        onDelete={() => {
          if (selectedMessage) {
            void handleDeleteMessage(selectedMessage);
          }
        }}
        onReply={() => {
          if (selectedMessage) {
            setReplyingToMessage(selectedMessage);
          }
        }}
      />

      {chat ? (
        <CallHistorySheet
          callCard={selectedCallCard}
          contextLabel={chat.title}
          isBusy={isCallBusy}
          onStartVideoCall={() => {
            callHistorySheetRef.current?.close();
            void handleStartCall('video');
          }}
          onStartVoiceCall={() => {
            callHistorySheetRef.current?.close();
            void handleStartCall('voice');
          }}
          sheetRef={callHistorySheetRef}
        />
      ) : null}

      {chat ? (
        <DirectChatOptionsSheet
          chat={chat}
          isBusy={isSheetBusy}
          onDeleteChat={handleDeleteThread}
          onRenameChat={handleRenameThread}
          sheetRef={menuSheetRef}
        />
      ) : null}

      {chat ? (
        <FriendChatToolsSheet
          sheetRef={toolsSheetRef}
          onShareRoute={() => {}}
          quickActions={[]}
          onQuickAction={() => {}}
          onGifAction={handleSendMedia}
          onStickerAction={handleSendMedia}
          showRouteButton={false}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    gap: 4,
  },
  title: {
    fontSize: 32,
    lineHeight: 30,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.copper,
  },
});
