import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

export function OptionsSheetAction({
  description,
  icon,
  onPress,
  title,
  tone = 'default',
}: {
  description: string;
  icon: ReactNode;
  onPress: () => void;
  title: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [optionsSheetStyles.actionRow, pressed ? optionsSheetStyles.pressed : null]}>
      <View style={[optionsSheetStyles.actionIcon, tone === 'danger' ? optionsSheetStyles.actionIconDanger : null]}>{icon}</View>
      <View style={optionsSheetStyles.actionCopy}>
        <ThemedText style={[optionsSheetStyles.actionTitle, tone === 'danger' ? optionsSheetStyles.actionTitleDanger : null]}>{title}</ThemedText>
        <ThemedText style={optionsSheetStyles.actionDescription}>{description}</ThemedText>
      </View>
    </Pressable>
  );
}

export const optionsSheetStyles = StyleSheet.create({
  sheetContent: {
    paddingTop: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    gap: 18,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: designSystem.colors.blackWash,
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 58,
  },
  sheetAvatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
  },
  sheetTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  inlineNameInput: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
    color: designSystem.colors.ink,
    backgroundColor: designSystem.colors.white,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  sheetMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  headerEditButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.limeSoft,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  panelTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sheetSection: {
    gap: 12,
  },
  sectionHeadingRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  memberCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
    backgroundColor: designSystem.colors.limeSoft,
  },
  sheetMembers: {
    gap: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
  },
  memberAvatarWrap: {
    width: 36,
  },
  emptyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designSystem.colors.surfaceMuted,
  },
  memberCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  memberMeta: {
    fontSize: 13,
    lineHeight: 16,
    color: designSystem.colors.gray,
  },
  widgetSection: {
    gap: 12,
  },
  actionList: {
    gap: 10,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  actionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: designSystem.colors.whiteGlassStrong,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.limeSoft,
  },
  actionIconDanger: {
    backgroundColor: 'rgba(161,75,26,0.12)',
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  actionTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  actionTitleDanger: {
    color: designSystem.colors.copper,
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
});
