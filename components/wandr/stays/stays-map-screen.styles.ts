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
  emptyNotice: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: designSystem.spacing.lg,
  },
  emptyNoticeText: {
    ...designSystem.type.bodySmallStrong,
  },
});
