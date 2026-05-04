import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

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
    paddingTop: Platform.OS === 'web' ? 12 : designSystem.spacing.lg,
    paddingHorizontal: Platform.OS === 'web' ? 14 : designSystem.spacing.lg,
    gap: Platform.OS === 'web' ? 10 : 18,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: Platform.OS === 'web' ? 30 : 42,
    height: Platform.OS === 'web' ? 3 : 5,
    borderRadius: 3,
    backgroundColor: designSystem.colors.blackWash,
    marginBottom: Platform.OS === 'web' ? 0 : 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 10 : 14,
    minHeight: Platform.OS === 'web' ? 42 : 58,
  },
  sheetAvatar: {
    width: Platform.OS === 'web' ? 38 : 48,
    height: Platform.OS === 'web' ? 38 : 48,
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
    fontSize: Platform.OS === 'web' ? 18 : 28,
    lineHeight: Platform.OS === 'web' ? 22 : 30,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  inlineNameInput: {
    minHeight: Platform.OS === 'web' ? 32 : 42,
    borderRadius: Platform.OS === 'web' ? 16 : 21,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 14,
    fontSize: Platform.OS === 'web' ? 17 : 24,
    lineHeight: Platform.OS === 'web' ? 21 : 28,
    fontWeight: '600',
    color: designSystem.colors.ink,
    backgroundColor: designSystem.colors.white,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  sheetMeta: {
    fontSize: Platform.OS === 'web' ? 12 : 14,
    lineHeight: Platform.OS === 'web' ? 16 : 20,
    color: designSystem.colors.gray,
  },
  headerEditButton: {
    width: Platform.OS === 'web' ? 34 : 44,
    height: Platform.OS === 'web' ? 34 : 44,
    borderRadius: Platform.OS === 'web' ? 17 : 22,
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
    gap: Platform.OS === 'web' ? 8 : 12,
  },
  sectionHeadingRow: {
    minHeight: Platform.OS === 'web' ? 26 : 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  memberCountPill: {
    paddingHorizontal: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 4 : 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
    backgroundColor: designSystem.colors.limeSoft,
  },
  sheetMembers: {
    gap: Platform.OS === 'web' ? 6 : 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 10 : 12,
    minHeight: Platform.OS === 'web' ? 38 : 46,
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
    gap: Platform.OS === 'web' ? 6 : 10,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  actionRow: {
    minHeight: Platform.OS === 'web' ? 48 : 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 9 : 12,
    borderRadius: Platform.OS === 'web' ? 14 : 24,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 14,
    paddingVertical: Platform.OS === 'web' ? 8 : 12,
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.surfaceRaised : designSystem.colors.whiteGlassStrong,
    borderWidth: 1,
    borderColor: Platform.OS === 'android' ? designSystem.colors.lightSurfaceAlt : designSystem.colors.borderSoft,
  },
  actionIcon: {
    width: Platform.OS === 'web' ? 30 : 42,
    height: Platform.OS === 'web' ? 30 : 42,
    borderRadius: Platform.OS === 'web' ? 15 : 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.limeSoft,
  },
  actionIconDanger: {
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.surface : 'rgba(161,75,26,0.12)',
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: Platform.OS === 'web' ? 1 : 3,
  },
  actionTitle: {
    fontSize: Platform.OS === 'web' ? 14 : 15,
    lineHeight: Platform.OS === 'web' ? 17 : 18,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  actionTitleDanger: {
    color: designSystem.colors.copper,
  },
  actionDescription: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
    lineHeight: Platform.OS === 'web' ? 15 : 18,
    color: designSystem.colors.gray,
  },
});
