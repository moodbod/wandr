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
  hero: {
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: designSystem.colors.surface,
  },
  heroBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  name: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  location: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.subtleText,
  },
  destination: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  headline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.warmDark,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 64,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  statValue: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  disabledAction: {
    opacity: 0.55,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minWidth: 128,
  },
  primaryButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  messageButton: {
    height: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 18,
  },
  messageButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  travelCard: {
    gap: 12,
    padding: 18,
    borderRadius: 24,
  },
  travelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  travelCardTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 15,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  metaPillText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  interestSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  sharedChip: {
    backgroundColor: designSystem.colors.lime,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  sharedChipText: {
    color: designSystem.colors.darkGreen,
  },
  emptyState: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.warmDark,
  },
  skeletonStack: {
    gap: designSystem.spacing.lg,
  },
  heroSkeleton: {
    height: 148,
    borderRadius: 28,
  },
  actionSkeleton: {
    height: 44,
    borderRadius: 18,
  },
  cardSkeleton: {
    height: 148,
    borderRadius: 24,
  },
  cardSkeletonSmall: {
    height: 96,
    borderRadius: 24,
  },
});
