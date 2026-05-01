import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FriendChatComposer } from '@/components/wandr/friends/friend-chat-composer';
import { DirectChatMessageBubble } from '@/components/wandr/friends/friend-chat-message';
import { FriendChatToolsSheet } from '@/components/wandr/friends/friend-chat-tools-sheet';
import { MessageActionMenu, type MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import {
  deleteDirectFriendMessageRef,
  getDirectChatRef,
  markDirectChatReadRef,
  sendDirectFriendMessageRef,
} from '@/lib/convex';
import type { DirectChatMessage } from '@/types/friends';

export default function DirectChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const traveler = useCurrentTraveler();
  const { isBootstrapping, bootstrapError } = useFriendsBootstrap(traveler?.slug);
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
  const markRead = useMutation(markDirectChatReadRef);
  const sendMessage = useMutation(sendDirectFriendMessageRef);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DirectChatMessage | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<MessageActionAnchor | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const toolsSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (!chat?.messages?.length) {
      return;
    }
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [chat?.messages.length]);

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
      });
      setDraft('');
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

  const handleMessageLongPress = (message: DirectChatMessage, anchor: MessageActionAnchor) => {
    if (!message.isOwnMessage) {
      return;
    }
    setSelectedMessage(message);
    setMessageMenuAnchor(anchor);
  };

  const isLoading = isBootstrapping || traveler === undefined || chat === undefined;

  if (isLoading) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          }}
        />
        <View style={[styles.loadingWrap, { paddingTop: insets.top + 96 }]}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          }}
        />

        <ScrollView
          ref={scrollRef}
          style={styles.messageScroller}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 88,
              paddingBottom: insets.bottom + 184,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <ThemedText style={styles.title}>{chat?.participant.name ?? 'Chat'}</ThemedText>
            <ThemedText style={styles.subtitle}>{chat?.participant.baseLabel ?? ''}</ThemedText>
          </View>

          {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}

          <View style={styles.messageStack}>
            {chat?.messages.map((message) => (
              <DirectChatMessageBubble
                key={message._id}
                message={message}
                onLongPressMessage={handleMessageLongPress}
              />
            ))}
          </View>
        </ScrollView>

        <MessageActionMenu
          visible={Boolean(selectedMessage && messageMenuAnchor)}
          anchor={messageMenuAnchor}
          onClose={() => {
            setSelectedMessage(null);
            setMessageMenuAnchor(null);
          }}
          onDelete={() => {
            if (selectedMessage) {
              void handleDeleteMessage(selectedMessage);
            }
          }}
        />

        {chat && !isToolsSheetOpen ? (
          <View style={[styles.composerDock, { paddingBottom: Math.max(insets.bottom, 6) }]}>
            <FriendChatComposer
              value={draft}
              onChangeText={setDraft}
              onSubmit={handleSend}
              onOpenTools={() => {
                setIsToolsSheetOpen(true);
                toolsSheetRef.current?.snapToIndex(0);
              }}
              placeholder={chat.composer.placeholder}
              isSending={isSending}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {chat ? (
        <FriendChatToolsSheet
          sheetRef={toolsSheetRef}
          onChange={(index) => setIsToolsSheetOpen(index >= 0)}
          onShareRoute={() => {}}
          quickActions={[]}
          onQuickAction={() => {}}
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xl,
  },
  messageScroller: {
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
  messageStack: {
    gap: 16,
  },
  composerDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingTop: 20,
    paddingHorizontal: designSystem.spacing.lg,
    backgroundColor: 'transparent',
  },
});
