import { CornersIn } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

export function FullCallLayout({
  bottomInset,
  children,
  controls,
  onMinimize,
  subtitle,
  title,
  topInset,
}: {
  bottomInset: number;
  children: ReactNode;
  controls: ReactNode;
  onMinimize: () => void;
  subtitle: string;
  title: string;
  topInset: number;
}) {
  return (
    <View style={styles.fullOverlay}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(159,232,112,0.08)', 'rgba(5,8,5,0)', 'rgba(161,75,26,0.08)']}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.callHeader, { paddingTop: topInset + 18 }]}>
        <Pressable accessibilityRole="button" onPress={onMinimize} style={styles.roundHeaderButton}>
          <CornersIn color={designSystem.colors.darkTextWarm} size={23} weight="bold" />
        </Pressable>
        <View style={styles.callHeaderCopy}>
          <ThemedText style={styles.callTitle}>{title}</ThemedText>
          <ThemedText style={styles.callSubtitle}>{subtitle}</ThemedText>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.callStage}>{children}</View>
      <View style={[styles.controlDock, { paddingBottom: Math.max(bottomInset + 18, 28) }]}>{controls}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#050704',
  },
  callHeader: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  roundHeaderButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerSpacer: {
    width: 58,
    height: 58,
  },
  callHeaderCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 4,
  },
  callTitle: {
    textAlign: 'center',
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '600',
    color: 'rgba(249,249,246,0.9)',
  },
  callSubtitle: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: 'rgba(249,249,246,0.42)',
  },
  callStage: {
    flex: 1,
  },
  controlDock: {
    paddingHorizontal: 22,
  },
});
