import { CalendarBlank, Phone, VideoCamera } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import type { CallOptionsMenuProps } from '@/components/wandr/friends/call-options-menu.types';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function CallOptionsMenu({
  disabled = false,
  iconColor,
  onScheduleCall,
  onStartVideoCall,
  onStartVoiceCall,
}: CallOptionsMenuProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const menuIconColor = isDark ? designSystem.colors.white : designSystem.colors.ink;
  const menuTextColor = isDark ? designSystem.colors.white : designSystem.colors.ink;
  const menuPressedColor = isDark ? designSystem.colors.darkCard : designSystem.colors.lightSurfaceAlt;

  const runAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <View style={styles.root}>
      <GlassButton
        accessibilityLabel="Call options"
        disabled={disabled}
        onPress={() => setIsOpen((value) => !value)}
        width={48}
        height={48}>
        <Phone color={iconColor} size={20} weight="bold" />
      </GlassButton>
      {isOpen ? (
        <View style={[styles.menu, isDark ? styles.menuDark : styles.menuLight]}>
          <FallbackMenuItem
            icon={<Phone color={menuIconColor} size={18} weight="bold" />}
            label="Voice Call"
            pressedColor={menuPressedColor}
            textColor={menuTextColor}
            onPress={() => runAction(onStartVoiceCall)}
          />
          <FallbackMenuItem
            icon={<VideoCamera color={menuIconColor} size={18} weight="bold" />}
            label="Video Call"
            pressedColor={menuPressedColor}
            textColor={menuTextColor}
            onPress={() => runAction(onStartVideoCall)}
          />
          {onScheduleCall ? (
            <FallbackMenuItem
              icon={<CalendarBlank color={menuIconColor} size={18} weight="bold" />}
              label="Schedule Call"
              pressedColor={menuPressedColor}
              textColor={menuTextColor}
              onPress={() => runAction(onScheduleCall)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function FallbackMenuItem({
  icon,
  label,
  onPress,
  pressedColor,
  textColor,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  pressedColor: string;
  textColor: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed ? { backgroundColor: pressedColor } : null]}>
      {icon}
      <ThemedText style={[styles.itemText, { color: textColor }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  menu: {
    position: 'absolute',
    top: 54,
    right: 0,
    zIndex: 80,
    width: 194,
    borderRadius: 18,
    paddingVertical: 8,
    borderWidth: 1,
  },
  menuLight: {
    backgroundColor: designSystem.colors.whiteGlassMax,
    borderColor: designSystem.colors.borderSoft,
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
  menuDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorder,
  },
  item: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
  },
});
