import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { type AuthPalette } from './auth-palette';

type AuthFormShellProps = {
  children: ReactNode;
  footer: ReactNode;
  palette: AuthPalette;
  subtitle?: string;
  title?: string;
  onBack?: () => void;
  onClose?: () => void;
  scrollMode?: 'default' | 'bottomSheet';
  showBackButton?: boolean; // Kept for interface compatibility
};

export function AuthFormShell({
  children,
  footer,
  onBack,
  onClose,
  palette,
  scrollMode = 'default',
  subtitle,
  title,
}: AuthFormShellProps) {
  const { isLargeScreen } = useResponsive();
  const useDesktopScroll = scrollMode === 'bottomSheet' && Platform.OS === 'web' && isLargeScreen;
  const ScrollContainer = scrollMode === 'bottomSheet' && !useDesktopScroll ? BottomSheetScrollView : ScrollView;
  const showHeader = !!onBack || !!onClose;

  return (
    <View style={styles.frame}>
      {showHeader ? (
        <View style={styles.header}>
          {onBack ? (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={onBack}
              style={styles.headerButton}>
              <MaterialCommunityIcons 
                color={palette.primaryText} 
                name="arrow-left" 
                size={22} 
              />
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}

          {onClose ? (
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.headerButton}>
              <MaterialCommunityIcons 
                color={palette.textMuted} 
                name="close" 
                size={22} 
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      
      <ScrollContainer
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroller}>
        {title ? (
          <ThemedText lightColor={palette.text} darkColor={palette.text} style={styles.title}>
            {title}
          </ThemedText>
        ) : null}
        {subtitle ? (
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
        <View style={styles.fields}>{children}</View>
      </ScrollContainer>
      <View style={[styles.footer, { borderColor: palette.border }]}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designSystem.spacing.xl,
    paddingTop: designSystem.spacing.lg,
    paddingBottom: designSystem.spacing.xs,
    minHeight: 48,
  },
  headerButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  content: {
    paddingBottom: designSystem.spacing.xl,
    paddingHorizontal: designSystem.spacing.xl,
    paddingTop: designSystem.spacing.xs,
  },
  scroller: {
    flex: 1,
    outlineWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: designSystem.spacing.xs,
    textAlign: 'center',
    paddingHorizontal: designSystem.spacing.md,
  },
  fields: {
    gap: designSystem.spacing.xs,
    marginTop: designSystem.spacing.md,
  },
  footer: {
    borderTopWidth: 0,
    padding: designSystem.spacing.md,
  },
});

