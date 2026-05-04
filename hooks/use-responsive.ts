import { Platform, useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  HANDSET_SHORT_SIDE: 600,
  TABLET: 768,
  DESKTOP: 1024,
};

export function useResponsive() {
  const { height, width } = useWindowDimensions();
  const viewportWidth =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.visualViewport?.width ?? window.innerWidth
      : width;
  const viewportHeight =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.visualViewport?.height ?? window.innerHeight
      : height;
  const shortestSide = Math.min(viewportWidth, viewportHeight);

  const isMobile = viewportWidth < BREAKPOINTS.TABLET || shortestSide < BREAKPOINTS.HANDSET_SHORT_SIDE;
  const isTablet = !isMobile && viewportWidth < BREAKPOINTS.DESKTOP;
  const isDesktop = !isMobile && viewportWidth >= BREAKPOINTS.DESKTOP;
  const isLargeScreen = !isMobile && viewportWidth >= BREAKPOINTS.TABLET;

  return {
    height: viewportHeight,
    width: viewportWidth,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
  };
}
