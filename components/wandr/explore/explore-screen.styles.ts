import { StyleSheet } from 'react-native';

import { largeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { designSystem } from '@/constants/design-system';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  bodyLarge: {
    flex: 1,
    flexDirection: 'row',
    gap: largeScreenWorkspace.gap,
    padding: largeScreenWorkspace.inset,
  },
  mapLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'visible',
  },
  mapLayerLarge: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
  },
  contentColumn: {
    flexShrink: 0,
    flexGrow: 0,
    minWidth: 340,
    zIndex: 10,
  },
  contentColumnTablet: {
    width: largeScreenWorkspace.mainColumnTabletWidth,
  },
  contentColumnDesktop: {
    width: largeScreenWorkspace.mainColumnWidth,
  },
  detailColumn: {
    flexShrink: 0,
    flexGrow: 0,
    zIndex: 11,
  },
  largeSheetColumn: {
    height: '100%',
    borderWidth: 1,
    borderRadius: largeScreenWorkspace.panelRadius,
    overflow: 'hidden',
  },
  detailColumnTablet: {
    width: largeScreenWorkspace.detailColumnTabletWidth,
  },
  detailColumnDesktop: {
    width: largeScreenWorkspace.detailColumnWidth,
  },
  detailEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  detailEmptyText: {
    fontSize: 16,
    color: designSystem.colors.gray,
    textAlign: 'center',
  },
  mapColumn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: designSystem.colors.mapFallback,
    position: 'relative',
  },
  mapColumnLarge: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
    backgroundColor: designSystem.colors.mapFallback,
    zIndex: 0,
  },
  mapControlsOverlay: {
    position: 'absolute',
    top: largeScreenWorkspace.inset,
    right: largeScreenWorkspace.inset,
    alignItems: 'stretch',
    zIndex: 5,
  },
  largeMapControlsFrame: {
    maxWidth: '100%',
  },
  largeMapControlsLayer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  exploreMainPanel: {
    backgroundColor: '#090a0f',
    borderColor: 'rgba(255,255,255,0.06)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.34)',
  },
  desktopMapLocateButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopMapLocateFloating: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  desktopMapDownloadFloating: {
    bottom: 56,
  },
  columnScroll: {
    paddingTop: 26,
    paddingBottom: 48,
  },
  sheetContent: {
    paddingBottom: 32,
  },
  mobileSheetPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 8,
  },
  mobileSheetGlass: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  mobileSheetPanelFallback: {
    backgroundColor: 'rgba(28, 28, 30, 0.72)',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    overflow: 'hidden',
  },
  mobileStickySearchButton: {
    position: 'absolute',
    top: designSystem.spacing.lg,
    right: designSystem.spacing.lg,
    zIndex: 4,
  },
  nativeMobileStickySearchButton: {
    top: 24,
    right: 16,
  },
  mobileSheetContent: {
    paddingTop: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    paddingBottom: 124,
    gap: 20,
  },
  nativeMobileSheetContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 132,
    gap: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 2,
    paddingBottom: 16,
    gap: 14,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 4,
  },
  sectionTitle: {
    alignSelf: 'stretch',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
  },
  mobileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  nativeMobileSectionHeader: {
    alignItems: 'flex-start',
    paddingBottom: 0,
  },
  mobileSectionTitle: {
    alignSelf: 'stretch',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '600',
    textAlign: 'left',
  },
  nativeMobileSectionTitle: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '700',
  },
  mobileSectionSubtitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    textAlign: 'left',
    maxWidth: 260,
  },
  nativeMobileSectionSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 270,
  },
  createTripButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createTripButtonText: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  createTripButtonTextDark: {
    color: designSystem.colors.darkText,
  },
  searchRail: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchPrimaryAction: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  searchPrimaryText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    padding: 0,
  },
  tripFilterRail: {
    paddingBottom: 8,
  },
  mobileTripFilterRail: {
    minHeight: 44,
    justifyContent: 'center',
  },
  tripFilterEmptyAction: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
  },
  cardList: {
    paddingHorizontal: 16,
    gap: 18,
  },
  mobileCardList: {
    paddingHorizontal: 0,
    gap: 16,
  },
  groupTripSection: {
    marginTop: 6,
    marginBottom: 12,
    gap: 12,
  },
  groupTripTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
  groupTripRail: {
    gap: 12,
    paddingBottom: 4,
  },
  openTripsSection: {
    gap: 12,
  },
  openTripsHeader: {
    gap: 4,
  },
  openTripsTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
  openTripsSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyLocationCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
  },
  mobileEmptyLocationCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 22,
    gap: 8,
    marginTop: 2,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  emptyLocationTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  mobileEmptyLocationTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  emptyLocationText: {
    fontSize: 15,
    lineHeight: 22,
  },
  mobileEmptyLocationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
});
