// Stub — expo-glass-effect requires a custom build (not Expo Go compatible).
// All call sites already have non-glass fallbacks guarded by isLiquidGlassAvailable().
import React from 'react';
import { View, type ViewProps } from 'react-native';

export const isLiquidGlassAvailable = () => false;

// Accepts and silently drops glass-specific props (glassEffectStyle, tintColor, isInteractive)
// so call sites work without modification.
export const GlassView = React.forwardRef<View, ViewProps & Record<string, unknown>>(
  ({ glassEffectStyle: _a, tintColor: _b, isInteractive: _c, ...rest }, ref) =>
    React.createElement(View, { ref, ...rest })
);
