import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

export type MessageActionAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function MessageActionMenu({
  visible,
  anchor,
  onClose,
  onDelete,
}: {
  visible: boolean;
  anchor: MessageActionAnchor | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { width, height } = useWindowDimensions();

  if (!visible || !anchor) {
    return null;
  }

  const menuWidth = 168;
  const menuHeight = 58;
  const left = Math.min(Math.max(16, anchor.x + anchor.width - menuWidth), width - menuWidth - 16);
  const preferAbove = anchor.y > height * 0.58;
  const top = preferAbove
    ? Math.max(16, anchor.y - menuHeight - 10)
    : Math.min(height - menuHeight - 16, anchor.y + anchor.height + 10);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.menu, { left, top, width: menuWidth }]}>
          <Pressable
            onPress={() => {
              onClose();
              onDelete();
            }}
            style={styles.action}>
            <ThemedText style={styles.actionText}>Delete message</ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.whiteGlassMax,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    shadowColor: designSystem.colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  action: {
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  actionText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
});
