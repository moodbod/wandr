import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { darkSheetPalette } from '@/components/wandr/stays/stay-detail-model';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: designSystem.colors.background,
  },
  rootDark: {
    backgroundColor: darkSheetPalette.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
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
  heroPanel: {
    gap: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
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
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.lightSurfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  availabilityText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  availabilityBadgeDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  availabilityTextDark: {
    color: darkSheetPalette.mutedText,
  },
  title: {
    ...designSystem.type.title,
    fontSize: 30,
    lineHeight: 34,
    color: designSystem.colors.ink,
  },
  titleDark: {
    color: darkSheetPalette.text,
  },
  locationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  subtitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.warmDark,
  },
  subtitleDark: {
    color: darkSheetPalette.mutedText,
  },
  dotText: {
    fontSize: 14,
    lineHeight: 16,
    color: designSystem.colors.gray,
  },
  dotTextDark: {
    color: darkSheetPalette.mutedText,
  },
  summary: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  summaryDark: {
    color: darkSheetPalette.mutedText,
  },
  section: {
    gap: 18,
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
    color: darkSheetPalette.text,
  },
  sectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  sectionSubtitleDark: {
    color: darkSheetPalette.mutedText,
  },
  supportingNote: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  supportingNoteDark: {
    color: darkSheetPalette.mutedText,
  },
  detailDropdown: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  detailDropdownDark: {
    borderColor: darkSheetPalette.border,
  },
  detailDropdownRow: {
    paddingVertical: 16,
    gap: 10,
  },
  detailDropdownRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderSoft,
  },
  detailDropdownRowBorderDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  detailDropdownSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
  },
  detailLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  detailLabelDark: {
    color: darkSheetPalette.mutedText,
  },
  detailValue: {
    maxWidth: '92%',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  detailValueDark: {
    color: darkSheetPalette.text,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityChip: {
    borderRadius: 999,
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amenityChipDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  amenityText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.lightText,
  },
  amenityTextDark: {
    color: darkSheetPalette.text,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reviewsSummary: {
    flex: 1,
  },
  reviewsRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsRatingValue: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  reviewsRatingValueDark: {
    color: darkSheetPalette.text,
  },
  reviewsCount: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  reviewsCountDark: {
    color: darkSheetPalette.mutedText,
  },
  reviewAction: {
    minHeight: 38,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  reviewActionDark: {
    backgroundColor: darkSheetPalette.surface,
    borderColor: darkSheetPalette.border,
  },
  reviewActionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  neighborhoodMap: {
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
  },
  reviewList: {
    gap: 0,
  },
  reviewsLoadingRow: {
    paddingVertical: 24,
    alignItems: 'flex-start',
  },
  emptyReviewsCard: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderHairline,
    gap: 6,
  },
  emptyReviewsCardDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  emptyReviewsTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  emptyReviewsTitleDark: {
    color: darkSheetPalette.text,
  },
  emptyReviewsText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: designSystem.colors.gray,
  },
  emptyReviewsTextDark: {
    color: darkSheetPalette.mutedText,
  },
  reviewCard: {
    paddingVertical: 20,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderHairline,
  },
  reviewCardDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  smallAvatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surface,
  },
  avatarFallbackDark: {
    backgroundColor: darkSheetPalette.surface,
  },
  avatarFallbackText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  avatarFallbackTextDark: {
    color: darkSheetPalette.text,
  },
  reviewName: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.lightTextStrong,
  },
  reviewNameDark: {
    color: darkSheetPalette.text,
  },
  reviewVisited: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.lightMutedWarm,
  },
  reviewMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewQuote: {
    fontSize: 15,
    lineHeight: 28,
    fontWeight: '600',
    color: designSystem.colors.lightText,
  },
  reviewQuoteDark: {
    color: darkSheetPalette.mutedText,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 40,
    boxShadow: '0 16px 28px rgba(0,0,0,0.16)',
    elevation: 18,
  },
  bottomBarAndroidShadowless: {
    boxShadow: 'none',
    elevation: 0,
  },
  bottomBarGlassClip: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: designSystem.colors.whiteOverlayBorder,
    borderRadius: 40,
    backgroundColor: designSystem.colors.transparentWhite,
  },
  bottomBarGlassClipDark: {
    borderColor: designSystem.colors.whiteOverlayBarely,
    backgroundColor: designSystem.colors.transparentWhite,
  },
  bottomBarFallbackGlassClip: {
    borderColor: designSystem.colors.whiteOverlayBorder,
    backgroundColor: designSystem.colors.transparentWhite,
  },
  bottomBarFallbackGlassClipDark: {
    borderColor: designSystem.colors.whiteOverlayBarely,
    backgroundColor: designSystem.colors.transparentWhite,
  },
  bottomBarGlassView: {
    borderRadius: 40,
  },
  bottomBarFallbackGlassFill: {
    backgroundColor: designSystem.colors.whiteGlassMedium,
  },
  bottomBarFallbackGlassFillDark: {
    backgroundColor: designSystem.colors.darkGlassHeader,
  },
  bottomBarHighlight: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
    borderRadius: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.whiteBorder,
    backgroundColor: designSystem.colors.whiteWashSubtle,
  },
  bottomBarHighlightDark: {
    borderColor: designSystem.colors.whiteOverlayBarely,
    backgroundColor: designSystem.colors.nativeDarkWash,
  },
  bottomBarFallbackHighlight: {
    backgroundColor: designSystem.colors.whiteOverlayFaint,
  },
  bottomBarFallbackHighlightDark: {
    backgroundColor: designSystem.colors.whiteOverlayBarely,
  },
  bottomBarContent: {
    minHeight: 76,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    padding: 8,
    paddingLeft: 20,
    gap: 8,
  },
  bottomBarPriceBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  bottomBarPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    minWidth: 0,
  },
  bottomBarLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.lightMutedWarm,
  },
  bottomBarLabelDark: {
    color: darkSheetPalette.mutedText,
  },
  bottomBarPrice: {
    marginTop: 6,
    flexShrink: 1,
    fontSize: 23,
    lineHeight: 25,
    fontWeight: '600',
    color: designSystem.colors.lightTextDeep,
  },
  bottomBarPriceDark: {
    color: darkSheetPalette.text,
  },
  bottomBarSuffix: {
    flexShrink: 0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.lightMutedWarm,
  },
  bottomBarNightSuffix: {
    marginTop: 4,
  },
  bottomBarSuffixDark: {
    color: darkSheetPalette.mutedText,
  },
  bottomBarRate: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
    color: designSystem.colors.lightMutedWarm,
  },
  bottomBarRateDark: {
    color: darkSheetPalette.mutedText,
  },
  bookNearbyButton: {
    minWidth: 132,
    flexBasis: '43%',
    borderRadius: 32,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
  bookNearbyButtonDisabled: {
    opacity: 0.72,
  },
  bookNearbyButtonDisabledAndroid: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  bookNearbyText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  sheetRoot: {
    flex: 1,
  },
  sheetLayer: {
    zIndex: 80,
    elevation: 80,
  },
  reviewSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 18,
  },
  sheetContent: {
    paddingTop: 24,
    paddingBottom: 40,
    gap: 18,
  },
  sheetPaddedBlock: {
    paddingHorizontal: 24,
  },
  sheetTitle: {
    ...designSystem.type.subtitle,
    fontSize: 21,
  },
  sheetSubtitle: {
    ...designSystem.type.body,
    color: designSystem.colors.warmDark,
    marginBottom: 8,
  },
  sheetSubtitleDark: {
    color: darkSheetPalette.mutedText,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewStarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSection: {
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderSoft,
  },
  sheetSectionDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  sheetSectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sheetSectionTitleDark: {
    color: darkSheetPalette.text,
  },
  sheetSectionTitleSmall: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sheetSectionTitleSmallDark: {
    color: darkSheetPalette.text,
  },
  sheetSectionBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  sheetSectionBodyDark: {
    color: darkSheetPalette.mutedText,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  verticalOptionList: {
    gap: 10,
  },
  sheetInlineAction: {
    minHeight: 48,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sheetInlineActionDark: {
    backgroundColor: darkSheetPalette.accent,
  },
  sheetInlineActionDisabled: {
    opacity: 0.72,
  },
  sheetInlineActionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  sheetInlineActionTextDark: {
    color: darkSheetPalette.accentText,
  },
  sheetFieldGrid: {
    gap: 10,
  },
  sheetFieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetFieldColumn: {
    flex: 1,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  sheetInputDark: {
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  sheetInputText: {
    fontSize: 14,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sheetInputTextDark: {
    color: darkSheetPalette.text,
  },
  selectionPill: {
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectionPillDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  selectionPillActive: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  selectionPillActiveDark: {
    backgroundColor: darkSheetPalette.accent,
    borderColor: darkSheetPalette.accent,
  },
  selectionPillText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  selectionPillTextDark: {
    color: darkSheetPalette.text,
  },
  selectionPillTextActive: {
    color: designSystem.colors.darkGreen,
  },
  selectionPillTextActiveDark: {
    color: darkSheetPalette.accentText,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.borderSoft,
  },
  selectionRowDark: {
    borderBottomColor: darkSheetPalette.border,
  },
  selectionRowActive: {
    borderBottomColor: darkSheetPalette.border,
  },
  selectionRowCopy: {
    flex: 1,
    gap: 6,
  },
  selectionRowLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  selectionRowLabelDark: {
    color: darkSheetPalette.text,
  },
  selectionRowLabelActive: {
    color: designSystem.colors.darkGreen,
  },
  selectionRowLabelActiveDark: {
    color: darkSheetPalette.text,
  },
  selectionRowDetail: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  selectionRowDetailDark: {
    color: darkSheetPalette.mutedText,
  },
  selectionRowDetailActive: {
    color: designSystem.colors.darkGreen,
  },
  selectionRowDetailActiveDark: {
    color: darkSheetPalette.mutedText,
  },
  selectionRowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: designSystem.colors.border,
  },
  selectionRowDotDark: {
    borderColor: darkSheetPalette.border,
  },
  selectionRowDotActive: {
    backgroundColor: darkSheetPalette.accent,
    borderColor: darkSheetPalette.accent,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  counterLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  counterLabelDark: {
    color: darkSheetPalette.text,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  counterButtonDark: {
    backgroundColor: darkSheetPalette.surface,
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  counterButtonText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  counterButtonTextDark: {
    color: darkSheetPalette.text,
  },
  counterValue: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  counterValueDark: {
    color: darkSheetPalette.text,
  },
  inlineSummary: {
    gap: 6,
    paddingTop: 2,
  },
  inlineSummaryLabel: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.gray,
  },
  inlineSummaryValue: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  inlineSummaryValueDark: {
    color: darkSheetPalette.text,
  },
  notesInput: {
    alignItems: 'stretch',
    minHeight: 110,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  notesInputText: {
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
    minHeight: 82,
    color: designSystem.colors.ink,
    textAlignVertical: 'top',
  },
  notesInputDark: {
    borderWidth: 1,
    borderColor: darkSheetPalette.border,
  },
  notesInputTextDark: {
    color: darkSheetPalette.text,
  },
  reviewNoteInput: {
    minHeight: 100,
  },
  pricePreviewCard: {
    gap: 12,
    borderRadius: 24,
    backgroundColor: designSystem.colors.whiteWashSubtle,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pricePreviewCardDark: {
    backgroundColor: darkSheetPalette.surface,
    borderColor: darkSheetPalette.border,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  priceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  priceLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  priceLabelDark: {
    color: darkSheetPalette.text,
  },
  priceRate: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: designSystem.colors.lightMutedWarm,
  },
  priceRateDark: {
    color: darkSheetPalette.mutedText,
  },
  priceValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  priceValueDark: {
    color: darkSheetPalette.text,
  },
  priceValueStack: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 2,
  },
  priceValueRate: {
    maxWidth: 180,
    textAlign: 'right',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
    color: designSystem.colors.lightMutedWarm,
  },
  priceValueRateDark: {
    color: darkSheetPalette.mutedText,
  },
  priceMeta: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  priceMetaDark: {
    color: darkSheetPalette.mutedText,
  },
  confirmButton: {
    minHeight: 56,
    borderRadius: 999,
    marginHorizontal: 24,
    marginTop: 4,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonAndroid: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: designSystem.colors.darkGreen,
  },
  confirmButtonDark: {
    backgroundColor: darkSheetPalette.accent,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonDisabledAndroid: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  confirmButtonText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  confirmButtonTextDark: {
    color: darkSheetPalette.accentText,
  },
  stayHeroSkeleton: {
    height: 340,
    borderRadius: 34,
    marginHorizontal: designSystem.spacing.lg,
  },
  stayBadgeSkeleton: {
    width: 118,
    height: 30,
    borderRadius: 15,
  },
  stayTitleSkeleton: {
    width: '88%',
    height: 74,
    borderRadius: 24,
  },
  staySubtitleSkeleton: {
    width: '64%',
    height: 22,
    borderRadius: 11,
  },
  stayPanelSkeleton: {
    width: '100%',
    height: 148,
    borderRadius: 28,
  },
});
