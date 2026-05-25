import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SkeletonBlockProps = {
  style?: StyleProp<ViewStyle>;
};

const USE_NATIVE_ANIMATED_DRIVER = Platform.OS !== 'web';

export function SkeletonBlock({ style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 900,
          useNativeDriver: USE_NATIVE_ANIMATED_DRIVER,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: USE_NATIVE_ANIMATED_DRIVER,
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
        { backgroundColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft, opacity },
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
