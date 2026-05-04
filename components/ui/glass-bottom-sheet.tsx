import BottomSheet, { BottomSheetBackgroundProps, BottomSheetProps } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
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

export const GlassBottomSheet = forwardRef<BottomSheet, BottomSheetProps>((props, ref) => {
  const {
    backdropComponent,
    bottomInset,
    containerStyle,
    detached,
    enablePanDownToClose,
    index,
    snapPoints,
    style,
    topInset,
    onClose,
    ...bottomSheetProps
  } = props;
  const sheetRef = useRef<BottomSheet>(null);
  const { height, width } = useWindowDimensions();
  const { isLargeScreen } = useResponsive();
  const modalWidth = Math.min(560, Math.max(380, width * 0.34));
  const modalHeightRatio = getDesktopSnapRatio(snapPoints);
  const modalHeight = Math.min(height - 120, Math.max(340, height * modalHeightRatio));
  const [isDesktopVisible, setIsDesktopVisible] = useState(() => {
    const initialIndex = typeof index === 'number' ? index : -1;
    return isLargeScreen && initialIndex >= 0;
  });
  const [desktopIndex, setDesktopIndex] = useState(() => {
    const initialIndex = typeof index === 'number' ? index : 0;
    return initialIndex >= 0 ? initialIndex : 0;
  });

  useEffect(() => {
    if (!isLargeScreen) {
      return;
    }

    const nextIndex = typeof index === 'number' ? index : -1;
    if (nextIndex >= 0) {
      setDesktopIndex(nextIndex);
      setIsDesktopVisible(true);
      return;
    }

    if (nextIndex === -1) {
      setIsDesktopVisible(false);
    }
  }, [index, isLargeScreen]);

  useEffect(() => {
    if (!isLargeScreen || !isDesktopVisible) {
      return;
    }

    requestAnimationFrame(() => {
      sheetRef.current?.snapToIndex(0);
    });
  }, [desktopIndex, isDesktopVisible, isLargeScreen]);

  const closeDesktopSheet = useCallback(() => {
    sheetRef.current?.close();
    setIsDesktopVisible(false);
  }, []);

  useImperativeHandle(ref, () => ({
    snapToIndex: (index, animationConfigs) => {
      if (isLargeScreen) {
        setDesktopIndex(index);
        setIsDesktopVisible(index >= 0);
        requestAnimationFrame(() => {
          sheetRef.current?.snapToIndex(0, animationConfigs);
        });
        return;
      }

      sheetRef.current?.snapToIndex(index, animationConfigs);
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

      sheetRef.current?.snapToPosition(position, animationConfigs);
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

      sheetRef.current?.expand(animationConfigs);
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

      sheetRef.current?.collapse(animationConfigs);
    },
    close: (animationConfigs) => {
      if (isLargeScreen) {
        sheetRef.current?.close(animationConfigs);
        setIsDesktopVisible(false);
        return;
      }

      sheetRef.current?.close(animationConfigs);
    },
    forceClose: (animationConfigs) => {
      if (isLargeScreen) {
        sheetRef.current?.forceClose(animationConfigs);
        setIsDesktopVisible(false);
        return;
      }

      sheetRef.current?.forceClose(animationConfigs);
    },
  }) as BottomSheet, [isLargeScreen]);

  if (isLargeScreen) {
    return (
      <Modal
        animationType="fade"
        onRequestClose={enablePanDownToClose === false ? undefined : closeDesktopSheet}
        transparent
        visible={isDesktopVisible}
      >
        <View style={styles.modalHost}>
          {enablePanDownToClose === false ? null : (
            <Pressable accessibilityRole="button" onPress={closeDesktopSheet} style={styles.modalBackdrop} />
          )}
          <View style={[styles.popupHost, { width: modalWidth, height: modalHeight }]}>
            <BottomSheet
              {...bottomSheetProps}
              ref={sheetRef}
              backgroundComponent={CustomBackground}
              backdropComponent={undefined}
              handleComponent={null}
              enableContentPanningGesture
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
      index={index}
      snapPoints={snapPoints}
      style={style}
      containerStyle={[styles.sheetContainer, containerStyle]}
      onClose={onClose}
      {...bottomSheetProps}
    />
  );
});

GlassBottomSheet.displayName = 'GlassBottomSheet';

function getDesktopSnapRatio(snapPoints: BottomSheetProps['snapPoints']) {
  const fallback = 0.58;

  if (!Array.isArray(snapPoints)) {
    return fallback;
  }

  const firstPoint = snapPoints[0];
  if (typeof firstPoint === 'string') {
    const percentage = Number(firstPoint.replace('%', ''));
    return Number.isFinite(percentage) ? Math.min(0.72, Math.max(0.38, percentage / 100)) : fallback;
  }

  if (typeof firstPoint === 'number') {
    return Math.min(0.72, Math.max(0.38, firstPoint / 900));
  }

  return fallback;
}

const styles = StyleSheet.create({
  modalHost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  popupHost: {
    maxWidth: '92%',
    maxHeight: '82%',
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
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetBorder: {
    borderTopWidth: 1,
  },
  popupBorder: {
    borderWidth: 1,
  },
});
