import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SignOut, Trash, UsersThree } from 'phosphor-react-native';
import { type RefObject, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { ChatOptionsSheet } from '@/components/wandr/friends/chat-options-sheet';
import {
  OptionsSheetAction,
  optionsSheetStyles as styles,
} from '@/components/wandr/friends/chat-options-sheet-primitives';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import type { FriendChatPayload, FriendCircleMember } from '@/types/friends';

const INLINE_MEMBER_LIMIT = 5;
const EXPANDED_MEMBER_LIMIT = 20;

type GroupChatOptionsSheetProps = {
  chat: NonNullable<FriendChatPayload>;
  isBusy: boolean;
  onChange?: (index: number) => void;
  onDeleteGroup: () => void;
  onLeaveGroup: () => void;
  onRenameGroup: (name: string) => void;
  sheetRef: RefObject<BottomSheet | null>;
};

export function GroupChatOptionsSheet({
  chat,
  isBusy,
  onChange,
  onDeleteGroup,
  onLeaveGroup,
  onRenameGroup,
  sheetRef,
}: GroupChatOptionsSheetProps) {
  const memberSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const inlineMembers = chat.members.slice(0, INLINE_MEMBER_LIMIT);
  const expandedMembers = chat.members.slice(0, EXPANDED_MEMBER_LIMIT);
  const hiddenMemberCount = Math.max(0, chat.members.length - inlineMembers.length);
  const overflowMemberCount = Math.max(0, chat.members.length - expandedMembers.length);
  const activeMemberLabel = `${chat.circle.memberCount} active ${
    chat.circle.memberCount === 1 ? 'member' : 'members'
  } in ${chat.circle.destinationLabel}`;

  return (
    <>
      <ChatOptionsSheet
        avatar={
          <TravelerAvatarStack
            avatars={chat.circle.avatarUris}
            fallbackName={chat.members[0]?.name ?? chat.circle.name}
            fallbackSeed={chat.members[0]?.travelerSlug ?? chat.circle.slug}
            size={Platform.OS === 'web' ? 'compact' : 'default'}
            totalCount={chat.circle.memberCount}
          />
        }
        editPlaceholder="Group name"
        isBusy={isBusy}
        meta={activeMemberLabel}
        onChange={onChange}
        onRename={onRenameGroup}
        sheetRef={sheetRef}
        snapPoints={Platform.OS === 'web' ? [420] : ['66%', '92%']}
        title={chat.circle.name}>
        <View style={styles.sheetSection}>
          <View style={styles.sectionHeadingRow}>
            <ThemedText style={styles.panelTitle}>Members</ThemedText>
            <ThemedText style={styles.memberCountPill}>{chat.circle.invitedCount} invited</ThemedText>
          </View>
          <View style={styles.sheetMembers}>
            {inlineMembers.map((member) => (
              <MemberRow key={member.travelerSlug} member={member} />
            ))}
            {hiddenMemberCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => memberSheetRef.current?.expand()}
                style={({ pressed }) => [localStyles.moreRow, pressed ? localStyles.moreRowPressed : null]}>
                <View style={localStyles.moreAvatar}>
                  <UsersThree color={designSystem.colors.darkGreen} size={22} weight="bold" />
                </View>
                <View style={styles.memberCopy}>
                  <ThemedText style={localStyles.moreTitle}>More members</ThemedText>
                  <ThemedText style={styles.memberMeta}>
                    View {hiddenMemberCount} more {hiddenMemberCount === 1 ? 'person' : 'people'}
                  </ThemedText>
                </View>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.actionList}>
          <OptionsSheetAction
            icon={<SignOut color={designSystem.colors.copper} size={20} weight="bold" />}
            title="Leave group"
            description="Remove yourself from this circle and its shared trip."
            tone="danger"
            onPress={onLeaveGroup}
          />
          <OptionsSheetAction
            icon={<Trash color={designSystem.colors.copper} size={20} weight="bold" />}
            title="Delete group"
            description="For hosts. Delete the circle, chat history, and group trips."
            tone="danger"
            onPress={onDeleteGroup}
          />
        </View>
      </ChatOptionsSheet>

      <GlassBottomSheet
        ref={memberSheetRef}
        index={-1}
        snapPoints={Platform.OS === 'web' ? [520] : ['72%', '92%']}
        enablePanDownToClose
        desktopPopupHostStyle={Platform.OS === 'web' ? { height: 520 } : undefined}>
        <BottomSheetScrollView
          contentContainerStyle={[
            localStyles.expandedSheetContent,
            { paddingBottom: Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 16) + 20 },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.sheetGrabber} />
          <View style={localStyles.expandedHeader}>
            <View>
              <ThemedText style={localStyles.expandedTitle}>Members</ThemedText>
              <ThemedText style={styles.sheetMeta}>
                {expandedMembers.length} shown{overflowMemberCount > 0 ? `, ${overflowMemberCount} not shown` : ''}
              </ThemedText>
            </View>
            <ThemedText style={styles.memberCountPill}>{chat.circle.invitedCount} invited</ThemedText>
          </View>
          <View style={styles.sheetMembers}>
            {expandedMembers.map((member) => (
              <MemberRow key={member.travelerSlug} member={member} expanded />
            ))}
          </View>
        </BottomSheetScrollView>
      </GlassBottomSheet>
    </>
  );
}

function MemberRow({ expanded = false, member }: { expanded?: boolean; member: FriendCircleMember }) {
  return (
    <View style={[styles.memberRow, expanded ? localStyles.expandedMemberRow : null]}>
      <MemberAvatar member={member} size={expanded ? 52 : 44} />
      <View style={styles.memberCopy}>
        <ThemedText style={[styles.memberName, expanded ? localStyles.expandedMemberName : null]}>{member.name}</ThemedText>
        <ThemedText style={styles.memberMeta}>
          {member.role === 'host' ? 'Host' : member.status === 'invited' ? 'Invited' : 'Member'}
        </ThemedText>
      </View>
    </View>
  );
}

function MemberAvatar({ member, size }: { member: FriendCircleMember; size: number }) {
  const radius = size / 2;

  return (
    <View
      style={[
        localStyles.memberAvatar,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
      ]}>
      <FaceHashAvatar
        name={member.name || member.travelerSlug || 'Traveler'}
        seed={member.travelerSlug}
        size={size}
        uri={member.avatarUri}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  memberAvatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surfaceMuted,
  },
  avatarInitial: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  moreRow: {
    minHeight: Platform.OS === 'web' ? 42 : 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 10 : 12,
    borderRadius: 18,
    paddingVertical: Platform.OS === 'web' ? 2 : 4,
  },
  moreRowPressed: {
    backgroundColor: designSystem.colors.lightSurfaceAlt,
  },
  moreAvatar: {
    width: Platform.OS === 'web' ? 34 : 44,
    height: Platform.OS === 'web' ? 34 : 44,
    borderRadius: Platform.OS === 'web' ? 17 : 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.limeSoft,
  },
  moreTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  expandedSheetContent: {
    paddingTop: Platform.OS === 'web' ? 12 : designSystem.spacing.lg,
    paddingHorizontal: Platform.OS === 'web' ? 14 : designSystem.spacing.lg,
    gap: Platform.OS === 'web' ? 10 : 18,
  },
  expandedHeader: {
    minHeight: Platform.OS === 'web' ? 34 : 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  expandedTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 28,
    lineHeight: Platform.OS === 'web' ? 24 : 32,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  expandedMemberRow: {
    minHeight: Platform.OS === 'web' ? 46 : 60,
  },
  expandedMemberName: {
    fontSize: Platform.OS === 'web' ? 15 : 16,
    lineHeight: Platform.OS === 'web' ? 18 : 20,
  },
});
