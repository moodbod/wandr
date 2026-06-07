import { BottomSheet, type SnapPoint } from '@expo/ui';
import { RNHostView } from '@expo/ui/swift-ui';
import {
  interactiveDismissDisabled,
  type PresentationBackgroundInteractionType,
} from '@expo/ui/swift-ui/modifiers';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
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
  enableDynamicSizing?: boolean;
  enablePanDownToClose?: boolean;
  index?: number;
  isOpen?: boolean;
  keyboardBehavior?: string;
  keyboardBlurBehavior?: string;
  android_keyboardInputMode?: string;
  onChange?: (index: number) => void;
  onClose?: () => void;
  renderInModal?: boolean;
  presentation?: 'modal' | 'inline';
  backgroundInteraction?: PresentationBackgroundInteractionType;
  showDragIndicator?: boolean;
  snapPoints?: readonly LegacySnapPoint[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  topInset?: number;
};

export const Sheet = forwardRef<SheetRef, SheetProps>(function Sheet(props, ref) {
  if (props.presentation === 'inline') {
    return <InlineSheet {...props} ref={ref} />;
  }

  return <NativeSheet {...props} ref={ref} />;
});

const InlineSheet = forwardRef<SheetRef, SheetProps>(function InlineSheet(
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
    testID,
    topInset,
  },
  ref
) {
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
});

const NativeSheet = forwardRef<SheetRef, SheetProps>(function NativeSheet(
  {
    children,
    enablePanDownToClose = true,
    index,
    isOpen,
    onChange,
    onClose,
    showDragIndicator = true,
    snapPoints,
    testID,
  },
  ref
) {
  const [isPresented, setIsPresented] = useState(() => getPresentedState(isOpen, index));
  const normalizedSnapPoints = useMemo(() => normalizeSnapPoints(snapPoints), [snapPoints]);
  const modifiers = useMemo(
    () => [interactiveDismissDisabled(!enablePanDownToClose)],
    [enablePanDownToClose]
  );

  useEffect(() => {
    if (isOpen !== undefined || index !== undefined) {
      return deferStateSync(() => setIsPresented(getPresentedState(isOpen, index)));
    }

    return undefined;
  }, [index, isOpen]);

  const dismiss = useCallback(() => {
    setIsPresented(false);
    onClose?.();
  }, [onClose]);

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
      modifiers={modifiers}
      onDismiss={dismiss}
      showDragIndicator={showDragIndicator}
      snapPoints={normalizedSnapPoints}
      testID={testID}>
      <RNHostView>
        <View style={styles.contentHost}>{children}</View>
      </RNHostView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  contentHost: {
    alignSelf: 'stretch',
    flex: 1,
    minWidth: '100%',
    width: '100%',
  },
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

function deferStateSync(update: () => void) {
  let isCancelled = false;
  const schedule = typeof queueMicrotask === 'function' ? queueMicrotask : (callback: () => void) => setTimeout(callback, 0);
  schedule(() => {
    if (!isCancelled) {
      update();
    }
  });

  return () => {
    isCancelled = true;
  };
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

    if (snapPoint === 'full' || snapPoint === 'large') {
      return 'full';
    }

    if (snapPoint === 'half' || snapPoint === 'medium') {
      return 'half';
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
