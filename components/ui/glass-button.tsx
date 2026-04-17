import { BlurView, type BlurTint } from 'expo-blur';
import React from 'react';
import { Pressable, StyleSheet, type ViewStyle, type StyleProp, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { designSystem } from '@/constants/design-system';

type GlassButtonProps = {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: BlurTint;
  radius?: number;
  width?: number;
  height?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassButton({
  onPress,
  children,
  style,
  intensity = 80,
  tint,
  radius = designSystem.radii.pill,
  width = 46,
  height = 46,
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
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const resolvedTint = tint || (isDark ? 'dark' : 'light');

  return (
    <AnimatedPressable
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
      <BlurView
        intensity={intensity}
        tint={resolvedTint}
        style={[styles.blur, { borderRadius: radius }]}
      >
        <View style={[styles.innerHighlight, { borderRadius: radius }]}>
          {children}
        </View>
      </BlurView>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  blur: {
    flex: 1,
    overflow: 'hidden',
  },
  innerHighlight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.4)', // Subtle glass highlight
    borderTopColor: 'rgba(255, 255, 255, 0.6)', // Extra light on top edge
    borderLeftColor: 'rgba(255, 255, 255, 0.5)', // Extra light on left edge
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Very faint milky fill
  },
});