import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

type SkeletonBlockProps = {
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { backgroundColor: isDark ? 'rgba(249,249,246,0.12)' : 'rgba(14,15,12,0.08)', opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: 16,
  },
});

