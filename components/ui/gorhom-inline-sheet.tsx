import BottomSheet from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { createContext, forwardRef, useContext, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';

/**
 * Inline (over-content) bottom sheet backed by `@gorhom/bottom-sheet`.
 *
 * The explore screen needs a sheet that grows on drag-up and lets its content
 * scroll once expanded, sitting over a full-screen map. A native sheet can't do
 * that, and hand-rolling the gesture/scroll coordination was fragile — gorhom
 * solves exactly this. This component adapts gorhom to the app's `Sheet` API so
 * callers don't change.
 */
export type GorhomInlineSheetRef = {
  close: () => void;
  collapse: () => void;
  expand: () => void;
  forceClose: () => void;
  snapToIndex: (index: number) => void;
  snapToPosition: (position: number | string) => void;
};

type GorhomInlineSheetProps = {
  animatedIndex?: unknown;
  bottomInset?: number;
  children?: React.ReactNode;
  enablePanDownToClose?: boolean;
  index?: number;
  isOpen?: boolean;
  onChange?: (index: number) => void;
  onClose?: () => void;
  showDragIndicator?: boolean;
  snapPoints?: readonly (string | number)[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  topInset?: number;
};

// Lets `SheetScrollView` / `SheetFlatList` pick gorhom's scrollables (which wire
// into the sheet's gesture) when rendered inside this sheet.
const GorhomSheetContext = createContext(false);

export function useIsInsideGorhomSheet() {
  return useContext(GorhomSheetContext);
}

const DEFAULT_SNAP_POINTS: (string | number)[] = ['40%', '85%'];

export const GorhomInlineSheet = forwardRef<GorhomInlineSheetRef, GorhomInlineSheetProps>(function GorhomInlineSheet(
  {
    animatedIndex,
    bottomInset,
    children,
    enablePanDownToClose = true,
    index,
    isOpen,
    onChange,
    onClose,
    showDragIndicator = true,
    snapPoints,
    style,
    testID: _testID,
    topInset,
  },
  ref
) {
  const sheetRef = useRef<BottomSheetMethods>(null);

  const resolvedSnapPoints = useMemo(
    () => (snapPoints && snapPoints.length > 0 ? [...snapPoints] : DEFAULT_SNAP_POINTS),
    [snapPoints]
  );

  // Controlled index derived from `isOpen` + `index`; gorhom animates to it reactively
  // (and preserves the user's own drags between prop changes).
  const resolvedIndex = isOpen === false ? -1 : index ?? 0;

  const externalAnimatedIndex =
    animatedIndex && typeof animatedIndex === 'object' && 'value' in animatedIndex
      ? (animatedIndex as SharedValue<number>)
      : undefined;

  // gorhom owns the sheet's positioning/animation, so keep caller positioning on
  // the sheet itself and only mirror fallback surface styles onto the content host.
  const flatStyle = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const clipStyle: ViewStyle = {
    flex: 1,
    backgroundColor: flatStyle.backgroundColor,
  };
  const topLeftRadius =
    typeof flatStyle.borderTopLeftRadius === 'number'
      ? flatStyle.borderTopLeftRadius
      : typeof flatStyle.borderRadius === 'number'
        ? flatStyle.borderRadius
        : undefined;
  const topRightRadius =
    typeof flatStyle.borderTopRightRadius === 'number'
      ? flatStyle.borderTopRightRadius
      : typeof flatStyle.borderRadius === 'number'
        ? flatStyle.borderRadius
        : undefined;

  if (topLeftRadius !== undefined || topRightRadius !== undefined) {
    clipStyle.overflow = 'hidden';
    clipStyle.borderTopLeftRadius = topLeftRadius ?? 0;
    clipStyle.borderTopRightRadius = topRightRadius ?? 0;
  }

  useImperativeHandle(
    ref,
    () => ({
      close: () => sheetRef.current?.close(),
      collapse: () => sheetRef.current?.collapse(),
      expand: () => sheetRef.current?.expand(),
      forceClose: () => sheetRef.current?.forceClose(),
      snapToIndex: (nextIndex: number) => {
        if (nextIndex < 0) {
          sheetRef.current?.close();
          return;
        }
        sheetRef.current?.snapToIndex(nextIndex);
      },
      snapToPosition: (position: number | string) => sheetRef.current?.snapToPosition(position),
    }),
    []
  );

  return (
    <GorhomSheetContext.Provider value={true}>
      <BottomSheet
        ref={sheetRef}
        index={resolvedIndex}
        snapPoints={resolvedSnapPoints}
        enablePanDownToClose={enablePanDownToClose}
        enableDynamicSizing={false}
        animatedIndex={externalAnimatedIndex}
        topInset={topInset}
        bottomInset={bottomInset}
        // The explore sheet provides its own glass/styled background via children.
        handleComponent={showDragIndicator ? undefined : null}
        backgroundComponent={null}
        style={style}
        onChange={(nextIndex) => {
          if (nextIndex < 0) {
            onClose?.();
            return;
          }
          onChange?.(nextIndex);
        }}
        accessible={false}>
        <View style={clipStyle}>{children}</View>
      </BottomSheet>
    </GorhomSheetContext.Provider>
  );
});
