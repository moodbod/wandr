import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CalendarBlank, Phone, VideoCamera } from 'phosphor-react-native';
import { type ReactNode, type RefObject } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import type { ChatCallCard } from '@/components/wandr/friends/friend-chat-message';

type CallHistorySheetProps = {
  callCard: ChatCallCard | null;
  contextLabel: string;
  isBusy?: boolean;
  onStartVideoCall: () => void;
  onStartVoiceCall: () => void;
  sheetRef: RefObject<BottomSheet | null>;
};

function getStatusLabel(status: ChatCallCard['status']) {
  if (status === 'cancelled') {
    return 'Cancelled call';
  }
  if (status === 'scheduled') {
    return 'Scheduled call';
  }
  if (status === 'active') {
    return 'Live call';
  }
  return 'Missed call';
}

export function CallHistorySheet({
  callCard,
  contextLabel,
  isBusy = false,
  onStartVideoCall,
  onStartVoiceCall,
  sheetRef,
}: CallHistorySheetProps) {
  const insets = useSafeAreaInsets();
  const Icon = callCard?.mode === 'video' ? VideoCamera : Phone;

  return (
    <GlassBottomSheet ref={sheetRef} index={-1} snapPoints={['48%', '72%']} enablePanDownToClose>
      <BottomSheetScrollView
        contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.sheetGrabber} />
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Icon color={designSystem.colors.darkGreen} size={24} weight="bold" />
          </View>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>{callCard ? getStatusLabel(callCard.status) : 'Call'}</ThemedText>
            <ThemedText style={styles.title}>{callCard?.title ?? 'Call details'}</ThemedText>
            <ThemedText style={styles.meta}>{contextLabel}</ThemedText>
          </View>
        </View>

        {callCard?.description ? (
          <ThemedText style={styles.description}>{callCard.description}</ThemedText>
        ) : null}

        <View style={styles.actions}>
          <CallAction
            disabled={isBusy}
            icon={<Phone color={designSystem.colors.darkGreen} size={20} weight="bold" />}
            title="Voice call back"
            onPress={onStartVoiceCall}
          />
          <CallAction
            disabled={isBusy}
            icon={<VideoCamera color={designSystem.colors.darkGreen} size={20} weight="bold" />}
            title="Video call back"
            onPress={onStartVideoCall}
          />
        </View>

        {callCard?.status === 'scheduled' ? (
          <View style={styles.scheduledNote}>
            <CalendarBlank color={designSystem.colors.gray} size={18} weight="bold" />
            <ThemedText style={styles.noteText}>This scheduled call can still be opened from the message card.</ThemedText>
          </View>
        ) : null}
      </BottomSheetScrollView>
    </GlassBottomSheet>
  );
}

function CallAction({
  disabled,
  icon,
  onPress,
  title,
}: {
  disabled: boolean;
  icon: ReactNode;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed ? styles.actionButtonPressed : null, disabled ? styles.actionButtonDisabled : null]}>
      {icon}
      <ThemedText style={styles.actionText}>{title}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    paddingTop: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    gap: 18,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: designSystem.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.limeSoft,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: designSystem.colors.copper,
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  meta: {
    fontSize: 14,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: designSystem.colors.warmDark,
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: designSystem.colors.limeSoft,
  },
  actionButtonPressed: {
    opacity: 0.76,
  },
  actionButtonDisabled: {
    opacity: 0.52,
  },
  actionText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  scheduledNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
});
