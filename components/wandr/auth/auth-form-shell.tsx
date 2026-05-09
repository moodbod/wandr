import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { designSystem } from '@/constants/design-system';

import { AUTH_LAYOUT, type AuthPalette } from './auth-palette';

type AuthFormShellProps = {
  children: ReactNode;
  footer: ReactNode;
  onBack: () => void;
  palette: AuthPalette;
  subtitle: string;
  title: string;
};

export function AuthFormShell({ children, footer, onBack, palette, subtitle, title }: AuthFormShellProps) {
  return (
    <View style={styles.formFrame}>
      <View style={styles.formHeader}>
        <GlassButton accessibilityLabel="Go back" height={AUTH_LAYOUT.backButtonSize} width={AUTH_LAYOUT.backButtonSize} onPress={onBack}>
          <MaterialCommunityIcons color={palette.borderStrong} name="arrow-left" size={AUTH_LAYOUT.iconSize} />
        </GlassButton>
      </View>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <ThemedText lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText} style={styles.formTitle}>
          {title}
        </ThemedText>
        <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.formSubtitle}>
          {subtitle}
        </ThemedText>
        <View style={styles.formFields}>{children}</View>
      </ScrollView>
      <View style={[styles.footer, { borderColor: palette.border }]}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  formFrame: {
    flex: 1,
  },
  formHeader: {
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: designSystem.spacing.xs + designSystem.spacing.xxs / 2,
  },
  formContent: {
    paddingBottom: designSystem.spacing.xxl,
    paddingHorizontal: designSystem.spacing.xl,
    paddingTop: designSystem.spacing.xxl,
  },
  formTitle: {
    fontSize: AUTH_LAYOUT.formTitleFontSize,
    fontWeight: '600',
    lineHeight: designSystem.type.pageTitle.lineHeight,
  },
  formSubtitle: {
    ...designSystem.type.body,
    marginTop: designSystem.layout.compactPadding,
  },
  formFields: {
    gap: designSystem.spacing.sm,
    marginTop: designSystem.radii.sheet - designSystem.spacing.xxs / 2,
  },
  footer: {
    borderTopWidth: 1,
    padding: designSystem.spacing.lg,
  },
});
