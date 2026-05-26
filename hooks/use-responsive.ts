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

function getBrowserViewport() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

  if (viewportWidth > 0 && viewportHeight > 0) {
    return {
      height: viewportHeight,
      width: viewportWidth,
    };
  }

  if (window.innerWidth > 0 && window.innerHeight > 0) {
    return {
      height: window.innerHeight,
      width: window.innerWidth,
    };
  }

  return null;
}

export function useResponsive() {
  const { height, width } = useWindowDimensions();
  const [browserViewport, setBrowserViewport] = useState(() => getBrowserViewport());

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const updateViewport = () => {
      setBrowserViewport(getBrowserViewport());
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
    };
  }, []);

  const viewportWidth =
    Platform.OS === 'web'
      ? browserViewport?.width ?? WEB_HYDRATION_VIEWPORT.width
      : width;
  const viewportHeight =
    Platform.OS === 'web'
      ? browserViewport?.height ?? WEB_HYDRATION_VIEWPORT.height
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
