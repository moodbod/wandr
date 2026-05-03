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
    if (disabled) {
      return;
    }
    scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const isPrimary = variant === 'primary';
  const shouldUseNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const isAndroid = Platform.OS === 'android';
  const tintColor = isPrimary ? designSystem.colors.limeSoft : designSystem.colors.transparentWhite;
  const surfaceColor = isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.whiteOverlayFaint;
  const borderColor = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft;
  const androidSurfaceColor = isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised;
  const androidDisabledSurfaceColor = isDark ? designSystem.colors.darkCard : designSystem.colors.surface;
  const androidBorderColor = isDark ? designSystem.colors.darkBorder : designSystem.colors.lightSurfaceAlt;
  const fallbackSurfaceColor = isAndroid ? androidSurfaceColor : surfaceColor;
  const fallbackBorderColor = isAndroid ? androidBorderColor : borderColor;

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
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
                  backgroundColor: isPrimary ? designSystem.colors.limeSoft : surfaceColor,
                  borderColor: isPrimary ? designSystem.colors.border : borderColor,
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
                  ? (disabled && isAndroid ? androidDisabledSurfaceColor : designSystem.colors.lime)
                  : (disabled && isAndroid ? androidDisabledSurfaceColor : fallbackSurfaceColor),
                borderColor: isPrimary
                  ? (isAndroid ? designSystem.colors.darkGreen : designSystem.colors.border)
                  : fallbackBorderColor,
              },
              isAndroid ? styles.androidFill : null,
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
