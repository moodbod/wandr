import { ActionSheetIOS, Alert, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useEffect, useRef } from 'react';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type MessageActionAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function MessageActionMenu({
  visible,
  anchor,
  canDelete = true,
  onClose,
  onDelete,
  onReply,
}: {
  visible: boolean;
  anchor: MessageActionAnchor | null;
  canDelete?: boolean;
  onClose: () => void;
  onDelete: () => void;
  onReply: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';
  const hasPresentedNativeMenuRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      hasPresentedNativeMenuRef.current = false;
      return;
    }

    if (Platform.OS === 'web' || hasPresentedNativeMenuRef.current) {
      return;
    }
    hasPresentedNativeMenuRef.current = true;

    if (Platform.OS === 'ios') {
      const options = canDelete ? ['Reply', 'Delete message', 'Cancel'] : ['Reply', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: canDelete ? 1 : undefined,
          options,
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            onReply();
            onClose();
            return;
          }
          if (canDelete && buttonIndex === 1) {
            onDelete();
          }
          onClose();
        }
      );
      return;
    }

    Alert.alert(
      'Message',
      undefined,
      [
        {
          text: 'Reply',
          onPress: () => {
            onReply();
            onClose();
          },
        },
        ...(canDelete
          ? [
              {
                text: 'Delete message',
                style: 'destructive' as const,
                onPress: () => {
                  onDelete();
                  onClose();
                },
              },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' },
      ],
      { onDismiss: onClose }
    );
  }, [canDelete, isDark, onClose, onDelete, onReply, visible]);

  if (!visible) {
    return null;
  }

  if (Platform.OS !== 'web') {
    return null;
  }

  const menuWidth = 222;
  const menuHeight = canDelete ? 116 : 58;
  const fallbackAnchor = { x: width / 2 - menuWidth / 2, y: height / 2 - menuHeight / 2, width: menuWidth, height: menuHeight };
  const resolvedAnchor = anchor ?? fallbackAnchor;
  const anchorCenterX = resolvedAnchor.x + resolvedAnchor.width / 2;
  const left = Math.min(Math.max(16, anchorCenterX - menuWidth / 2), width - menuWidth - 16);
  const preferAbove = resolvedAnchor.y > height * 0.58;
  const top = preferAbove
    ? Math.max(16, resolvedAnchor.y - menuHeight - 10)
    : Math.min(height - menuHeight - 16, resolvedAnchor.y + resolvedAnchor.height + 10);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, isDark ? styles.backdropDark : null]} onPress={onClose}>
        <View style={[styles.menu, isDark ? styles.menuDark : styles.menuLight, { left, top, width: menuWidth }]}>
          <Pressable
            onPress={() => {
              onClose();
              onReply();
            }}
            style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}>
            <ThemedText style={[styles.actionText, styles.replyText, isDark ? styles.replyTextDark : null]}>Reply</ThemedText>
          </Pressable>
          {canDelete ? (
            <>
              <View style={[styles.separator, isDark ? styles.separatorDark : null]} />
              <Pressable
                onPress={() => {
                  onClose();
                  onDelete();
                }}
                style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}>
                <ThemedText style={[styles.actionText, isDark ? styles.actionTextDark : null]}>Delete message</ThemedText>
              </Pressable>
            </>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  backdropDark: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  menu: {
    position: 'absolute',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    boxShadow: '0 10px 18px rgba(0,0,0,0.12)',
    elevation: 12,
  },
  menuLight: {
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.surfaceRaised : designSystem.colors.whiteGlassMax,
    borderColor: Platform.OS === 'android' ? designSystem.colors.lightSurfaceAlt : designSystem.colors.borderSoft,
  },
  menuDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkSurfaceBorder,
  },
  action: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionText: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '500',
    color: designSystem.colors.copper,
  },
  replyText: {
    color: designSystem.colors.ink,
  },
  replyTextDark: {
    color: designSystem.colors.white,
  },
  actionTextDark: {
    color: '#ff9b73',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
    backgroundColor: designSystem.colors.borderSoft,
  },
  separatorDark: {
    backgroundColor: designSystem.colors.darkSurfaceBorder,
  },
});
