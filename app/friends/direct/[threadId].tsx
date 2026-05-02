import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { DirectChatOptionsSheet } from '@/components/wandr/friends/direct-chat-options-sheet';
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
  deleteDirectFriendThreadRef,
  getDirectChatRef,
  markDirectChatReadRef,
  renameDirectFriendThreadRef,
  sendDirectFriendMessageRef,
} from '@/lib/convex';
import type { DirectChatMessage } from '@/types/friends';

export default function DirectChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
  const deleteThread = useMutation(deleteDirectFriendThreadRef);
  const markRead = useMutation(markDirectChatReadRef);
  const renameThread = useMutation(renameDirectFriendThreadRef);
  const sendMessage = useMutation(sendDirectFriendMessageRef);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSheetBusy, setIsSheetBusy] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DirectChatMessage | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<MessageActionAnchor | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const menuSheetRef = useRef<BottomSheet>(null);
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
    if (!message.isOwnMessage) {
      return;
    }
    setSelectedMessage(message);
    setMessageMenuAnchor(anchor);
  };

  const isLoading = isBootstrapping || traveler === undefined || chat === undefined;

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
            trailingActions: [
              {
                kind: 'menu',
                accessibilityLabel: 'Chat options',
                onPress: () => menuSheetRef.current?.snapToIndex(0),
              },
            ],
          }}
        />

        <ScrollView
          ref={scrollRef}
          style={styles.messageScroller}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 88,
              paddingBottom: insets.bottom + 156,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <ThemedText style={styles.title}>{chat?.title ?? 'Chat'}</ThemedText>
            <ThemedText style={styles.subtitle}>{chat?.participant.baseLabel ?? ''}</ThemedText>
          </View>

          {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}

          <View style={styles.messageStack}>
            {isLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonBlock
                    key={`direct-message-skeleton-${index}`}
                    style={[styles.messageSkeleton, index % 2 === 0 ? styles.messageSkeletonLeft : styles.messageSkeletonRight]}
                  />
                ))
              : chat?.messages.map((message) => (
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

        {chat ? (
          <View style={[styles.composerDock, { paddingBottom: Math.max(insets.bottom - 12, 8) }]}>
            <FriendChatComposer
              value={draft}
              onChangeText={setDraft}
              onSubmit={handleSend}
              onOpenTools={() => {
                toolsSheetRef.current?.snapToIndex(0);
              }}
              placeholder={chat.composer.placeholder}
              isSending={isSending}
            />
          </View>
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
      </KeyboardAvoidingView>

      {chat ? (
        <FriendChatToolsSheet
          sheetRef={toolsSheetRef}
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
  messageSkeleton: {
    height: 54,
    borderRadius: 22,
    maxWidth: '78%',
  },
  messageSkeletonLeft: {
    alignSelf: 'flex-start',
    width: '68%',
  },
  messageSkeletonRight: {
    alignSelf: 'flex-end',
    width: '74%',
  },
  composerDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingTop: 10,
    paddingHorizontal: designSystem.spacing.lg,
    backgroundColor: 'transparent',
  },
});
