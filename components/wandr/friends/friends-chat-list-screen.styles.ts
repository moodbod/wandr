import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xl,
  },
  largeHeaderRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  largeTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  largeTitle: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  largeSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  largeCreateButton: {
    minWidth: 64,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 18,
  },
  largeCreateButtonText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.copper,
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  rowList: {
    gap: 18,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: designSystem.layout.cardPadding,
    paddingTop: designSystem.spacing.xl,
    paddingBottom: designSystem.spacing.xl,
    gap: designSystem.spacing.lg,
  },
  sheetHeader: {
    gap: 2,
  },
  sheetTitle: {
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  sheetDescription: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  sheetInput: {
    minHeight: designSystem.layout.inputHeight,
    borderRadius: designSystem.radii.panel,
    backgroundColor: designSystem.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderSoft,
    paddingHorizontal: designSystem.spacing.md,
    fontSize: 16,
    lineHeight: 20,
    color: designSystem.colors.ink,
  },
  sheetInputDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    color: designSystem.colors.darkText,
  },
  sheetSection: {
    gap: designSystem.spacing.sm,
  },
  sheetSectionTitle: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  friendPicker: {
    maxHeight: 156,
    marginHorizontal: -designSystem.layout.cardPadding,
  },
  friendPickerContent: {
    gap: designSystem.spacing.xs,
    paddingHorizontal: designSystem.layout.cardPadding,
  },
  friendEmpty: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing.sm,
    borderRadius: designSystem.radii.panel,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  friendEmptyText: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  friendOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.sm,
    paddingHorizontal: designSystem.spacing.sm,
    paddingVertical: designSystem.spacing.xs,
    borderRadius: designSystem.radii.panel,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  friendOptionActive: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: designSystem.colors.surface,
  },
  friendAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surface,
  },
  friendAvatarInitial: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  friendOptionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  friendOptionName: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.ink,
  },
  friendOptionMeta: {
    ...designSystem.type.caption,
    color: designSystem.colors.gray,
  },
  friendCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderSoft,
  },
  friendCheckActive: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.borderAccent,
  },
  tripOptionScroller: {
    marginHorizontal: -designSystem.layout.cardPadding,
  },
  tripOptionRow: {
    gap: designSystem.spacing.xs,
    paddingHorizontal: designSystem.layout.cardPadding,
  },
  tripOption: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing.md,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  tripOptionActive: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  tripOptionText: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  tripOptionTextActive: {
    color: designSystem.colors.darkGreen,
  },
  createButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: designSystem.colors.lime,
    marginTop: designSystem.spacing.xs,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.darkGreen,
  },
  emptyState: {
    gap: 8,
    paddingTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  emptyDescription: {
    maxWidth: 320,
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
});
