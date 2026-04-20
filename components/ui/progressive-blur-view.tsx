import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView, BlurViewProps } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

type ProgressiveBlurViewProps = BlurViewProps & {
  height?: number;
};

export function ProgressiveBlurView({ style, height = 100, ...props }: ProgressiveBlurViewProps) {
  return (
    <View style={[style, { height }]} pointerEvents="none">
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={['#FFFFFF', '#FFFFFF', 'rgba(255,255,255,0)']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        <BlurView style={StyleSheet.absoluteFill} {...props} />
      </MaskedView>
    </View>
  );
}
