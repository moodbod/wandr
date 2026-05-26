import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { CaretUpDown } from 'phosphor-react-native';
import {
  Alert,
  Pressable,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CallHistorySheet } from '@/components/wandr/friends/call-history-sheet';
import { CallOptionsMenu } from '@/components/wandr/friends/call-options-menu';
import {
  addMinutes,
  clampScheduledTimestamp,
  formatReminder,
  getReplyPreview,
  quickMessageByKey,
  reminderOptions,
} from '@/components/wandr/friends/group-chat-model';
import { GroupChatOptionsSheet } from '@/components/wandr/friends/group-chat-options-sheet';
import { ScheduleDateRow } from '@/components/wandr/friends/group-chat-schedule-date-row';
import { styles } from '@/components/wandr/friends/group-chat-screen.styles';
import { MessageActionMenu, type MessageActionAnchor } from '@/components/wandr/friends/message-action-menu';
import { FriendChatMessageBubble, type ChatCallCard } from '@/components/wandr/friends/friend-chat-message';
import { FriendChatToolsSheet } from '@/components/wandr/friends/friend-chat-tools-sheet';
import { WandrGiftedChat } from '@/components/wandr/friends/wandr-gifted-chat';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
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
  scheduleFriendCallRef,
  sendFriendMessageRef,
  shareTripRouteInFriendChatRef,
  startFriendCallRef,
} from '@/lib/convex';
import type { FriendChatMessage } from '@/types/friends';

type FriendsChatScreenProps = {
  circleId?: string;
  onClose?: () => void;
};

export default function FriendsChatScreen({ circleId: circleIdProp, onClose }: FriendsChatScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ circleId?: string | string[] }>();
  const routeCircleId = Array.isArray(params.circleId) ? params.circleId[0] : params.circleId;
  const circleId = circleIdProp ?? routeCircleId;
  const { isLargeScreen } = useResponsive();
  const { openCall } = useActiveFriendCall();
  const traveler = useCurrentTraveler();
  const { bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const chat = useQuery(
    getFriendChatRef,
    traveler?.slug && circleId
      ? {
          travelerSlug: traveler.slug,
          circleId: circleId as never,
        }
      : 'skip'
  );
  const deleteCircle = useMutation(deleteFriendCircleRef);
  const deleteMessage = useMutation(deleteFriendMessageRef);
  const leaveCircle = useMutation(leaveFriendCircleRef);
  const markRead = useMutation(markFriendChatReadRef);
  const renameCircle = useMutation(renameFriendCircleRef);
  const scheduleCall = useMutation(scheduleFriendCallRef);
  const sendMessage = useMutation(sendFriendMessageRef);
  const shareRoute = useMutation(shareTripRouteInFriendChatRef);
  const startCall = useMutation(startFriendCallRef);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSheetBusy, setIsSheetBusy] = useState(false);
  const [isCallBusy, setIsCallBusy] = useState(false);
  const [scheduledCallMode, setScheduledCallMode] = useState<'voice' | 'video'>('video');
  const [scheduledCallAt, setScheduledCallAt] = useState(() => Date.now() + 30 * 60_000);
  const [scheduledCallEndsAt, setScheduledCallEndsAt] = useState(() => Date.now() + 60 * 60_000);
  const [includeScheduledEnd, setIncludeScheduledEnd] = useState(true);
  const [scheduledCallDescription, setScheduledCallDescription] = useState('');
  const [scheduledReminderMinutes, setScheduledReminderMinutes] = useState(15);
  const [scheduledCallTitle, setScheduledCallTitle] = useState('');
  const [selectedCallCard, setSelectedCallCard] = useState<ChatCallCard | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<FriendChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<FriendChatMessage | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<MessageActionAnchor | null>(null);
  const menuSheetRef = useRef<BottomSheet>(null);
  const callHistorySheetRef = useRef<BottomSheet>(null);
  const scheduleSheetRef = useRef<BottomSheet>(null);
  const toolsSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (!isLargeScreen || circleIdProp || !routeCircleId) {
      return;
    }

    router.replace({
      pathname: '/friends/chat',
      params: { groupCircleId: routeCircleId },
    });
  }, [circleIdProp, isLargeScreen, routeCircleId, router]);

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
        replyToMessageId: replyingToMessage?._id,
      });
      setDraft('');
      setReplyingToMessage(null);
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
        replyToMessageId: replyingToMessage?._id,
      });
      setReplyingToMessage(null);
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

  const handleSendMedia = async (body: string) => {
    if (!traveler?.slug || !chat?.circle?._id || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await sendMessage({
        circleId: chat.circle._id,
        travelerSlug: traveler.slug,
        body,
        replyToMessageId: replyingToMessage?._id,
      });
      setReplyingToMessage(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartCall = async (mode: 'voice' | 'video') => {
    if (!traveler?.slug || !chat?.circle?._id || isCallBusy) {
      return;
    }

    setIsCallBusy(true);
    try {
      const call = await startCall({
        circleId: chat.circle._id,
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

  const handleScheduleCall = async () => {
    if (!traveler?.slug || !chat?.circle?._id || isCallBusy) {
      return;
    }

    setIsCallBusy(true);
    try {
      const call = await scheduleCall({
        circleId: chat.circle._id,
        travelerSlug: traveler.slug,
        mode: scheduledCallMode,
        scheduledFor: scheduledCallAt,
        endsAt: includeScheduledEnd ? scheduledCallEndsAt : undefined,
        reminderMinutesBefore: scheduledReminderMinutes,
        title: scheduledCallTitle.trim() || undefined,
        description: scheduledCallDescription.trim() || undefined,
      });
      if (call?._id) {
        scheduleSheetRef.current?.close();
        setScheduledCallAt(Date.now() + 30 * 60_000);
        setScheduledCallEndsAt(Date.now() + 60 * 60_000);
        setScheduledCallTitle('');
        setScheduledCallDescription('');
        setScheduledReminderMinutes(15);
        setIncludeScheduledEnd(true);
      }
    } catch (error) {
      Alert.alert(
        'Call unavailable',
        error instanceof Error ? error.message : 'Unable to schedule this call right now.'
      );
    } finally {
      setIsCallBusy(false);
    }
  };

  const handleOpenScheduleSheet = () => {
    const start = Date.now() + 30 * 60_000;
    setScheduledCallAt(start);
    setScheduledCallEndsAt(addMinutes(start, 30));
    setScheduledCallTitle(traveler?.name ? `${traveler.name}'s call` : `${chat?.circle.name ?? 'Wandr'} call`);
    scheduleSheetRef.current?.snapToIndex(0);
  };

  const shiftScheduleStart = (minutes: number) => {
    setScheduledCallAt((value) => {
      const nextStart = clampScheduledTimestamp(addMinutes(value, minutes));
      setScheduledCallEndsAt((endValue) => Math.max(addMinutes(nextStart, 15), addMinutes(endValue, minutes)));
      return nextStart;
    });
  };

  const shiftScheduleEnd = (minutes: number) => {
    setScheduledCallEndsAt((value) =>
      Math.max(addMinutes(scheduledCallAt, 15), clampScheduledTimestamp(addMinutes(value, minutes)))
    );
  };

  const cycleReminder = () => {
    setScheduledReminderMinutes((value) => {
      const currentIndex = reminderOptions.indexOf(value);
      return reminderOptions[(currentIndex + 1) % reminderOptions.length] ?? 15;
    });
  };

  const handleRenameCircle = async (nextName: string) => {
    if (!traveler?.slug || !chat?.circle?._id || isSheetBusy) {
      return;
    }

    const trimmedName = nextName.trim();
    if (!trimmedName || trimmedName === chat.circle.name) {
      return;
    }

    setIsSheetBusy(true);
    try {
      await renameCircle({
        circleId: chat.circle._id,
        travelerSlug: traveler.slug,
        name: trimmedName,
      });
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleLeaveCircle = () => {
    if (!traveler?.slug || !chat?.circle?._id || isSheetBusy) {
      return;
    }

    Alert.alert('Leave group?', `You will leave ${chat.circle.name} and remove its shared trip from your list.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setIsSheetBusy(true);
          try {
            await leaveCircle({
              circleId: chat.circle._id,
              travelerSlug: traveler.slug,
            });
            menuSheetRef.current?.close();
            if (onClose) {
              onClose();
              return;
            }
            router.replace('/friends/chat');
          } finally {
            setIsSheetBusy(false);
          }
        },
      },
    ]);
  };

  const handleDeleteCircle = () => {
    if (!traveler?.slug || !chat?.circle?._id || isSheetBusy) {
      return;
    }

    Alert.alert('Delete group?', `This deletes ${chat.circle.name}, its chat, and linked group trips for everyone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsSheetBusy(true);
          try {
            const deleted = await deleteCircle({
              circleId: chat.circle._id,
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
    setSelectedMessage(message);
    setMessageMenuAnchor(anchor);
  };

  const handleTextMessageLongPress = (message: FriendChatMessage, anchor: MessageActionAnchor) => {
    setSelectedMessage(message);
    setMessageMenuAnchor(anchor);
  };

  const handleOpenCallCard = (callCard: ChatCallCard) => {
    setSelectedCallCard(callCard);
    callHistorySheetRef.current?.snapToIndex(0);
  };

  if (isLargeScreen && !circleIdProp) {
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
              accessibilityLabel: 'Call the group',
              render: ({ iconColor }) => (
                <CallOptionsMenu
                  disabled={isCallBusy || !traveler?.slug || !chat?.circle?._id}
                  iconColor={iconColor}
                  onScheduleCall={handleOpenScheduleSheet}
                  onStartVideoCall={() => handleStartCall('video')}
                  onStartVoiceCall={() => handleStartCall('voice')}
                />
              ),
            },
            {
              kind: 'menu',
              accessibilityLabel: 'Group options',
              onPress: () => menuSheetRef.current?.snapToIndex(0),
            },
          ],
        }}
      />

      <WandrGiftedChat<FriendChatMessage>
        bottomOffset={insets.bottom}
        header={bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}
        isSending={isSending}
        isWidgetMessage={(message) =>
          message.kind === 'system' ||
          Boolean(
            message.routeCard ||
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
          <FriendChatMessageBubble
            message={message}
            onOpenCallCard={handleOpenCallCard}
            onLongPressMessage={handleMessageLongPress}
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
        <GlassBottomSheet
          ref={scheduleSheetRef}
          index={-1}
          snapPoints={['92%']}
          enablePanDownToClose>
            <BottomSheetScrollView
              contentContainerStyle={[styles.scheduleSheetContent, { paddingBottom: Math.max(insets.bottom, 16) + 28 }]}
              showsVerticalScrollIndicator={false}>
              <View style={styles.scheduleHeader}>
                <Pressable accessibilityRole="button" onPress={() => scheduleSheetRef.current?.close()} style={styles.scheduleHeaderAction}>
                  <ThemedText style={styles.scheduleHeaderActionText}>Cancel</ThemedText>
                </Pressable>
                <ThemedText style={styles.scheduleHeaderTitle}>Schedule call</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  disabled={isCallBusy}
                  onPress={handleScheduleCall}
                  style={styles.scheduleHeaderAction}>
                  <ThemedText style={[styles.scheduleHeaderActionText, isCallBusy ? styles.scheduleHeaderActionDisabled : null]}>
                    Send
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.scheduleTextCard}>
                <BottomSheetTextInput
                  editable={!isCallBusy}
                  onChangeText={setScheduledCallTitle}
                  placeholder={`${chat.circle.name} call`}
                  placeholderTextColor={designSystem.colors.placeholderText}
                  style={styles.scheduleTitleInput}
                  value={scheduledCallTitle}
                />
                <View style={styles.scheduleDivider} />
                <BottomSheetTextInput
                  editable={!isCallBusy}
                  multiline
                  maxLength={2048}
                  onChangeText={setScheduledCallDescription}
                  placeholder="Add description (optional)"
                  placeholderTextColor={designSystem.colors.placeholderText}
                  style={styles.scheduleDescriptionInput}
                  value={scheduledCallDescription}
                />
                <ThemedText style={styles.descriptionLimitText}>{2048 - scheduledCallDescription.length}</ThemedText>
              </View>

              <View style={styles.scheduleDateCard}>
                <ScheduleDateRow
                  label="Starts"
                  timestamp={scheduledCallAt}
                  onMinus={() => shiftScheduleStart(-15)}
                  onPlus={() => shiftScheduleStart(15)}
                />
                <View style={styles.scheduleDivider} />
                <ScheduleDateRow
                  label="Ends"
                  timestamp={scheduledCallEndsAt}
                  disabled={!includeScheduledEnd}
                  onMinus={() => shiftScheduleEnd(-15)}
                  onPlus={() => shiftScheduleEnd(15)}
                />
                <View style={styles.scheduleDivider} />
                <View style={styles.includeEndRow}>
                  <ThemedText style={styles.scheduleCardLabel}>Include end time</ThemedText>
                  <Switch
                    value={includeScheduledEnd}
                    onValueChange={setIncludeScheduledEnd}
                    trackColor={{ false: designSystem.colors.blackWash, true: designSystem.colors.lime }}
                    thumbColor={designSystem.colors.white}
                  />
                </View>
              </View>

              <ThemedText style={styles.scheduleHelpText}>Events with call links cannot be more than one year in the future.</ThemedText>

              <Pressable accessibilityRole="button" onPress={() => setScheduledCallMode((value) => (value === 'video' ? 'voice' : 'video'))} style={styles.scheduleOptionRow}>
                <ThemedText style={styles.scheduleOptionLabel}>Call type</ThemedText>
                <View style={styles.scheduleOptionValueWrap}>
                  <ThemedText style={styles.scheduleOptionValue}>{scheduledCallMode === 'video' ? 'Video' : 'Voice'}</ThemedText>
                  <CaretUpDown color={designSystem.colors.gray} size={22} weight="bold" />
                </View>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={cycleReminder} style={styles.scheduleOptionRow}>
                <ThemedText style={styles.scheduleOptionLabel}>Reminder</ThemedText>
                <View style={styles.scheduleOptionValueWrap}>
                  <ThemedText style={styles.scheduleOptionValue}>{formatReminder(scheduledReminderMinutes)}</ThemedText>
                  <CaretUpDown color={designSystem.colors.gray} size={22} weight="bold" />
                </View>
              </Pressable>

              <ThemedText style={styles.scheduleHelpText}>Guests also get notified at the time of the event.</ThemedText>
            </BottomSheetScrollView>
        </GlassBottomSheet>
      ) : null}

      {chat ? (
        <CallHistorySheet
          callCard={selectedCallCard}
          contextLabel={chat.circle.name}
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
        <GroupChatOptionsSheet
          chat={chat}
          isBusy={isSheetBusy}
          onDeleteGroup={handleDeleteCircle}
          onLeaveGroup={handleLeaveCircle}
          onRenameGroup={handleRenameCircle}
          sheetRef={menuSheetRef}
        />
      ) : null}

      {chat ? (
        <FriendChatToolsSheet
          sheetRef={toolsSheetRef}
          onShareRoute={handleShareRoute}
          quickActions={chat.composer.quickActions}
          onQuickAction={handleQuickAction}
          onGifAction={handleSendMedia}
          onStickerAction={handleSendMedia}
        />
      ) : null}
    </ThemedView>
  );
}
