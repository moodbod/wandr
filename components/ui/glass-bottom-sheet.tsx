import BottomSheet, { BottomSheetBackgroundProps, BottomSheetProps } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

export function isNativeGlassBottomSheetAvailable() {
  return false;
}

export function getGlassBottomSheetBorderColor(isDark: boolean) {
  if (Platform.OS === 'android') {
    return isDark ? designSystem.colors.darkBorder : designSystem.colors.lightSurfaceAlt;
  }

  return isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft;
}

export function getGlassBottomSheetSurfaceColor(isDark: boolean, _shouldUseNativeGlass = isNativeGlassBottomSheetAvailable()) {
  return isDark ? designSystem.colors.darkPage : designSystem.colors.surfaceRaised;
}

type GlassBottomSheetSurfaceProps = {
  overlay?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GlassBottomSheetSurface({ style }: GlassBottomSheetSurfaceProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const surfaceColor = getGlassBottomSheetSurfaceColor(isDark);

  return <View pointerEvents="none" style={[style, { backgroundColor: surfaceColor }]} />;
}

const CustomBackground: React.FC<BottomSheetBackgroundProps> = ({
  style,
  animatedPosition,
}) => {
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const borderColor = getGlassBottomSheetBorderColor(isDark);

  const animatedStyle = useAnimatedStyle(() => {
    if (isLargeScreen) {
      return {
        borderRadius: designSystem.radii.sheet,
      };
    }

    const radius = interpolate(
      animatedPosition.value,
      [insets.top, insets.top + 40],
      [0, designSystem.radii.sheet],
      Extrapolation.CLAMP
    );

    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
    };
  });

  return (
    <Animated.View
      style={[
        style,
        styles.sheetClip,
        styles.sheetShadow,
        { backgroundColor: 'transparent', borderColor },
        isLargeScreen ? styles.popupBorder : styles.sheetBorder,
        animatedStyle,
      ]}
    >
      <GlassBottomSheetSurface style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
};

type GlassBottomSheetProps = BottomSheetProps & {
  desktopModalHostStyle?: StyleProp<ViewStyle>;
  desktopPopupHostStyle?: StyleProp<ViewStyle>;
  desktopBackdropStyle?: StyleProp<ViewStyle>;
  renderInModal?: boolean;
};

export const GlassBottomSheet = forwardRef<BottomSheet, GlassBottomSheetProps>((props, ref) => {
  const {
    backdropComponent,
    bottomInset,
    containerStyle,
    desktopModalHostStyle,
    desktopPopupHostStyle,
    desktopBackdropStyle,
    detached,
    enablePanDownToClose,
    index,
    renderInModal,
    snapPoints,
    style,
    topInset,
    onClose,
    ...bottomSheetProps
  } = props;
  const sheetRef = useRef<BottomSheet>(null);
  const { height, width } = useWindowDimensions();
  const { isLargeScreen } = useResponsive();
  const modalWidth = Math.min(390, Math.max(320, width * 0.24));
  const modalHeightRatio = getDesktopSnapRatio(snapPoints);
  const modalHeight = Math.min(height - 88, Math.max(240, height * modalHeightRatio));
  const [isMobileVisible, setIsMobileVisible] = useState(() => (typeof index === 'number' ? index >= 0 : true));
  const [mobileIndex, setMobileIndex] = useState(() => (typeof index === 'number' ? Math.max(index, 0) : 0));
  const [isDesktopVisible, setIsDesktopVisible] = useState(false);
  const [desktopIndex, setDesktopIndex] = useState(0);
  const pendingMobileCommandRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isLargeScreen) {
      setIsDesktopVisible(false);
      return;
    }

    const nextIndex = typeof index === 'number' ? index : -1;
    if (nextIndex >= 0) {
      setDesktopIndex(nextIndex);
      setIsDesktopVisible(true);
      return;
    }

    if (nextIndex === -1 && isDesktopVisible) {
      sheetRef.current?.close();
    }
  }, [index, isDesktopVisible, isLargeScreen]);

  useEffect(() => {
    if (isLargeScreen) {
      return;
    }

    if (typeof index !== 'number') {
      setMobileIndex(0);
      setIsMobileVisible(true);
      return;
    }

    if (index >= 0) {
      setMobileIndex(index);
      setIsMobileVisible(true);
      return;
    }

    setIsMobileVisible(false);
  }, [index, isLargeScreen]);

  useEffect(() => {
    if (!isLargeScreen || !isDesktopVisible) {
      return;
    }

    requestAnimationFrame(() => {
      sheetRef.current?.snapToIndex(0);
    });
  }, [desktopIndex, isDesktopVisible, isLargeScreen]);

  useEffect(() => {
    if (isLargeScreen || !isMobileVisible || !pendingMobileCommandRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      pendingMobileCommandRef.current?.();
      pendingMobileCommandRef.current = null;
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isLargeScreen, isMobileVisible, mobileIndex]);

  const closeDesktopSheet = useCallback(() => {
    sheetRef.current?.close();
  }, []);
  const closeMobileSheet = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  useImperativeHandle(ref, () => ({
    snapToIndex: (index, animationConfigs) => {
      if (isLargeScreen) {
        if (index < 0) {
          sheetRef.current?.close(animationConfigs);
          return;
        }

        setDesktopIndex(index);
        setIsDesktopVisible(true);
        requestAnimationFrame(() => {
          sheetRef.current?.snapToIndex(0, animationConfigs);
        });
        return;
      }

      if (index < 0) {
        sheetRef.current?.snapToIndex(index, animationConfigs);
        setIsMobileVisible(false);
        return;
      }

      setMobileIndex(index);
      pendingMobileCommandRef.current = () => {
        sheetRef.current?.snapToIndex(index, animationConfigs);
      };
      setIsMobileVisible(true);
    },
    snapToPosition: (position, animationConfigs) => {
      if (isLargeScreen) {
        setDesktopIndex(0);
        setIsDesktopVisible(true);
        requestAnimationFrame(() => {
          sheetRef.current?.snapToIndex(0, animationConfigs);
        });
        return;
      }

      pendingMobileCommandRef.current = () => {
        sheetRef.current?.snapToPosition(position, animationConfigs);
      };
      setIsMobileVisible(true);
    },
    expand: (animationConfigs) => {
      if (isLargeScreen) {
        setDesktopIndex(0);
        setIsDesktopVisible(true);
        requestAnimationFrame(() => {
          sheetRef.current?.snapToIndex(0, animationConfigs);
        });
        return;
      }

      pendingMobileCommandRef.current = () => {
        sheetRef.current?.expand(animationConfigs);
      };
      setIsMobileVisible(true);
    },
    collapse: (animationConfigs) => {
      if (isLargeScreen) {
        setDesktopIndex(0);
        setIsDesktopVisible(true);
        requestAnimationFrame(() => {
          sheetRef.current?.snapToIndex(0, animationConfigs);
        });
        return;
      }

      setMobileIndex(0);
      pendingMobileCommandRef.current = () => {
        sheetRef.current?.collapse(animationConfigs);
      };
      setIsMobileVisible(true);
    },
    close: (animationConfigs) => {
      if (isLargeScreen) {
        sheetRef.current?.close(animationConfigs);
        return;
      }

      sheetRef.current?.close(animationConfigs);
      setIsMobileVisible(false);
    },
    forceClose: (animationConfigs) => {
      if (isLargeScreen) {
        sheetRef.current?.forceClose(animationConfigs);
        return;
      }

      sheetRef.current?.forceClose(animationConfigs);
      setIsMobileVisible(false);
    },
  }) as BottomSheet, [isLargeScreen]);

  if (isLargeScreen) {
    if (!isDesktopVisible) {
      return null;
    }

    return (
      <Modal
        animationType="fade"
        onRequestClose={enablePanDownToClose === false ? undefined : closeDesktopSheet}
        transparent
        visible={isDesktopVisible}
      >
        <View style={[styles.modalHost, desktopModalHostStyle]}>
          {enablePanDownToClose === false ? (
            <View style={[styles.modalBackdrop, desktopBackdropStyle]} />
          ) : (
            <Pressable accessibilityRole="button" onPress={closeDesktopSheet} style={[styles.modalBackdrop, desktopBackdropStyle]} />
          )}
          <View style={[styles.popupHost, { width: modalWidth, height: modalHeight }, desktopPopupHostStyle]}>
            <BottomSheet
              {...bottomSheetProps}
              ref={sheetRef}
              backgroundComponent={CustomBackground}
              backdropComponent={undefined}
              handleComponent={null}
              enableContentPanningGesture={Platform.OS !== 'web'}
              enableHandlePanningGesture={false}
              detached={false}
              enablePanDownToClose={false}
              snapPoints={['100%']}
              index={0}
              onClose={() => {
                setIsDesktopVisible(false);
                onClose?.();
              }}
              style={[styles.popupSheet, style]}
              containerStyle={[styles.sheetContainer, styles.popupContainer, containerStyle]}
            />
          </View>
        </View>
      </Modal>
    );
  }

  if (!isMobileVisible) {
    return null;
  }

  if (renderInModal) {
    return (
      <Modal
        animationType="fade"
        hardwareAccelerated
        onRequestClose={enablePanDownToClose === false ? undefined : closeMobileSheet}
        statusBarTranslucent
        transparent
        visible={isMobileVisible}
      >
        <View style={styles.mobileModalHost}>
          <BottomSheet
            ref={sheetRef}
            backgroundComponent={CustomBackground}
            backdropComponent={backdropComponent}
            handleComponent={null}
            enableContentPanningGesture
            enableHandlePanningGesture
            detached={detached}
            bottomInset={bottomInset}
            topInset={topInset}
            enablePanDownToClose={enablePanDownToClose}
            index={mobileIndex}
            snapPoints={snapPoints}
            style={style}
            containerStyle={[styles.sheetContainer, containerStyle]}
            onClose={() => {
              setIsMobileVisible(false);
              onClose?.();
            }}
            {...bottomSheetProps}
          />
        </View>
      </Modal>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      backgroundComponent={CustomBackground}
      backdropComponent={backdropComponent}
      handleComponent={null}
      enableContentPanningGesture
      enableHandlePanningGesture
      detached={detached}
      bottomInset={bottomInset}
      topInset={topInset}
      enablePanDownToClose={enablePanDownToClose}
      index={mobileIndex}
      snapPoints={snapPoints}
      style={style}
      containerStyle={[styles.sheetContainer, containerStyle]}
      onClose={() => {
        setIsMobileVisible(false);
        onClose?.();
      }}
      {...bottomSheetProps}
    />
  );
});

GlassBottomSheet.displayName = 'GlassBottomSheet';

function getDesktopSnapRatio(snapPoints: BottomSheetProps['snapPoints']) {
  const fallback = 0.52;

  if (!Array.isArray(snapPoints)) {
    return fallback;
  }

  const firstPoint = snapPoints[0];
  if (typeof firstPoint === 'string') {
    const percentage = Number(firstPoint.replace('%', ''));
    return Number.isFinite(percentage) ? Math.min(0.62, Math.max(0.34, percentage / 100)) : fallback;
  }

  if (typeof firstPoint === 'number') {
    return Math.min(0.62, Math.max(0.34, firstPoint / 900));
  }

  return fallback;
}

const styles = StyleSheet.create({
  modalHost: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingBottom: 0,
    paddingLeft: 460,
    paddingRight: 24,
    paddingTop: 88,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  mobileModalHost: {
    flex: 1,
  },
  popupHost: {
    maxWidth: 390,
    maxHeight: '72%',
  },
  sheetContainer: {
    zIndex: 1000,
    elevation: 1000,
  },
  popupContainer: {
    alignItems: 'center',
  },
  popupSheet: {
    overflow: 'hidden',
    borderRadius: designSystem.radii.sheet,
  },
  sheetClip: {
    overflow: 'hidden',
  },
  sheetShadow: {
    boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
    elevation: 10,
  },
  sheetBorder: {
    borderTopWidth: 0,
  },
  popupBorder: {
    borderWidth: 1,
  },
});
