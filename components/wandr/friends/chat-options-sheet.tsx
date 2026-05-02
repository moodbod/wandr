import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { PencilSimple } from 'phosphor-react-native';
import { type ReactNode, type RefObject, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { optionsSheetStyles as styles } from '@/components/wandr/friends/chat-options-sheet-primitives';
import { designSystem } from '@/constants/design-system';

type ChatOptionsSheetProps = {
  avatar: ReactNode;
  children: ReactNode;
  editPlaceholder: string;
  isBusy: boolean;
  meta: string;
  onChange?: (index: number) => void;
  onRename: (value: string) => void;
  sheetRef: RefObject<BottomSheet | null>;
  snapPoints: string[];
  title: string;
};

export function ChatOptionsSheet({
  avatar,
  children,
  editPlaceholder,
  isBusy,
  meta,
  onChange,
  onRename,
  sheetRef,
  snapPoints,
  title,
}: ChatOptionsSheetProps) {
  const insets = useSafeAreaInsets();
  const [renameDraft, setRenameDraft] = useState(title);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    setRenameDraft(title);
  }, [title]);

  const submitRename = () => {
    const nextName = renameDraft.trim();
    if (!nextName || nextName === title || isBusy) {
      return;
    }

    onRename(nextName);
    setIsEditingName(false);
  };

  return (
    <GlassBottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={onChange}>
      <BottomSheetScrollView
        contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.sheetGrabber} />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetAvatar}>{avatar}</View>
          <View style={styles.sheetHeaderCopy}>
            {isEditingName ? (
              <BottomSheetTextInput
                autoCapitalize="words"
                autoFocus
                editable={!isBusy}
                onBlur={() => {
                  if (renameDraft.trim() === title) {
                    setIsEditingName(false);
                  }
                }}
                onChangeText={setRenameDraft}
                onSubmitEditing={submitRename}
                placeholder={editPlaceholder}
                returnKeyType="done"
                style={styles.inlineNameInput}
                value={renameDraft}
              />
            ) : (
              <ThemedText style={styles.sheetTitle}>{title}</ThemedText>
            )}
            <ThemedText style={styles.sheetMeta}>{meta}</ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (isEditingName) {
                submitRename();
                return;
              }
              setRenameDraft(title);
              setIsEditingName(true);
            }}
            style={({ pressed }) => [styles.headerEditButton, pressed ? styles.pressed : null]}>
            <PencilSimple color={designSystem.colors.darkGreen} size={18} weight="bold" />
          </Pressable>
        </View>

        {children}
      </BottomSheetScrollView>
    </GlassBottomSheet>
  );
}
