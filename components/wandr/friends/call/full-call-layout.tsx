import { CornersIn, UsersThree } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
      <View style={[styles.callHeader, { paddingTop: topInset + 18 }]}>
        <Pressable accessibilityRole="button" onPress={onMinimize} style={styles.roundHeaderButton}>
          <CornersIn color={designSystem.colors.white} size={28} weight="bold" />
        </Pressable>
        <View style={styles.callHeaderCopy}>
          <ThemedText style={styles.callTitle}>{title}</ThemedText>
          <ThemedText style={styles.callSubtitle}>{subtitle}</ThemedText>
        </View>
        <Pressable accessibilityRole="button" style={styles.roundHeaderButton}>
          <UsersThree color={designSystem.colors.white} size={28} weight="bold" />
        </Pressable>
      </View>
      <View style={styles.callStage}>{children}</View>
      <View style={{ paddingBottom: Math.max(bottomInset + 18, 28) }}>{controls}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#050505',
  },
  callHeader: {
    paddingHorizontal: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  roundHeaderButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
  },
  callHeaderCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
  },
  callTitle: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '700',
    color: designSystem.colors.white,
  },
  callSubtitle: {
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '500',
    color: '#969696',
  },
  callStage: {
    flex: 1,
  },
});
