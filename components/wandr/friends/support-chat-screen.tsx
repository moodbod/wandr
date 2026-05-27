import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MessageActionMenu, type MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { styles } from '@/components/wandr/friends/direct-chat-screen.styles';
import { WandrGiftedChat } from '@/components/wandr/friends/wandr-gifted-chat';
import { WandrHeader } from '@/components/wandr/header';
import type { Id } from '@/convex/_generated/dataModel';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useResponsive } from '@/hooks/use-responsive';
import { getSupportChatRef, markSupportChatReadRef, sendSupportMessageRef } from '@/lib/convex';
import type { SupportChatMessage } from '@/types/friends';

type SupportChatScreenProps = {
  embedded?: boolean;
  onClose?: () => void;
  threadId?: string;
};

function getReplyPreview(message: SupportChatMessage) {
  return message.body || 'Message';
}

export default function SupportChatScreen({
  embedded = false,
  onClose,
  threadId: threadIdProp,
}: SupportChatScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const routeThreadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const threadId = threadIdProp ?? routeThreadId;
  const { isLargeScreen } = useResponsive();
  const traveler = useCurrentTraveler();
  const chat = useQuery(
    getSupportChatRef,
    traveler?.slug
      ? {
          travelerSlug: traveler.slug,
          ...(threadId ? { threadId: threadId as Id<'supportThreads'> } : {}),
        }
      : 'skip'
  );
  const markRead = useMutation(markSupportChatReadRef);
  const sendMessage = useMutation(sendSupportMessageRef);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SupportChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<SupportChatMessage | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<MessageActionAnchor | null>(null);
  const lastRouteThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLargeScreen || embedded) {
      return;
    }

    if (routeThreadId) {
      if (lastRouteThreadIdRef.current === routeThreadId) {
        return;
      }
      lastRouteThreadIdRef.current = routeThreadId;
      router.replace({
        pathname: '/friends/chat',
        params: { supportThreadId: routeThreadId },
      });
      return;
    }

    router.replace('/friends/chat');
  }, [embedded, isLargeScreen, routeThreadId, router]);

  useEffect(() => {
    if (!traveler?.slug || !chat?.threadId) {
      return;
    }

    void markRead({
      travelerSlug: traveler.slug,
      threadId: chat.threadId,
    });
  }, [chat?.messages.length, chat?.threadId, markRead, traveler?.slug]);

  const handleSend = async () => {
    if (!traveler?.slug || !draft.trim() || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await sendMessage({
        travelerSlug: traveler.slug,
        body: draft,
        threadId: chat?.threadId ?? (threadId ? (threadId as Id<'supportThreads'>) : undefined),
        replyToMessageId: replyingToMessage?._id,
      });
      setDraft('');
      setReplyingToMessage(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageLongPress = (message: SupportChatMessage, anchor: MessageActionAnchor) => {
    setSelectedMessage(message);
    setMessageMenuAnchor(anchor);
  };

  if (isLargeScreen && !embedded) {
    return null;
  }

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back', onPress: onClose },
        }}
      />

      <WandrGiftedChat<SupportChatMessage>
        bottomOffset={insets.bottom}
        hasTools={false}
        header={
          <View style={styles.hero}>
            <ThemedText style={styles.title}>{chat?.title ?? 'Wandr Support'}</ThemedText>
            <ThemedText style={styles.subtitle}>{chat?.subtitle ?? 'Support'}</ThemedText>
          </View>
        }
        isSending={isSending}
        messages={chat?.messages ?? []}
        onChangeText={setDraft}
        onCancelReply={() => setReplyingToMessage(null)}
        onLongPressMessage={handleMessageLongPress}
        onOpenTools={() => {}}
        onReplyMessage={setReplyingToMessage}
        onSendText={handleSend}
        placeholder={chat?.composer.placeholder ?? 'Message support'}
        replyPreview={
          replyingToMessage
            ? {
                senderName: replyingToMessage.senderName,
                preview: getReplyPreview(replyingToMessage),
              }
            : null
        }
        text={draft}
        topInset={insets.top + 88}
        userSlug={traveler?.slug}
      />

      <MessageActionMenu
        visible={Boolean(selectedMessage)}
        anchor={messageMenuAnchor}
        canDelete={false}
        onClose={() => {
          setSelectedMessage(null);
          setMessageMenuAnchor(null);
        }}
        onDelete={() => {}}
        onReply={() => {
          if (selectedMessage) {
            setReplyingToMessage(selectedMessage);
          }
        }}
      />
    </ThemedView>
  );
}
