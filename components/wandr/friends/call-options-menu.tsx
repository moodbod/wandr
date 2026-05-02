import { Phone, VideoCamera, CalendarBlank } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassButton } from '@/components/ui/glass-button';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import type { CallOptionsMenuProps } from '@/components/wandr/friends/call-options-menu.types';

export function CallOptionsMenu({
  disabled = false,
  iconColor,
  onScheduleCall,
  onStartVideoCall,
  onStartVoiceCall,
}: CallOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

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
        <View style={styles.menu}>
          <FallbackMenuItem icon={<Phone color={designSystem.colors.white} size={18} weight="bold" />} label="Voice Call" onPress={() => runAction(onStartVoiceCall)} />
          <FallbackMenuItem icon={<VideoCamera color={designSystem.colors.white} size={18} weight="bold" />} label="Video Call" onPress={() => runAction(onStartVideoCall)} />
          <FallbackMenuItem icon={<CalendarBlank color={designSystem.colors.white} size={18} weight="bold" />} label="Schedule Call" onPress={() => runAction(onScheduleCall)} />
        </View>
      ) : null}
    </View>
  );
}

function FallbackMenuItem({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}>
      {icon}
      <ThemedText style={styles.itemText}>{label}</ThemedText>
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
    backgroundColor: 'rgba(22,24,22,0.96)',
    borderWidth: 1,
    borderColor: designSystem.colors.whiteOverlayBarely,
  },
  item: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemPressed: {
    opacity: 0.7,
  },
  itemText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
});
