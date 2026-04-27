import { MapTrifold, PaperPlaneTilt } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassInput } from '@/components/ui/glass-input';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

export function FriendChatComposer({
  value,
  onChangeText,
  onSubmit,
  onShareRoute,
  placeholder,
  quickActions,
  onQuickAction,
  isSending,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onShareRoute: () => void;
  placeholder: string;
  quickActions: { key: string; label: string }[];
  onQuickAction: (key: string) => void;
  isSending: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.quickRow}>
        {quickActions.map((action) => (
          <Pressable key={action.key} onPress={() => onQuickAction(action.key)} style={styles.quickChip}>
            <ThemedText style={styles.quickChipText}>{action.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.composerRow}>
        <Pressable onPress={onShareRoute} style={styles.iconButton}>
          <MapTrifold color={designSystem.colors.darkGreen} size={18} weight="bold" />
        </Pressable>
        <GlassInput
          value={value}
          onChangeText={onChangeText}
          containerStyle={styles.input}
          placeholder={placeholder}
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          leftIcon={null}
        />
        <Pressable disabled={isSending} onPress={onSubmit} style={[styles.sendButton, isSending ? styles.sendButtonDisabled : null]}>
          <PaperPlaneTilt color={designSystem.colors.darkGreen} size={18} weight="fill" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'rgba(244,244,241,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.08)',
  },
  quickChipText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
    textTransform: 'uppercase',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(159,232,112,0.18)',
  },
  input: {
    flex: 1,
    minHeight: 52,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
});
