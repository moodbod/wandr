import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import {
  CaretUpDown,
  Minus,
  Plus,
} from 'phosphor-react-native';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CallHistorySheet } from '@/components/wandr/friends/call-history-sheet';
import { CallOptionsMenu } from '@/components/wandr/friends/call-options-menu';
import { GroupChatOptionsSheet } from '@/components/wandr/friends/group-chat-options-sheet';
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

const quickMessageByKey: Record<string, string> = {
  sunrise: 'We should lock the sunrise departure now so everyone packs for the same timing.',
  checkin: 'Quick check-in: what does everyone need before we lock the next leg?',
};

function getReplyPreview(message: FriendChatMessage) {
  if (message.routeCard) {
    return message.routeCard.title;
  }
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
  return message.body ?? 'Message';
}

function formatScheduleDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function formatScheduleClock(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function addMinutes(timestamp: number, minutes: number) {
  return timestamp + minutes * 60_000;
}

function clampScheduledTimestamp(timestamp: number) {
  const now = Date.now();
  return Math.min(Math.max(timestamp, now + 60_000), now + 365 * 24 * 60 * 60_000);
}

const reminderOptions = [0, 5, 15, 30, 60, 1440];

function formatReminder(minutes: number) {
  if (minutes === 0) {
    return 'At time of event';
  }
  if (minutes === 1440) {
    return '1 day before';
  }
  if (minutes >= 60) {
    return `${minutes / 60} hour${minutes === 60 ? '' : 's'} before`;
  }
  return `${minutes} minutes before`;
}

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
          openCall(call._id as Id<'friendCalls'>);
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

function ScheduleDateRow({
  disabled = false,
  label,
  onMinus,
  onPlus,
  timestamp,
}: {
  disabled?: boolean;
  label: string;
  onMinus: () => void;
  onPlus: () => void;
  timestamp: number;
}) {
  return (
    <View style={[styles.scheduleDateRow, disabled ? styles.scheduleDateRowDisabled : null]}>
      <ThemedText style={styles.scheduleCardLabel}>{label}</ThemedText>
      <View style={styles.scheduleDateControls}>
        <View style={styles.scheduleDatePills}>
          <ThemedText style={styles.scheduleDatePill}>{formatScheduleDate(timestamp)}</ThemedText>
          <ThemedText style={styles.scheduleDatePill}>{formatScheduleClock(timestamp)}</ThemedText>
        </View>
        <View style={styles.scheduleAdjustRow}>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={onMinus} style={styles.smallIconButton}>
            <Minus color={designSystem.colors.darkGreen} size={16} weight="bold" />
          </Pressable>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={onPlus} style={styles.smallIconButton}>
            <Plus color={designSystem.colors.darkGreen} size={16} weight="bold" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.copper,
  },
  sheetContent: {
    paddingTop: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    gap: 18,
  },
  scheduleSheetContent: {
    paddingTop: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    gap: 26,
  },
  scheduleHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scheduleHeaderAction: {
    minWidth: 78,
    minHeight: 44,
    justifyContent: 'center',
  },
  scheduleHeaderActionText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '500',
    color: designSystem.colors.ink,
  },
  scheduleHeaderActionDisabled: {
    opacity: 0.45,
  },
  scheduleHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  scheduleTextCard: {
    minHeight: 210,
    borderRadius: 22,
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.surfaceRaised : designSystem.colors.whiteGlassStrong,
    borderWidth: 1,
    borderColor: Platform.OS === 'android' ? designSystem.colors.lightSurfaceAlt : designSystem.colors.borderSoft,
    overflow: 'hidden',
  },
  scheduleTitleInput: {
    minHeight: 70,
    paddingHorizontal: 18,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '500',
    color: designSystem.colors.ink,
  },
  scheduleDescriptionInput: {
    minHeight: 118,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    textAlignVertical: 'top',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '500',
    color: designSystem.colors.ink,
  },
  descriptionLimitText: {
    position: 'absolute',
    right: 18,
    bottom: 14,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  scheduleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: designSystem.colors.borderSoft,
    marginLeft: 18,
  },
  scheduleDateCard: {
    borderRadius: 22,
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.surfaceRaised : designSystem.colors.whiteGlassStrong,
    borderWidth: 1,
    borderColor: Platform.OS === 'android' ? designSystem.colors.lightSurfaceAlt : designSystem.colors.borderSoft,
    overflow: 'hidden',
  },
  scheduleDateRow: {
    minHeight: 74,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  scheduleDateRowDisabled: {
    opacity: 0.45,
  },
  scheduleCardLabel: {
    minWidth: 92,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '500',
    color: designSystem.colors.ink,
  },
  scheduleDateControls: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  scheduleDatePills: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  scheduleDatePill: {
    maxWidth: 132,
    overflow: 'hidden',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.ink,
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.surface : designSystem.colors.whiteOverlayFaint,
  },
  includeEndRow: {
    minHeight: 70,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  scheduleHelpText: {
    marginTop: -18,
    paddingHorizontal: 18,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    color: designSystem.colors.gray,
  },
  scheduleOptionRow: {
    minHeight: 74,
    borderRadius: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.surfaceRaised : designSystem.colors.whiteGlassStrong,
    borderWidth: 1,
    borderColor: Platform.OS === 'android' ? designSystem.colors.lightSurfaceAlt : designSystem.colors.borderSoft,
  },
  scheduleOptionLabel: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '500',
    color: designSystem.colors.ink,
  },
  scheduleOptionValueWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  scheduleOptionValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  scheduleAdjustRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.limeSoft,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
});
