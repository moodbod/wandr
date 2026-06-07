import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: 28,
  },
  carouselContainer: {
    height: 420,
  },
  paddedContent: {
    paddingHorizontal: 24,
    gap: 32,
  },
  titleBlock: {
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
    textTransform: 'uppercase',
  },
  titleStack: {
    gap: 4,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '600',
  },
  locationLabel: {
    fontSize: 17,
    color: designSystem.colors.gray,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: designSystem.colors.gray,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  storyStack: {
    gap: 18,
  },
  storyBlock: {
    gap: 8,
  },
  storyTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
  },
  storyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: designSystem.colors.gray,
    maxWidth: '96%',
  },
  tipList: {
    gap: 14,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: designSystem.colors.lime,
  },
  tipText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  detailBadgeSkeleton: {
    width: 112,
    height: 30,
    borderRadius: 15,
  },
  detailTitleSkeleton: {
    width: '82%',
    height: 52,
    borderRadius: 20,
  },
  detailSubtitleSkeleton: {
    width: '58%',
    height: 20,
    borderRadius: 10,
  },
  heroSkeleton: {
    alignSelf: 'center',
    height: 420,
    borderRadius: designSystem.radii.feature,
    maxWidth: 344,
    width: '88%',
  },
  summarySkeleton: {
    height: 96,
    borderRadius: 24,
  },
  sectionSkeleton: {
    height: 220,
    borderRadius: 28,
  },
  sheetHeader: {
    gap: 6,
    paddingTop: 4,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  sheetSubtitle: {
    color: designSystem.colors.mutedText,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  sheetSubtitleDark: {
    color: designSystem.colors.darkTextSoft,
  },
  sheetContent: {
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 18,
  },
  tripRow: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  tripRowDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
