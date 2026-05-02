import BottomSheet, { BottomSheetBackgroundProps, BottomSheetProps } from '@gorhom/bottom-sheet';
import { BlurView, type BlurTint } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import React, { forwardRef } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const GLASS_BOTTOM_SHEET_BLUR_INTENSITY = 82;

export function getGlassBottomSheetTint(isDark: boolean): BlurTint {
  return isDark ? 'dark' : 'light';
}

export function isNativeGlassBottomSheetAvailable() {
  return Platform.OS === 'ios' && isLiquidGlassAvailable();
}

export function getGlassBottomSheetBorderColor(isDark: boolean) {
  return isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft;
}

export function getGlassBottomSheetSurfaceColor(isDark: boolean, shouldUseNativeGlass = isNativeGlassBottomSheetAvailable()) {
  if (shouldUseNativeGlass) {
    return isDark ? designSystem.colors.darkOliveGlassSoft : designSystem.colors.whiteGlassStrong;
  }

  return isDark ? designSystem.colors.darkOliveGlass : designSystem.colors.whiteGlassMax;
}

type GlassBottomSheetSurfaceProps = {
  overlay?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GlassBottomSheetSurface({ overlay = false, style }: GlassBottomSheetSurfaceProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const shouldUseNativeGlass = isNativeGlassBottomSheetAvailable();
  const tint = getGlassBottomSheetTint(isDark);
  const nativeTintColor = isDark
    ? designSystem.colors.nativeDarkTint
    : designSystem.colors.whiteOverlaySoft;

  return (
    <View pointerEvents="none" style={style}>
      {shouldUseNativeGlass ? (
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle="regular"
          tintColor={nativeTintColor}
        />
      ) : (
        <BlurView intensity={GLASS_BOTTOM_SHEET_BLUR_INTENSITY} tint={tint} style={StyleSheet.absoluteFill} />
      )}
      {overlay ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: getGlassBottomSheetSurfaceColor(isDark, shouldUseNativeGlass) },
          ]}
        />
      ) : null}
    </View>
  );
}

const CustomBackground: React.FC<BottomSheetBackgroundProps> = ({
  style,
  animatedPosition,
}) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const borderColor = getGlassBottomSheetBorderColor(isDark);

  const animatedStyle = useAnimatedStyle(() => {
    // When the sheet hits the top of the screen (or top inset), the border radius drops to 0.
    // As it slides down 40px below the top, the border radius animates to the full sheet radius.
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
        styles.sheetBorder,
        animatedStyle,
      ]}
    >
      <GlassBottomSheetSurface style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
};

export const GlassBottomSheet = forwardRef<BottomSheet, BottomSheetProps>((props, ref) => {
  const { containerStyle, ...bottomSheetProps } = props;

  return (
    <BottomSheet
      ref={ref}
      backgroundComponent={CustomBackground}
      handleComponent={null}
      enableContentPanningGesture
      enableHandlePanningGesture
      containerStyle={[styles.sheetContainer, containerStyle]}
      {...bottomSheetProps}
    />
  );
});

GlassBottomSheet.displayName = 'GlassBottomSheet';

const styles = StyleSheet.create({
  sheetContainer: {
    zIndex: 1000,
    elevation: 1000,
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
});
