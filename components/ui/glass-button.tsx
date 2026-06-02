import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { designSystem } from '@/constants/design-system';
import { GlassView, isLiquidGlassAvailable } from '@/lib/glass-effect';

type GlassButtonProps = {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  width?: number;
  height?: number;
  accessibilityLabel?: string;
  disabled?: boolean;
  variant?: 'subtle' | 'primary';
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassButton({
  onPress,
  children,
  style,
  radius = designSystem.radii.pill,
  width = 48,
  height = 48,
  accessibilityLabel,
  disabled = false,
}: GlassButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const hasNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const backgroundColor = hasNativeGlass
    ? 'transparent'
    : isDark
      ? designSystem.colors.whiteOverlayThin
      : designSystem.colors.scrimFaint;

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, { borderRadius: radius, width, height }, style, animatedStyle]}
    >
      <GlassView
        glassEffectStyle="regular"
        isInteractive={!disabled}
        style={[styles.fill, { borderRadius: radius, backgroundColor }]}>
        <View style={styles.content}>{children}</View>
      </GlassView>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  fill: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
