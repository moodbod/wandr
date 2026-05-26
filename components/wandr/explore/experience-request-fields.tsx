import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

export const EXPERIENCE_REQUEST_DATE_OPTIONS = [
  { label: 'Tomorrow', dayOffset: 1 },
  { label: 'This week', dayOffset: 3 },
  { label: 'Next week', dayOffset: 7 },
] as const;

export function getExperienceRequestScheduledFor(dayOffset: number) {
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + dayOffset);
  scheduled.setHours(10, 0, 0, 0);
  return scheduled.getTime();
}

export function parseExperiencePriceSnapshot(price?: string) {
  const match = price?.replace(/,/g, '').match(/\d+(\.\d+)?/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[0]);
  return Number.isFinite(value) ? value : undefined;
}

export function ExperienceRequestFields({
  dayOffset,
  isDark,
  note,
  onChangeDayOffset,
  onChangeNote,
  onChangePartySize,
  partySize,
}: {
  dayOffset: number;
  isDark: boolean;
  note: string;
  onChangeDayOffset: (dayOffset: number) => void;
  onChangeNote: (note: string) => void;
  onChangePartySize: (partySize: number) => void;
  partySize: number;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.fieldBlock}>
        <ThemedText style={[styles.label, isDark ? styles.labelDark : null]}>Date</ThemedText>
        <View style={styles.optionRow}>
          {EXPERIENCE_REQUEST_DATE_OPTIONS.map((option) => {
            const active = option.dayOffset === dayOffset;
            return (
              <Pressable
                accessibilityRole="button"
                key={option.dayOffset}
                onPress={() => onChangeDayOffset(option.dayOffset)}
                style={[
                  styles.optionButton,
                  isDark ? styles.optionButtonDark : null,
                  active ? styles.optionButtonActive : null,
                ]}
              >
                <ThemedText style={[styles.optionText, active ? styles.optionTextActive : null]}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <ThemedText style={[styles.label, isDark ? styles.labelDark : null]}>Party</ThemedText>
        <View style={[styles.stepper, isDark ? styles.stepperDark : null]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease party size"
            disabled={partySize <= 1}
            onPress={() => onChangePartySize(Math.max(1, partySize - 1))}
            style={[styles.stepperButton, partySize <= 1 ? styles.disabled : null]}
          >
            <ThemedText style={styles.stepperButtonText}>-</ThemedText>
          </Pressable>
          <ThemedText style={styles.partyValue}>{partySize}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase party size"
            onPress={() => onChangePartySize(Math.min(99, partySize + 1))}
            style={styles.stepperButton}
          >
            <ThemedText style={styles.stepperButtonText}>+</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <ThemedText style={[styles.label, isDark ? styles.labelDark : null]}>Note</ThemedText>
        <TextInput
          multiline
          onChangeText={onChangeNote}
          placeholder="Anything the host should know"
          placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
          style={[
            styles.noteInput,
            isDark ? styles.noteInputDark : null,
          ]}
          textAlignVertical="top"
          value={note}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    color: designSystem.colors.ink,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  labelDark: {
    color: designSystem.colors.darkText,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: designSystem.colors.surface,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  optionButtonDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  optionButtonActive: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  optionText: {
    color: designSystem.colors.warmDark,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  optionTextActive: {
    color: designSystem.colors.darkGreen,
  },
  stepper: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.surface,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 38,
    paddingHorizontal: 8,
  },
  stepperDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  stepperButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepperButtonText: {
    color: designSystem.colors.darkGreen,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  partyValue: {
    color: designSystem.colors.ink,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    minWidth: 18,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  noteInput: {
    backgroundColor: designSystem.colors.surface,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    color: designSystem.colors.ink,
    fontSize: 14,
    lineHeight: 19,
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteInputDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    color: designSystem.colors.darkText,
  },
});
