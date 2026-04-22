import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { Platform, Pressable, StyleSheet, type ViewStyle, type StyleProp, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { designSystem } from '@/constants/design-system';

type GlassButtonProps = {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  width?: number;
  height?: number;
  accessibilityLabel?: string;
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
  variant = 'subtle',
}: GlassButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const isPrimary = variant === 'primary';
  const shouldUseNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const tintColor = isPrimary
    ? 'rgba(159, 232, 112, 0.28)'
    : isDark
      ? 'rgba(249, 249, 246, 0.08)'
      : 'rgba(255, 255, 255, 0.18)';

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container, 
        { borderRadius: radius, width, height }, 
        style, 
        animatedStyle
      ]}
    >
      <View style={[styles.fill, { borderRadius: radius }]}>
        {shouldUseNativeGlass ? (
          <>
            <GlassView
              style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
              glassEffectStyle={isPrimary ? 'regular' : 'clear'}
              tintColor={tintColor}
            />
            <View
              pointerEvents="none"
              style={[
                styles.nativeOverlay,
                {
                  borderRadius: radius,
                  backgroundColor: isPrimary ? 'rgba(159, 232, 112, 0.08)' : 'rgba(255,255,255,0.04)',
                  borderColor: isPrimary ? 'rgba(14,15,12,0.12)' : 'rgba(255,255,255,0.24)',
                },
              ]}
            />
          </>
        ) : (
          <View
            style={[
              styles.fallbackFill,
              {
                borderRadius: radius,
                backgroundColor: isPrimary
                  ? designSystem.colors.lime
                  : isDark
                    ? 'rgba(249,249,246,0.08)'
                    : 'rgba(22,51,0,0.08)',
                borderColor: isPrimary
                  ? 'rgba(14,15,12,0.12)'
                  : isDark
                    ? designSystem.colors.darkBorder
                    : 'rgba(14,15,12,0.12)',
              },
              Platform.OS === 'android' ? styles.androidFill : null,
            ]}
          />
        )}
        <View style={styles.content}>
          {children}
        </View>
      </View>
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
  fallbackFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nativeOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidFill: {
    overflow: 'hidden',
  },
});
