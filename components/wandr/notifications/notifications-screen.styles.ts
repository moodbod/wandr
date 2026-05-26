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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
  },
  tabsWrap: {
    flex: 1,
  },
  markReadText: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.darkGreen,
  },
  markReadTextDark: {
    color: designSystem.colors.lime,
  },
  emptyState: {
    paddingTop: designSystem.spacing.md,
  },
  emptyUnreadState: {
    minHeight: 1,
  },
  emptyTitle: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  list: {
    gap: designSystem.spacing.xl,
  },
  notificationSkeleton: {
    height: 76,
    borderRadius: 24,
  },
  section: {
    gap: designSystem.spacing.md,
  },
  sectionTitle: {
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  rows: {
    gap: designSystem.spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.md,
    minHeight: 66,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorAvatar: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  messageLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.sm,
  },
  actorTitleCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rowMessage: {
    ...designSystem.type.cardTitle,
    color: designSystem.colors.ink,
  },
  actorName: {
    ...designSystem.type.cardTitle,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  actorBaseLabel: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.gray,
    flexShrink: 1,
  },
  rowTime: {
    ...designSystem.type.cardTitle,
    color: designSystem.colors.gray,
  },
  rowBody: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.warmDark,
  },
  requestActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  requestButton: {
    minHeight: 30,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    paddingHorizontal: designSystem.spacing.sm,
  },
  approveButton: {
    backgroundColor: designSystem.colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderAccent,
  },
  approveButtonDark: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  declineButton: {
    backgroundColor: designSystem.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderSoft,
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  approveButtonText: {
    ...designSystem.type.label,
    color: designSystem.colors.darkGreen,
  },
  declineButtonText: {
    ...designSystem.type.label,
    color: designSystem.colors.gray,
  },
});
