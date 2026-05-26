import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.lg,
  },
  notice: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.copper,
  },
  search: {
    height: designSystem.layout.inputHeight,
  },
  cardStack: {
    gap: 2,
  },
  emptyState: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: designSystem.colors.surface,
  },
  emptyTitle: {
    ...designSystem.type.cardTitle,
    color: designSystem.colors.ink,
  },
  emptyBody: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.warmDark,
  },
  matchSkeleton: {
    height: 232,
    borderRadius: 28,
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 36,
    gap: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  sheetHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  sheetTitle: {
    ...designSystem.type.title,
  },
  sheetSubtitle: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  syncState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetSection: {
    gap: 10,
  },
  sheetSectionTitle: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.gray,
  },
  sheetList: {
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
  },
  contactCopy: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  contactMeta: {
    flex: 1,
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  contactAction: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.darkGreen,
  },
  contactActionDisabled: {
    opacity: 0.55,
  },
  emptyContacts: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: designSystem.colors.surface,
  },
  contactFootnote: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
});
