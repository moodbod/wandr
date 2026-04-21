import BottomSheet, { BottomSheetBackgroundProps, BottomSheetProps } from '@gorhom/bottom-sheet';
import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

const CustomBackground: React.FC<BottomSheetBackgroundProps> = ({
  style,
  animatedPosition,
}) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
        styles.sheetShadow,
        { backgroundColor: isDark ? designSystem.colors.darkSurface : designSystem.colors.surface },
        animatedStyle,
      ]}
    />
  );
};

export const GlassBottomSheet = forwardRef<BottomSheet, BottomSheetProps>((props, ref) => {
  return (
    <BottomSheet
      ref={ref}
      backgroundComponent={CustomBackground}
      handleComponent={null}
      enableContentPanningGesture
      enableHandlePanningGesture
      {...props}
    />
  );
});

GlassBottomSheet.displayName = 'GlassBottomSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: designSystem.radii.sheet,
    borderTopRightRadius: designSystem.radii.sheet,
  },
  handleIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
  },
  sheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
});
