import { Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

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
  onClose,
  onDelete,
}: {
  visible: boolean;
  anchor: MessageActionAnchor | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';

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
      <Pressable style={[styles.backdrop, isDark ? styles.backdropDark : null]} onPress={onClose}>
        <View style={[styles.menu, isDark ? styles.menuDark : styles.menuLight, { left, top, width: menuWidth }]}>
          <Pressable
            onPress={() => {
              onClose();
              onDelete();
            }}
            style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}>
            <ThemedText style={[styles.actionText, isDark ? styles.actionTextDark : null]}>Delete message</ThemedText>
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
  backdropDark: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  menu: {
    position: 'absolute',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: designSystem.colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
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
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.copper,
  },
  actionTextDark: {
    color: '#ff9b73',
  },
});
