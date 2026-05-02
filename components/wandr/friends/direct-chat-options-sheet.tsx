import BottomSheet from '@gorhom/bottom-sheet';
import { ChatCircleText, Trash } from 'phosphor-react-native';
import { type RefObject } from 'react';
import { View } from 'react-native';

import { ChatOptionsSheet } from '@/components/wandr/friends/chat-options-sheet';
import {
  OptionsSheetAction,
  optionsSheetStyles as styles,
} from '@/components/wandr/friends/chat-options-sheet-primitives';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import type { DirectChatPayload } from '@/types/friends';

type DirectChatOptionsSheetProps = {
  chat: NonNullable<DirectChatPayload>;
  isBusy: boolean;
  onChange?: (index: number) => void;
  onDeleteChat: () => void;
  onRenameChat: (title: string) => void;
  sheetRef: RefObject<BottomSheet | null>;
};

export function DirectChatOptionsSheet({
  chat,
  isBusy,
  onChange,
  onDeleteChat,
  onRenameChat,
  sheetRef,
}: DirectChatOptionsSheetProps) {
  return (
    <ChatOptionsSheet
      avatar={
        chat.participant.avatarUri ? (
          <TravelerAvatarStack avatars={[chat.participant.avatarUri]} totalCount={1} />
        ) : (
          <ChatCircleText color={designSystem.colors.darkGreen} size={22} weight="bold" />
        )
      }
      editPlaceholder="Chat name"
      isBusy={isBusy}
      meta={`${chat.participant.name} - ${chat.participant.baseLabel}`}
      onChange={onChange}
      onRename={onRenameChat}
      sheetRef={sheetRef}
      snapPoints={['56%', '84%']}
      title={chat.title}>
      <View style={styles.actionList}>
        <OptionsSheetAction
          icon={<Trash color={designSystem.colors.copper} size={20} weight="bold" />}
          title="Delete chat"
          description="Remove this conversation and its message history."
          tone="danger"
          onPress={onDeleteChat}
        />
      </View>
    </ChatOptionsSheet>
  );
}
