import BottomSheet, { BottomSheetProps } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const GlassBottomSheet = forwardRef<BottomSheet, BottomSheetProps>((props, ref) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <BottomSheet
      ref={ref}
      backgroundComponent={(bgProps) => (
        <BlurView
          {...bgProps}
          tint={isDark ? 'dark' : 'light'}
          intensity={80}
          style={[
            bgProps.style,
            styles.sheetBackground,
            { backgroundColor: isDark ? 'rgba(84, 84, 84, 0.5)' : 'rgba(255,255,255,0.5)' }
          ]}
        />
      )}
      enableContentPanningGesture
      enableHandlePanningGesture
      handleComponent={null}
      {...props}
    />
  );
});

GlassBottomSheet.displayName = 'GlassBottomSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: designSystem.radii.sheet,
    borderTopRightRadius: designSystem.radii.sheet,
    overflow: 'hidden',
  },
});
