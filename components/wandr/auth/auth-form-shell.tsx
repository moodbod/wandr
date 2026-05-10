import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { AUTH_LAYOUT, type AuthPalette } from './auth-palette';

type AuthFormShellProps = {
  children: ReactNode;
  footer: ReactNode;
  palette: AuthPalette;
  subtitle: string;
  title: string;
  onBack?: () => void;
  scrollMode?: 'default' | 'bottomSheet';
  showBackButton?: boolean;
};

export function AuthFormShell({
  children,
  footer,
  onBack,
  palette,
  scrollMode = 'default',
  showBackButton = true,
  subtitle,
  title,
}: AuthFormShellProps) {
  const router = useRouter();
  const { isLargeScreen } = useResponsive();
  const useDesktopScroll = scrollMode === 'bottomSheet' && Platform.OS === 'web' && isLargeScreen;
  const ScrollContainer = scrollMode === 'bottomSheet' && !useDesktopScroll ? BottomSheetScrollView : ScrollView;

  return (
    <View style={styles.frame}>
      {showBackButton ? (
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={onBack ?? (() => router.back())}
            style={[styles.backButton, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <MaterialCommunityIcons color={palette.primaryText} name="arrow-left" size={24} />
          </Pressable>
        </View>
      ) : null}
      <ScrollContainer
        contentContainerStyle={[styles.content, useDesktopScroll ? styles.desktopContent : null]}
        keyboardShouldPersistTaps="handled"
        style={styles.scroller}>
        <ThemedText lightColor={palette.text} darkColor={palette.text} style={[styles.title, useDesktopScroll ? styles.desktopTitle : null]}>
          {title}
        </ThemedText>
        <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.subtitle, useDesktopScroll ? styles.desktopSubtitle : null]}>
          {subtitle}
        </ThemedText>
        <View style={[styles.fields, useDesktopScroll ? styles.desktopFields : null]}>{children}</View>
      </ScrollContainer>
      <View style={[styles.footer, useDesktopScroll ? styles.desktopFooter : null, { borderColor: palette.border }]}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    borderRadius: AUTH_LAYOUT.backButtonSize / 2,
    borderWidth: 1,
    height: AUTH_LAYOUT.backButtonSize,
    justifyContent: 'center',
    width: AUTH_LAYOUT.backButtonSize,
  },
  content: {
    paddingBottom: designSystem.spacing.xxl,
    paddingHorizontal: designSystem.spacing.xl,
    paddingTop: designSystem.spacing.xxl,
  },
  fields: {
    gap: designSystem.spacing.sm,
    marginTop: designSystem.spacing.xl,
  },
  desktopContent: {
    paddingBottom: designSystem.spacing.lg,
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: designSystem.spacing.lg,
  },
  desktopFields: {
    gap: designSystem.spacing.xs,
    marginTop: designSystem.spacing.md,
  },
  desktopFooter: {
    padding: designSystem.spacing.md,
  },
  desktopSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: designSystem.spacing.xs,
  },
  desktopTitle: {
    fontSize: 24,
    lineHeight: 28,
  },
  footer: {
    borderTopWidth: 1,
    padding: designSystem.spacing.xl,
  },
  frame: {
    flex: 1,
  },
  header: {
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: designSystem.spacing.sm,
  },
  subtitle: {
    ...designSystem.type.body,
    marginTop: designSystem.spacing.sm,
  },
  scroller: {
    flex: 1,
    outlineWidth: 0,
  },
  title: {
    fontSize: 31,
    fontWeight: '600',
    lineHeight: designSystem.type.pageTitle.lineHeight,
  },
});
