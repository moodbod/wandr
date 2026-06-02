import { BottomSheet, type SnapPoint } from '@expo/ui';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  View,
  type FlatListProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Input } from '@/components/ui/input';
import { GorhomInlineSheet, useIsInsideGorhomSheet } from '@/components/ui/gorhom-inline-sheet';

export type SheetRef = {
  close: () => void;
  collapse: () => void;
  expand: () => void;
  forceClose: () => void;
  snapToIndex: (index: number) => void;
  snapToPosition: (position: number | string) => void;
};

type LegacySnapPoint = SnapPoint | string | number;

export type SheetProps = {
  animatedIndex?: unknown;
  backgroundStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
  children?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  desktopBackdropStyle?: StyleProp<ViewStyle>;
  desktopModalHostStyle?: StyleProp<ViewStyle>;
  desktopPopupHostStyle?: StyleProp<ViewStyle>;
  detached?: boolean;
  enablePanDownToClose?: boolean;
  enableDynamicSizing?: boolean;
  index?: number;
  isOpen?: boolean;
  keyboardBehavior?: string;
  keyboardBlurBehavior?: string;
  android_keyboardInputMode?: string;
  onChange?: (index: number) => void;
  onClose?: () => void;
  renderInModal?: boolean;
  presentation?: 'modal' | 'inline';
  backgroundInteraction?: unknown;
  showDragIndicator?: boolean;
  snapPoints?: readonly LegacySnapPoint[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  topInset?: number;
};

export const Sheet = forwardRef<SheetRef, SheetProps>(function Sheet(
  {
    animatedIndex,
    bottomInset,
    children,
    enablePanDownToClose = true,
    index,
    isOpen,
    onChange,
    onClose,
    presentation = 'modal',
    showDragIndicator = true,
    snapPoints,
    style,
    testID,
    topInset,
  },
  ref
) {
  if (presentation === 'inline') {
    return (
      <GorhomInlineSheet
        animatedIndex={animatedIndex}
        bottomInset={bottomInset}
        enablePanDownToClose={enablePanDownToClose}
        index={index}
        isOpen={isOpen}
        onChange={onChange}
        onClose={onClose}
        ref={ref}
        showDragIndicator={showDragIndicator}
        snapPoints={snapPoints as readonly (string | number)[] | undefined}
        style={style}
        testID={testID}
        topInset={topInset}>
        {children}
      </GorhomInlineSheet>
    );
  }

  const [isPresented, setIsPresented] = useState(() => getPresentedState(isOpen, index));
  const normalizedSnapPoints = useMemo(() => normalizeSnapPoints(snapPoints), [snapPoints]);

  useEffect(() => {
    if (isOpen !== undefined || index !== undefined) {
      setIsPresented(getPresentedState(isOpen, index));
    }
  }, [index, isOpen]);

  const dismiss = () => {
    setIsPresented(false);
    onClose?.();
  };

  useImperativeHandle(
    ref,
    () => ({
      close: dismiss,
      collapse: () => {
        setIsPresented(true);
        onChange?.(0);
      },
      expand: () => {
        setIsPresented(true);
        onChange?.(0);
      },
      forceClose: dismiss,
      snapToIndex: (nextIndex: number) => {
        if (nextIndex < 0) {
          dismiss();
          return;
        }

        setIsPresented(true);
        onChange?.(nextIndex);
      },
      snapToPosition: () => {
        setIsPresented(true);
        onChange?.(0);
      },
    }),
    [dismiss, onChange]
  );

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={dismiss}
      showDragIndicator={showDragIndicator}
      snapPoints={normalizedSnapPoints}
      testID={testID}>
      <View pointerEvents={enablePanDownToClose ? 'auto' : 'box-none'}>{children}</View>
    </BottomSheet>
  );
});

export function SheetView(props: ViewProps) {
  return <View {...props} />;
}

export function SheetScrollView(props: ScrollViewProps) {
  const insideGorhomSheet = useIsInsideGorhomSheet();

  // Inside the inline (gorhom) sheet, use gorhom's scroll view so scrolling and the
  // sheet's drag-to-expand/collapse coordinate natively.
  if (insideGorhomSheet) {
    return <BottomSheetScrollView {...(props as React.ComponentProps<typeof BottomSheetScrollView>)} />;
  }

  return <ScrollView {...props} />;
}

export function SheetTextInput(props: TextInputProps) {
  const { style, ...inputProps } = props;

  return <Input {...inputProps} containerStyle={style as StyleProp<ViewStyle>} />;
}

export function SheetFlatList<ItemT>(props: FlatListProps<ItemT>) {
  const insideGorhomSheet = useIsInsideGorhomSheet();

  if (insideGorhomSheet) {
    return <BottomSheetFlatList {...(props as React.ComponentProps<typeof BottomSheetFlatList>)} />;
  }

  return <FlatList {...props} />;
}

function getPresentedState(isOpen?: boolean, index?: number) {
  if (isOpen !== undefined) {
    return isOpen;
  }

  if (index !== undefined) {
    return index >= 0;
  }

  return false;
}

function normalizeSnapPoints(snapPoints?: readonly LegacySnapPoint[]): SnapPoint[] | undefined {
  if (!snapPoints?.length) {
    return undefined;
  }

  return snapPoints.map((snapPoint) => {
    if (typeof snapPoint === 'number') {
      return { height: snapPoint };
    }

    if (typeof snapPoint !== 'string') {
      return snapPoint;
    }

    if (snapPoint === 'half' || snapPoint === 'full') {
      return snapPoint;
    }

    if (snapPoint.endsWith('%')) {
      const percent = Number(snapPoint.slice(0, -1));
      if (Number.isFinite(percent)) {
        return percent >= 100 ? 'full' : { fraction: Math.max(0.1, Math.min(1, percent / 100)) };
      }
    }

    return 'half';
  });
}
