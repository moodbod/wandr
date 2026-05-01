import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MessageActionMenu, type MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { FriendChatComposer } from '@/components/wandr/friends/friend-chat-composer';
import { FriendChatMessageBubble } from '@/components/wandr/friends/friend-chat-message';
import { FriendChatToolsSheet } from '@/components/wandr/friends/friend-chat-tools-sheet';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import {
  deleteFriendMessageRef,
  getFriendChatRef,
  markFriendChatReadRef,
  sendFriendMessageRef,
  shareTripRouteInFriendChatRef,
} from '@/lib/convex';
import type { FriendChatMessage } from '@/types/friends';

const quickMessageByKey: Record<string, string> = {
  sunrise: 'We should lock the sunrise departure now so everyone packs for the same timing.',
  checkin: 'Quick check-in: what does everyone need before we lock the next leg?',
};

export default function FriendsChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ circleId?: string | string[] }>();
  const circleId = Array.isArray(params.circleId) ? params.circleId[0] : params.circleId;
  const traveler = useCurrentTraveler();
  const { isBootstrapping, bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const chat = useQuery(getFriendChatRef, {
    travelerSlug: traveler?.slug ?? '',
    circleId: circleId as never,
  });
  const deleteMessage = useMutation(deleteFriendMessageRef);
  const markRead = useMutation(markFriendChatReadRef);
  const sendMessage = useMutation(sendFriendMessageRef);
  const shareRoute = useMutation(shareTripRouteInFriendChatRef);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<FriendChatMessage | null>(null);
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
    if (!traveler?.slug || !chat?.circle?._id) {
      return;
    }

    void markRead({
      circleId: chat.circle._id,
      travelerSlug: traveler.slug,
    });
  }, [chat?.circle?._id, chat?.messages.length, markRead, traveler?.slug]);

  const handleSend = async () => {
    if (!traveler?.slug || !chat?.circle?._id || !draft.trim() || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await sendMessage({
        circleId: chat.circle._id,
        travelerSlug: traveler.slug,
        body: draft,
      });
      setDraft('');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickAction = async (key: string) => {
    if (!traveler?.slug || !chat?.circle?._id || isSending) {
      return;
    }

    if (key === 'route') {
      await handleShareRoute();
      return;
    }

    const body = quickMessageByKey[key];
    if (!body) {
      return;
    }

    setIsSending(true);
    try {
      await sendMessage({
        circleId: chat.circle._id,
        travelerSlug: traveler.slug,
        body,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleShareRoute = async () => {
    if (!traveler?.slug || !chat?.circle?._id || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await shareRoute({
        circleId: chat.circle._id,
        travelerSlug: traveler.slug,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (message: FriendChatMessage) => {
    if (!traveler?.slug || !message.isOwnMessage) {
      return;
    }

    await deleteMessage({
      messageId: message._id,
      travelerSlug: traveler.slug,
    });
  };

  const handleMessageLongPress = (message: FriendChatMessage, anchor: MessageActionAnchor) => {
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
            trailingActions: [
              {
                kind: 'call',
                accessibilityLabel: 'Call the group',
                onPress: () => {},
              },
              {
                kind: 'menu',
                accessibilityLabel: 'Group options',
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
              paddingTop: insets.top + 76,
              paddingBottom: insets.bottom + 184,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}

          <View style={styles.messageStack}>
            {chat?.messages.map((message) => (
              <FriendChatMessageBubble
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

        {chat ? (
          <GlassBottomSheet ref={menuSheetRef} index={-1} snapPoints={['38%']} enablePanDownToClose>
            <BottomSheetView style={styles.sheetContent}>
              <ThemedText style={styles.sheetTitle}>{chat.circle.name}</ThemedText>
              <ThemedText style={styles.sheetMeta}>
                {chat.circle.memberCount} active members in {chat.circle.destinationLabel}
              </ThemedText>

              <View style={styles.sheetMembers}>
                {chat.members.slice(0, 6).map((member) => (
                  <View key={member.travelerSlug} style={styles.memberRow}>
                    <View style={styles.memberAvatarWrap}>
                      {member.avatarUri ? (
                        <TravelerAvatarStack avatars={[member.avatarUri]} totalCount={1} size="compact" />
                      ) : null}
                    </View>
                    <View style={styles.memberCopy}>
                      <ThemedText style={styles.memberName}>{member.name}</ThemedText>
                      <ThemedText style={styles.memberMeta}>
                        {member.role === 'host' ? 'Host' : 'Member'}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => {
                  menuSheetRef.current?.close();
                  handleShareRoute();
                }}
                style={styles.sheetAction}>
                <ThemedText style={styles.sheetActionText}>Share trip map</ThemedText>
              </Pressable>
            </BottomSheetView>
          </GlassBottomSheet>
        ) : null}
      </KeyboardAvoidingView>

      {chat ? (
        <FriendChatToolsSheet
          sheetRef={toolsSheetRef}
          onChange={(index) => setIsToolsSheetOpen(index >= 0)}
          onShareRoute={handleShareRoute}
          quickActions={chat.composer.quickActions}
          onQuickAction={handleQuickAction}
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
  sheetContent: {
    padding: 24,
    gap: 16,
  },
  sheetTitle: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sheetMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  sheetMembers: {
    gap: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarWrap: {
    width: 36,
  },
  memberCopy: {
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  memberMeta: {
    fontSize: 13,
    lineHeight: 16,
    color: designSystem.colors.gray,
  },
  sheetAction: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  sheetActionText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
});
