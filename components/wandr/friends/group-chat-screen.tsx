import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { styles } from '@/components/wandr/friends/group-chat-screen.styles';
import { MessageActionMenu, type MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { FriendChatMessageBubble } from '@/components/wandr/friends/friend-chat-message';
import { FriendChatToolsSheet } from '@/components/wandr/friends/friend-chat-tools-sheet';
import { WandrGiftedChat } from '@/components/wandr/friends/wandr-gifted-chat';
import { WandrHeader } from '@/components/wandr/header';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { useResponsive } from '@/hooks/use-responsive';
import {
  deleteFriendCircleRef,
  deleteFriendMessageRef,
  getFriendChatRef,
  leaveFriendCircleRef,
  markFriendChatReadRef,
  renameFriendCircleRef,
  sendFriendMessageRef,
  shareTripRouteInFriendChatRef,
} from '@/lib/convex';
import type { FriendChatMessage } from '@/types/friends';
import { getReplyPreview, quickMessageByKey } from '@/components/wandr/friends/group-chat-model';

type FriendsChatScreenProps = {
  circleId?: string;
  onClose?: () => void;
};

export default function FriendsChatScreen({ circleId: circleIdProp, onClose }: FriendsChatScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<{ circleId?: string | string[] }>();
  const routeCircleId = Array.isArray(params.circleId) ? params.circleId[0] : params.circleId;
  const circleId = circleIdProp ?? routeCircleId;
  const { isLargeScreen } = useResponsive();
  const traveler = useCurrentTraveler();
  const { bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const chat = useQuery(
    getFriendChatRef,
    traveler?.slug && circleId ? { travelerSlug: traveler.slug, circleId: circleId as never } : 'skip'
  );
  const deleteCircle = useMutation(deleteFriendCircleRef);
  const deleteMessage = useMutation(deleteFriendMessageRef);
  const leaveCircle = useMutation(leaveFriendCircleRef);
  const markRead = useMutation(markFriendChatReadRef);
  const renameCircle = useMutation(renameFriendCircleRef);
  const sendMessage = useMutation(sendFriendMessageRef);
  const shareRoute = useMutation(shareTripRouteInFriendChatRef);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<FriendChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<FriendChatMessage | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<MessageActionAnchor | null>(null);

  useEffect(() => {
    if (!isLargeScreen || circleIdProp || !routeCircleId) return;
    router.replace({ pathname: '/friends/chat', params: { groupCircleId: routeCircleId } });
  }, [circleIdProp, isLargeScreen, routeCircleId, router]);

  useEffect(() => {
    if (!traveler?.slug || !chat?.circle?._id) return;
    void markRead({ circleId: chat.circle._id, travelerSlug: traveler.slug });
  }, [chat?.circle?._id, chat?.messages.length, markRead, traveler?.slug]);

  const handleSend = async () => {
    if (!traveler?.slug || !chat?.circle?._id || !draft.trim() || isSending) return;
    setIsSending(true);
    try {
      await sendMessage({ circleId: chat.circle._id, travelerSlug: traveler.slug, body: draft, replyToMessageId: replyingToMessage?._id });
      setDraft('');
      setReplyingToMessage(null);
    } finally { setIsSending(false); }
  };

  const handleQuickAction = async (key: string) => {
    if (!traveler?.slug || !chat?.circle?._id || isSending) return;
    if (key === 'route') { await handleShareRoute(); return; }
    const body = quickMessageByKey[key];
    if (!body) return;
    setIsSending(true);
    try {
      await sendMessage({ circleId: chat.circle._id, travelerSlug: traveler.slug, body, replyToMessageId: replyingToMessage?._id });
      setReplyingToMessage(null);
    } finally { setIsSending(false); }
  };

  const handleShareRoute = async () => {
    if (!traveler?.slug || !chat?.circle?._id || isSending) return;
    setIsSending(true);
    try { await shareRoute({ circleId: chat.circle._id, travelerSlug: traveler.slug }); }
    finally { setIsSending(false); }
  };

  const handleSendMedia = async (body: string) => {
    if (!traveler?.slug || !chat?.circle?._id || isSending) return;
    setIsSending(true);
    try {
      await sendMessage({ circleId: chat.circle._id, travelerSlug: traveler.slug, body, replyToMessageId: replyingToMessage?._id });
      setReplyingToMessage(null);
    } finally { setIsSending(false); }
  };

  const handleDeleteMessage = async (message: FriendChatMessage) => {
    if (!traveler?.slug || !message.isOwnMessage) return;
    await deleteMessage({ messageId: message._id, travelerSlug: traveler.slug });
  };

  const handleRename = async (nextName: string) => {
    if (!traveler?.slug || !chat?.circle?._id) return;
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === chat.circle.name) return;
    await renameCircle({ circleId: chat.circle._id, travelerSlug: traveler.slug, name: trimmed });
  };

  const handleLeaveCircle = () => {
    if (!traveler?.slug || !chat?.circle?._id) return;
    Alert.alert('Leave group?', `You will leave ${chat.circle.name} and remove its shared trip from your list.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          await leaveCircle({ circleId: chat.circle._id, travelerSlug: traveler.slug });
          onClose ? onClose() : router.replace('/friends/chat');
        },
      },
    ]);
  };

  const handleDeleteCircle = () => {
    if (!traveler?.slug || !chat?.circle?._id) return;
    Alert.alert('Delete group?', `This deletes ${chat.circle.name}, its chat, and linked group trips for everyone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const deleted = await deleteCircle({ circleId: chat.circle._id, travelerSlug: traveler.slug });
          if (deleted) { onClose ? onClose() : router.replace('/friends/chat'); }
        },
      },
    ]);
  };

  const handleOptionsPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Rename Group', 'Leave Group', 'Delete Group', 'Cancel'], destructiveButtonIndex: 2, cancelButtonIndex: 3, userInterfaceStyle: isDark ? 'dark' : 'light', title: chat?.circle.name },
        (i) => {
          if (i === 0) Alert.prompt('Rename Group', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Rename', onPress: (text?: string) => { if (text?.trim()) void handleRename(text); } }], 'plain-text', chat?.circle.name);
          if (i === 1) handleLeaveCircle();
          if (i === 2) handleDeleteCircle();
        }
      );
    } else {
      Alert.alert(chat?.circle.name ?? 'Group', undefined, [
        { text: 'Leave Group', style: 'destructive', onPress: handleLeaveCircle },
        { text: 'Delete Group', style: 'destructive', onPress: handleDeleteCircle },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  if (isLargeScreen && !circleIdProp) return null;

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back', onPress: onClose },
          trailingActions: [
            { kind: 'menu', accessibilityLabel: 'Group options', onPress: handleOptionsPress },
          ],
        }}
      />

      <WandrGiftedChat<FriendChatMessage>
        bottomOffset={insets.bottom}
        header={bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}
        isSending={isSending}
        isWidgetMessage={(message) =>
          message.kind === 'system' ||
          Boolean(message.routeCard || message.body?.startsWith('wandr:sticker:') || message.body?.startsWith('wandr:gif:') || message.body?.startsWith('wandr:media:'))
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
          <FriendChatMessageBubble
            message={message}
            onLongPressMessage={(msg, anchor) => { setSelectedMessage(msg); setMessageMenuAnchor(anchor); }}
          />
        )}
        text={draft}
        topInset={insets.top + 76}
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
        onShareRoute={handleShareRoute}
        quickActions={chat?.composer.quickActions ?? []}
        onQuickAction={handleQuickAction}
        onGifAction={handleSendMedia}
        onStickerAction={handleSendMedia}
      />
    </ThemedView>
  );
}
