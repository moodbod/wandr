import { useMemo, useRef, type ReactNode } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet } from 'react-native';

export function DraggableMiniCall({
  bottomInset,
  children,
  onExpand,
}: {
  bottomInset: number;
  children: ReactNode;
  onExpand: () => void;
}) {
  const window = Dimensions.get('window');
  const initialPosition = { x: window.width - 118, y: window.height - bottomInset - 138 };
  const pan = useRef(new Animated.ValueXY(initialPosition)).current;
  const lastOffset = useRef(initialPosition);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          pan.setOffset(lastOffset.current);
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, gesture) => {
          pan.flattenOffset();
          const nextX = Math.min(Math.max(lastOffset.current.x + gesture.dx, 12), window.width - 108);
          const nextY = Math.min(Math.max(lastOffset.current.y + gesture.dy, 72), window.height - bottomInset - 108);
          lastOffset.current = { x: nextX, y: nextY };
          Animated.spring(pan, {
            toValue: lastOffset.current,
            useNativeDriver: false,
            speed: 20,
            bounciness: 6,
          }).start();
        },
      }),
    [bottomInset, pan, window.height, window.width]
  );

  return (
    <Animated.View style={[styles.miniCallWrap, pan.getLayout()]} {...panResponder.panHandlers}>
      <Pressable accessibilityRole="button" onPress={onExpand} style={styles.miniCallPressable}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  miniCallWrap: {
    position: 'absolute',
    zIndex: 1001,
    width: 96,
    height: 112,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  miniCallPressable: {
    flex: 1,
  },
});
