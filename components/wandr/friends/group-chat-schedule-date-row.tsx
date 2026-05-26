import { Minus, Plus } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

import { formatScheduleClock, formatScheduleDate } from './group-chat-model';
import { styles } from './group-chat-screen.styles';

type ScheduleDateRowProps = {
  disabled?: boolean;
  label: string;
  onMinus: () => void;
  onPlus: () => void;
  timestamp: number;
};

export function ScheduleDateRow({
  disabled = false,
  label,
  onMinus,
  onPlus,
  timestamp,
}: ScheduleDateRowProps) {
  return (
    <View style={[styles.scheduleDateRow, disabled ? styles.scheduleDateRowDisabled : null]}>
      <ThemedText style={styles.scheduleCardLabel}>{label}</ThemedText>
      <View style={styles.scheduleDateControls}>
        <View style={styles.scheduleDatePills}>
          <ThemedText style={styles.scheduleDatePill}>{formatScheduleDate(timestamp)}</ThemedText>
          <ThemedText style={styles.scheduleDatePill}>{formatScheduleClock(timestamp)}</ThemedText>
        </View>
        <View style={styles.scheduleAdjustRow}>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={onMinus} style={styles.smallIconButton}>
            <Minus color={designSystem.colors.darkGreen} size={16} weight="bold" />
          </Pressable>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={onPlus} style={styles.smallIconButton}>
            <Plus color={designSystem.colors.darkGreen} size={16} weight="bold" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
