import { LinearGradient } from 'expo-linear-gradient';
import { type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

export const largeScreenWorkspace = {
  gap: 12,
  inset: 12,
  sidebarWidth: 76,
  panelRadius: 32,
  mainColumnWidth: 390,
  mainColumnTabletWidth: 340,
  detailColumnWidth: 390,
  detailColumnTabletWidth: 340,
} as const;

type LargeScreenWorkspaceProps = PropsWithChildren<{
  mapContent?: ReactNode;
  mapControls?: ReactNode;
  mapControlsStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}>;

export function LargeScreenWorkspace({
  children,
  mapContent,
  mapControls,
  mapControlsStyle,
  style,
}: LargeScreenWorkspaceProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={[styles.body, style]}>
      <LinearGradient
        colors={
          isDark
            ? [designSystem.colors.darkBackground, designSystem.colors.darkSurface, designSystem.colors.darkBackground]
            : [designSystem.colors.background, designSystem.colors.limeMist, designSystem.colors.cream]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      {mapContent ? (
        <View style={styles.mapUnderlay}>
          {mapContent}
          {mapControls ? (
            <View pointerEvents="box-none" style={[styles.mapControlsOverlay, mapControlsStyle]}>
              {mapControls}
            </View>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

type LargeScreenPanelProps = PropsWithChildren<{
  kind: 'main' | 'detail';
  style?: StyleProp<ViewStyle>;
}>;

export function LargeScreenPanel({ children, kind, style }: LargeScreenPanelProps) {
  const isDark = useColorScheme() === 'dark';
  const { isTablet } = useResponsive();
  const widthStyle =
    kind === 'main'
      ? isTablet
        ? styles.mainColumnTablet
        : styles.mainColumnDesktop
      : isTablet
        ? styles.detailColumnTablet
        : styles.detailColumnDesktop;

  return (
    <View
      style={[
        styles.panel,
        widthStyle,
        {
          backgroundColor: isDark ? designSystem.colors.darkBackground : designSystem.colors.background,
          borderColor: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: largeScreenWorkspace.gap,
    paddingBottom: largeScreenWorkspace.inset,
    paddingLeft: largeScreenWorkspace.sidebarWidth,
    paddingRight: largeScreenWorkspace.inset,
    paddingTop: largeScreenWorkspace.inset,
    backgroundColor: designSystem.colors.background,
  },
  mapUnderlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: designSystem.colors.mapFallback,
    zIndex: 0,
  },
  mapControlsOverlay: {
    position: 'absolute',
    top: largeScreenWorkspace.inset,
    right: largeScreenWorkspace.inset,
    alignItems: 'center',
    zIndex: 5,
  },
  mapStageOverlay: {
    position: 'absolute',
    borderRadius: largeScreenWorkspace.panelRadius,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    bottom: largeScreenWorkspace.inset,
    overflow: 'hidden',
    right: largeScreenWorkspace.inset,
    top: largeScreenWorkspace.inset,
    zIndex: 20,
  },
  panel: {
    flexGrow: 0,
    flexShrink: 0,
    height: '100%',
    minWidth: 340,
    borderRadius: largeScreenWorkspace.panelRadius,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 10,
  },
  mainColumnTablet: {
    width: largeScreenWorkspace.mainColumnTabletWidth,
  },
  mainColumnDesktop: {
    width: largeScreenWorkspace.mainColumnWidth,
  },
  detailColumnTablet: {
    width: largeScreenWorkspace.detailColumnTabletWidth,
  },
  detailColumnDesktop: {
    width: largeScreenWorkspace.detailColumnWidth,
  },
});
