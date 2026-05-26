import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  HANDSET_SHORT_SIDE: 600,
  TABLET: 768,
  DESKTOP: 1024,
};

const WEB_HYDRATION_VIEWPORT = {
  height: 844,
  width: 390,
};

export function useResponsive() {
  const { height, width } = useWindowDimensions();
  const [canUseBrowserViewport, setCanUseBrowserViewport] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      setCanUseBrowserViewport(true);
    }
  }, []);

  const shouldReadBrowserViewport =
    Platform.OS === 'web' && canUseBrowserViewport && typeof window !== 'undefined';
  const viewportWidth =
    shouldReadBrowserViewport
      ? window.visualViewport?.width ?? window.innerWidth
      : Platform.OS === 'web'
        ? WEB_HYDRATION_VIEWPORT.width
        : width;
  const viewportHeight =
    shouldReadBrowserViewport
      ? window.visualViewport?.height ?? window.innerHeight
      : Platform.OS === 'web'
        ? WEB_HYDRATION_VIEWPORT.height
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
