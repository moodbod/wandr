import React, { useMemo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  BackdropFilter,
  Canvas,
  Fill,
  RuntimeShader,
  Skia,
  vec,
} from '@shopify/react-native-skia';

type ProgressiveBlurDirection = 'top' | 'bottom' | 'left' | 'right';

type ProgressiveBlurViewProps = {
  height?: number;
  intensity?: number;
  direction?: ProgressiveBlurDirection;
  style?: StyleProp<ViewStyle>;
};

const progressiveBlurShader = Skia.RuntimeEffect.Make(`
uniform shader image;

uniform float2 direction;
uniform float2 size;
uniform float edge;
uniform float maxSigma;

float Gaussian(float x, float sigma) {
  return exp(-(x * x) / (2.0 * sigma * sigma)) / (2.0 * 3.14159 * sigma * sigma);
}

float blurAmount(vec2 uv) {
  float amount = 0.0;

  if (edge < 0.5) {
    amount = 1.0 - smoothstep(0.0, 1.0, clamp(uv.y / size.y, 0.0, 1.0));
  } else if (edge < 1.5) {
    amount = smoothstep(0.0, 1.0, clamp(uv.y / size.y, 0.0, 1.0));
  } else if (edge < 2.5) {
    amount = 1.0 - smoothstep(0.0, 1.0, clamp(uv.x / size.x, 0.0, 1.0));
  } else {
    amount = smoothstep(0.0, 1.0, clamp(uv.x / size.x, 0.0, 1.0));
  }

  return amount;
}

vec3 blur(vec2 uv, vec2 axis, float sigma) {
  vec3 result = vec3(0.0);
  float totalWeight = 0.0;
  float window = sigma * 1.5;

  for (float i = -30.0; i <= 30.0; i++) {
    if (abs(i) > window) {
      continue;
    }

    float weight = Gaussian(i, sigma);
    vec3 sample = image.eval(uv + axis * i).rgb;

    result += sample * weight;
    totalWeight += weight;
  }

  if (totalWeight > 0.0) {
    result /= totalWeight;
  }

  return result;
}

vec4 main(vec2 fragCoord) {
  float amount = blurAmount(fragCoord);

  if (amount <= 0.001) {
    return image.eval(fragCoord);
  }

  float sigma = mix(0.1, maxSigma, amount);
  vec3 color = blur(fragCoord, direction, sigma);
  return vec4(color, 1.0);
}
`);

if (!progressiveBlurShader) {
  throw new Error('Failed to compile progressive blur shader.');
}

const BLUR_SHADER = progressiveBlurShader;

const EDGE_INDEX: Record<ProgressiveBlurDirection, number> = {
  top: 0,
  bottom: 1,
  left: 2,
  right: 3,
};

export function ProgressiveBlurView({
  style,
  height = 100,
  intensity = 24,
  direction = 'top',
}: ProgressiveBlurViewProps) {
  const width = 1;
  const edge = EDGE_INDEX[direction];
  const maxSigma = Math.max(1, Math.min(30, intensity / 2));

  const uniforms = useMemo(
    () => ({
      size: vec(width, height),
      edge,
      maxSigma,
    }),
    [edge, height, maxSigma]
  );

  return (
    <Canvas pointerEvents="none" style={[styles.canvas, style, { height }]}>
      <BackdropFilter
        clip={{ x: 0, y: 0, width: 10_000, height }}
        filter={
          <RuntimeShader source={BLUR_SHADER} uniforms={{ ...uniforms, direction: vec(1, 0) }}>
            <RuntimeShader source={BLUR_SHADER} uniforms={{ ...uniforms, direction: vec(0, 1) }} />
          </RuntimeShader>
        }
      >
        <Fill color="rgba(255, 255, 255, 0.001)" />
      </BackdropFilter>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
  },
});
