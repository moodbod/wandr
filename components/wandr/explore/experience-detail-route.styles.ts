import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootDark: {
    backgroundColor: designSystem.colors.darkBackground,
  },
  content: {
    gap: designSystem.spacing.xxxl,
  },
  carouselContainer: {
    width: '100%',
  },
  paddedContent: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xxxl,
  },
  titleBlock: {
    paddingTop: 12,
    gap: 8,
  },
  titleStack: {
    width: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.lime,
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  title: {
    ...designSystem.type.title,
    fontSize: 32,
    color: designSystem.colors.ink,
    lineHeight: 36,
  },
  titleDark: {
    color: designSystem.colors.darkText,
  },
  subtitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.warmDark,
  },
  subtitleDark: {
    color: designSystem.colors.darkMutedText,
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  socialProof: {
    gap: 14,
  },
  socialProofCopy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  socialProofTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  socialProofText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  section: {
    gap: 18,
    marginTop: 14,
  },
  sectionHeading: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sectionTitleDark: {
    color: designSystem.colors.darkText,
  },
  sectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  sectionSubtitleDark: {
    color: designSystem.colors.darkMutedText,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  summaryDark: {
    color: designSystem.colors.darkMutedText,
  },
  actions: {
    gap: 16,
    marginTop: 12,
  },
  sheetContent: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  sheetTitle: {
    ...designSystem.type.subtitle,
    fontSize: 24,
  },
  sheetTitleDark: {
    color: designSystem.colors.darkText,
  },
  sheetSubtitle: {
    ...designSystem.type.body,
    color: designSystem.colors.warmDark,
    marginBottom: 8,
  },
  sheetSubtitleDark: {
    color: designSystem.colors.darkMutedText,
  },
  tripList: {
    gap: 12,
  },
  publicTripSection: {
    gap: 12,
    paddingBottom: 4,
  },
  publicTripHeader: {
    gap: 4,
  },
  publicTripTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  publicTripSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.warmDark,
  },
  publicTripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
  },
  publicTripCopy: {
    flex: 1,
    gap: 8,
  },
  publicTripName: {
    ...designSystem.type.bodyStrong,
  },
  publicTripMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.warmDark,
  },
  publicTripJoinButton: {
    minWidth: 82,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 14,
  },
  publicTripJoinButtonDisabled: {
    opacity: 0.7,
  },
  publicTripJoinText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  tripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
  },
  tripOptionDefault: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  sheetOptionDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  tripOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: designSystem.colors.whiteOverlayStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripOptionImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  tripOptionImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: designSystem.colors.border,
  },
  tripOptionName: {
    ...designSystem.type.bodyStrong,
    flex: 1,
  },
  detailHeroSkeleton: {
    alignSelf: 'center',
    borderRadius: 34,
    height: 500,
    maxWidth: 344,
    width: '88%',
  },
  detailBadgeSkeleton: {
    width: 104,
    height: 30,
    borderRadius: 15,
  },
  detailTitleSkeleton: {
    width: '86%',
    height: 74,
    borderRadius: 24,
  },
  detailSubtitleSkeleton: {
    width: '62%',
    height: 20,
    borderRadius: 10,
  },
  detailBodySkeleton: {
    width: '100%',
    height: 92,
    borderRadius: 24,
  },
  detailPanelSkeleton: {
    width: '100%',
    height: 156,
    borderRadius: 28,
  },
});
