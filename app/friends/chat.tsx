import { useMutation, useQuery } from 'convex/react';
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
import { FriendChatMessageBubble } from '@/components/wandr/friends/friend-chat-message';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { getFriendChatRef, sendFriendMessageRef, shareTripRouteInFriendChatRef } from '@/lib/convex';

const quickMessageByKey: Record<string, string> = {
  sunrise: 'We should lock the sunrise departure now so everyone packs for the same timing.',
  checkin: 'Quick check-in: what does everyone need before we lock the next leg?',
};

export default function FriendsChatScreen() {
  const insets = useSafeAreaInsets();
  const traveler = useCurrentTraveler();
  const { isBootstrapping, bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const chat = useQuery(getFriendChatRef, { travelerSlug: traveler?.slug ?? '' });
  const sendMessage = useMutation(sendFriendMessageRef);
  const shareRoute = useMutation(shareTripRouteInFriendChatRef);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!chat?.messages?.length) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [chat?.messages.length]);

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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                kind: 'settings',
                accessibilityLabel: 'Friends settings',
              },
            ],
          }}
        />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 88,
              paddingBottom: insets.bottom + 180,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.chatHero}>
            <View style={styles.heroCopy}>
              <ThemedText style={styles.chatTitle}>{chat?.circle?.name ?? 'Friends chat'}</ThemedText>
              <ThemedText style={styles.chatSubtitle}>
                {chat?.circle?.memberCount ?? 0} active members in {chat?.circle?.destinationLabel ?? 'your trip'}
              </ThemedText>
            </View>
            <TravelerAvatarStack
              avatars={chat?.circle?.avatarUris ?? []}
              totalCount={chat?.circle?.memberCount ?? 0}
            />
          </View>

          {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}

          <View style={styles.messageStack}>
            {chat?.messages.map((message) => (
              <FriendChatMessageBubble key={message._id} message={message} />
            ))}
          </View>
        </ScrollView>

        {chat ? (
          <View style={[styles.composerDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <FriendChatComposer
              value={draft}
              onChangeText={setDraft}
              onSubmit={handleSend}
              onShareRoute={handleShareRoute}
              placeholder={chat.composer.placeholder}
              quickActions={chat.composer.quickActions}
              onQuickAction={handleQuickAction}
              isSending={isSending}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
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
  chatHero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  chatTitle: {
    fontSize: 34,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -1.2,
    color: designSystem.colors.ink,
    textTransform: 'uppercase',
  },
  chatSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: '#a14b1a',
  },
  messageStack: {
    gap: 16,
  },
  composerDock: {
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: 12,
    backgroundColor: 'rgba(249,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,15,12,0.06)',
  },
});
