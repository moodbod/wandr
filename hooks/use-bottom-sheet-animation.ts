import { useMemo } from 'react';
import { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

/**
 * Shared animation state for map screens that sync their header padding
 * with a bottom sheet's snap position. Pass animatedIndex to BottomSheet.
 */
export function useBottomSheetAnimation({
  topInset,
  snapPoints: snapPointsProp = ['34%', '64%', '100%'],
}: {
  topInset: number;
  snapPoints?: string[];
}) {
  const animatedIndex = useSharedValue(0);
  const snapPoints = useMemo(() => snapPointsProp, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(animatedIndex.value, [1, 2], [0, topInset], 'clamp'),
  }));

  return { animatedIndex, headerAnimatedStyle, snapPoints };
}
