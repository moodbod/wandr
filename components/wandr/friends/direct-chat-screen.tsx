import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DirectChatMessageBubble } from '@/components/wandr/friends/friend-chat-message';
import { FriendChatToolsSheet } from '@/components/wandr/friends/friend-chat-tools-sheet';
import { MessageActionMenu, type MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { styles } from '@/components/wandr/friends/direct-chat-screen.styles';
import { WandrGiftedChat } from '@/components/wandr/friends/wandr-gifted-chat';
import { WandrHeader } from '@/components/wandr/header';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
} from '@/lib/convex';
import type { DirectChatMessage } from '@/types/friends';

type DirectChatScreenProps = {
  onClose?: () => void;
  threadId?: string;
};

function getReplyPreview(message: DirectChatMessage) {
  if (message.body?.startsWith('wandr:sticker:') || message.body?.startsWith('wandr:gif:')) return 'Media';
  if (message.body?.startsWith('wandr:media:')) {
    try {
      const media = JSON.parse(decodeURIComponent(message.body.replace('wandr:media:', ''))) as { kind?: string; title?: string };
      return media.title ?? (media.kind === 'gif' ? 'GIF' : 'Sticker');
    } catch { return 'Media'; }
  }
  return message.body || 'Message';
}

export default function DirectChatScreen({ onClose, threadId: threadIdProp }: DirectChatScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const routeThreadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const threadId = threadIdProp ?? routeThreadId;
  const { isLargeScreen } = useResponsive();
  const traveler = useCurrentTraveler();
  const { bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const chat = useQuery(
    getDirectChatRef,
    traveler?.slug && threadId ? { travelerSlug: traveler.slug, threadId: threadId as never } : 'skip'
  );
  const deleteMessage = useMutation(deleteDirectFriendMessageRef);
  const deleteThread = useMutation(deleteDirectFriendThreadRef);
  const markRead = useMutation(markDirectChatReadRef);
  const renameThread = useMutation(renameDirectFriendThreadRef);
  const sendMessage = useMutation(sendDirectFriendMessageRef);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DirectChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<DirectChatMessage | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<MessageActionAnchor | null>(null);

  useEffect(() => {
    if (!isLargeScreen || threadIdProp || !routeThreadId) return;
    router.replace({ pathname: '/friends/chat', params: { directThreadId: routeThreadId } });
  }, [isLargeScreen, routeThreadId, router, threadIdProp]);

  useEffect(() => {
    if (!traveler?.slug || !chat?.threadId) return;
    void markRead({ threadId: chat.threadId, travelerSlug: traveler.slug });
  }, [chat?.messages.length, chat?.threadId, markRead, traveler?.slug]);

  const handleSend = async () => {
    if (!traveler?.slug || !chat?.threadId || !draft.trim() || isSending) return;
    setIsSending(true);
    try {
      await sendMessage({ threadId: chat.threadId, travelerSlug: traveler.slug, body: draft, replyToMessageId: replyingToMessage?._id });
      setDraft('');
      setReplyingToMessage(null);
    } finally { setIsSending(false); }
  };

  const handleSendMedia = async (body: string) => {
    if (!traveler?.slug || !chat?.threadId || isSending) return;
    setIsSending(true);
    try {
      await sendMessage({ threadId: chat.threadId, travelerSlug: traveler.slug, body, replyToMessageId: replyingToMessage?._id });
      setReplyingToMessage(null);
    } finally { setIsSending(false); }
  };

  const handleDeleteMessage = async (message: DirectChatMessage) => {
    if (!traveler?.slug || !message.isOwnMessage) return;
    await deleteMessage({ messageId: message._id, travelerSlug: traveler.slug });
  };

  const handleRename = async (nextTitle: string) => {
    if (!traveler?.slug || !chat?.threadId) return;
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === chat.title) return;
    await renameThread({ threadId: chat.threadId, travelerSlug: traveler.slug, title: trimmed });
  };

  const handleDeleteThread = () => {
    if (!traveler?.slug || !chat?.threadId) return;
    Alert.alert('Delete chat?', `This deletes your chat with ${chat.participant.name} and clears its messages.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const deleted = await deleteThread({ threadId: chat.threadId, travelerSlug: traveler.slug });
          if (deleted) { onClose ? onClose() : router.replace('/friends/chat'); }
        },
      },
    ]);
  };

  const handleOptionsPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Rename', 'Delete Chat', 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2, userInterfaceStyle: isDark ? 'dark' : 'light', title: chat?.title },
        (i) => {
          if (i === 0) Alert.prompt('Rename Chat', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Rename', onPress: (text?: string) => { if (text?.trim()) void handleRename(text); } }], 'plain-text', chat?.title);
          if (i === 1) handleDeleteThread();
        }
      );
    } else {
      Alert.alert(chat?.title ?? 'Chat', undefined, [
        { text: 'Delete Chat', style: 'destructive', onPress: handleDeleteThread },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  if (isLargeScreen && !threadIdProp) return null;

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back', onPress: onClose },
          trailingActions: [
            { kind: 'menu', accessibilityLabel: 'Chat options', onPress: handleOptionsPress },
          ],
        }}
      />

      <WandrGiftedChat<DirectChatMessage>
        bottomOffset={insets.bottom}
        header={
          <>
            <ThemedText style={styles.title}>{chat?.title ?? 'Chat'}</ThemedText>
            <ThemedText style={styles.subtitle}>{chat?.participant.baseLabel ?? ''}</ThemedText>
            {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}
          </>
        }
        isSending={isSending}
        isWidgetMessage={(message) =>
          Boolean(message.body?.startsWith('wandr:sticker:') || message.body?.startsWith('wandr:gif:') || message.body?.startsWith('wandr:media:'))
        }
        messages={chat?.messages ?? []}
        onChangeText={setDraft}
        onCancelReply={() => setReplyingToMessage(null)}
        onLongPressMessage={(message, anchor) => { setSelectedMessage(message); setMessageMenuAnchor(anchor); }}
        onReplyMessage={setReplyingToMessage}
        onOpenTools={() => setToolsVisible(true)}
        onSendText={handleSend}
        placeholder={chat?.composer.placeholder ?? 'Message'}
        replyPreview={replyingToMessage ? { senderName: replyingToMessage.senderName, preview: getReplyPreview(replyingToMessage) } : null}
        renderWidgetMessage={(message) => (
          <DirectChatMessageBubble
            message={message}
            onLongPressMessage={(msg, anchor) => { setSelectedMessage(msg); setMessageMenuAnchor(anchor); }}
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
        onClose={() => { setSelectedMessage(null); setMessageMenuAnchor(null); }}
        onDelete={() => selectedMessage && void handleDeleteMessage(selectedMessage)}
        onReply={() => selectedMessage && setReplyingToMessage(selectedMessage)}
      />

      <FriendChatToolsSheet
        visible={toolsVisible}
        onClose={() => setToolsVisible(false)}
        onShareRoute={() => {}}
        quickActions={[]}
        onQuickAction={() => {}}
        onGifAction={handleSendMedia}
        onStickerAction={handleSendMedia}
        showRouteButton={false}
      />
    </ThemedView>
  );
}
