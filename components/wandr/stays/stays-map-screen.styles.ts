import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: designSystem.colors.mapSurface,
  },
  largeBody: {
    flex: 1,
    flexDirection: 'row',
  },
  mainColumn: {
    flexShrink: 0,
    flexGrow: 0,
    minWidth: 340,
    borderRightWidth: 1,
    zIndex: 10,
  },
  mainColumnTablet: {
    width: 360,
  },
  mainColumnDesktop: {
    width: 420,
  },
  mainColumnContent: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stayList: {
    gap: 0,
  },
  detailColumn: {
    flexShrink: 0,
    flexGrow: 0,
    borderRightWidth: 1,
    zIndex: 11,
  },
  detailColumnTablet: {
    width: 340,
  },
  detailColumnDesktop: {
    width: 430,
  },
  mapColumn: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  mapControlsOverlay: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  desktopSearchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  carouselWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    height: 214,
    overflow: 'visible',
  },
  carousel: {
    flex: 1,
    overflow: 'visible',
  },
  carouselContent: {
    alignItems: 'flex-end',
    overflow: 'visible',
  },
  cardShell: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
  },
  cardMotion: {
    width: '100%',
    overflow: 'visible',
  },
  cardInner: {
    width: '100%',
    overflow: 'visible',
  },
  emptyNoticeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 176,
    paddingHorizontal: 24,
    zIndex: 12,
  },
  emptyNotice: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyNoticeList: {
    minHeight: 156,
    padding: designSystem.spacing.sm,
    width: '100%',
  },
  emptyNoticeFloating: {
    minHeight: 152,
  },
  emptyNoticeGlassFill: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
  },
  emptyNoticeContent: {
    alignItems: 'stretch',
    gap: designSystem.spacing.sm,
    paddingHorizontal: designSystem.spacing.md,
    paddingVertical: designSystem.spacing.sm,
    position: 'relative',
    zIndex: 1,
    width: '100%',
  },
  emptyNoticeTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
  },
  emptyNoticeIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  emptyNoticeCopy: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  emptyNoticeTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'left',
  },
  emptyNoticeText: {
    ...designSystem.type.bodySmall,
    textAlign: 'left',
  },
  emptyNoticeActions: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
  },
  emptyNoticePrimaryAction: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: designSystem.radii.pill,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 16,
  },
  emptyNoticePrimaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
});
