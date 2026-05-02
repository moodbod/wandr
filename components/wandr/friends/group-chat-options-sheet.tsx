import BottomSheet from '@gorhom/bottom-sheet';
import { SignOut, Trash, UsersThree } from 'phosphor-react-native';
import { type RefObject } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatOptionsSheet } from '@/components/wandr/friends/chat-options-sheet';
import {
  OptionsSheetAction,
  optionsSheetStyles as styles,
} from '@/components/wandr/friends/chat-options-sheet-primitives';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import type { FriendChatPayload } from '@/types/friends';

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
  const activeMemberLabel = `${chat.circle.memberCount} active ${
    chat.circle.memberCount === 1 ? 'member' : 'members'
  } in ${chat.circle.destinationLabel}`;

  return (
    <ChatOptionsSheet
      avatar={
        chat.circle.avatarUris.length > 0 ? (
          <TravelerAvatarStack avatars={chat.circle.avatarUris} totalCount={chat.circle.memberCount} />
        ) : (
          <UsersThree color={designSystem.colors.darkGreen} size={22} weight="bold" />
        )
      }
      editPlaceholder="Group name"
      isBusy={isBusy}
      meta={activeMemberLabel}
      onChange={onChange}
      onRename={onRenameGroup}
      sheetRef={sheetRef}
      snapPoints={['66%', '92%']}
      title={chat.circle.name}>
      <View style={styles.sheetSection}>
        <View style={styles.sectionHeadingRow}>
          <ThemedText style={styles.panelTitle}>Members</ThemedText>
          <ThemedText style={styles.memberCountPill}>{chat.circle.invitedCount} invited</ThemedText>
        </View>
        <View style={styles.sheetMembers}>
          {chat.members.slice(0, 8).map((member) => (
            <View key={member.travelerSlug} style={styles.memberRow}>
              <View style={styles.memberAvatarWrap}>
                {member.avatarUri ? (
                  <TravelerAvatarStack avatars={[member.avatarUri]} totalCount={1} size="compact" />
                ) : (
                  <View style={styles.emptyAvatar} />
                )}
              </View>
              <View style={styles.memberCopy}>
                <ThemedText style={styles.memberName}>{member.name}</ThemedText>
                <ThemedText style={styles.memberMeta}>
                  {member.role === 'host' ? 'Host' : member.status === 'invited' ? 'Invited' : 'Member'}
                </ThemedText>
              </View>
            </View>
          ))}
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
  );
}
