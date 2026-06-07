import { type Href, useRouter } from 'expo-router';
import type React from 'react';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  BellRinging,
  CurrencyDollar,
  LockSimple,
  PencilSimple,
  SignOut,
  Storefront,
} from 'phosphor-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAppMetadata } from '@/lib/app-metadata';
import { useAuthSession } from '@/providers/auth-session';

type ProfileSemanticColors = (typeof designSystem.semantic)[keyof typeof designSystem.semantic];

export function ProfileSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuthSession();
  const metadata = getAppMetadata();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navigateTo = (href: Href) => {
    router.push(href);
  };

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
      router.dismissTo('/profile');
    } catch (error) {
      console.error('Failed to sign out', error);
      Alert.alert('Could not sign out', 'Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        bounces
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.subtitle, { color: colors.textSubtle }]}>Manage your Wandr profile</ThemedText>

        <SettingsSection colors={colors}>
          <SettingsAction
            colors={colors}
            icon={<PencilSimple color={colors.text} size={20} weight="regular" />}
            onPress={() => navigateTo('/profile/edit')}
            title="Account"
          />
          <SettingsAction
            colors={colors}
            icon={<CurrencyDollar color={colors.text} size={20} weight="regular" />}
            onPress={() => navigateTo('/profile/preferences')}
            title="Preferences"
          />
          <SettingsAction
            colors={colors}
            icon={<BellRinging color={colors.text} size={20} weight="regular" />}
            onPress={() => navigateTo('/profile/notifications')}
            title="Notifications"
          />
          {session?.role === 'serviceProvider' ? (
            <SettingsAction
              colors={colors}
              icon={<Storefront color={colors.text} size={20} weight="regular" />}
              onPress={() => navigateTo('/profile/business' as Href)}
              title="My business"
            />
          ) : null}
          <SettingsAction
            colors={colors}
            icon={<LockSimple color={colors.text} size={20} weight="regular" />}
            isLast
            onPress={() => navigateTo('/profile/privacy')}
            title="Privacy"
          />
        </SettingsSection>

        <View style={styles.footer}>
          {metadata.appDescription ? (
            <ThemedText style={[styles.appDescription, { color: colors.textSubtle }]}>
              {metadata.appDescription}
            </ThemedText>
          ) : null}
          {metadata.versionLabel ? (
            <ThemedText style={[styles.versionText, { color: colors.textSubtle }]}>
              Version {metadata.versionLabel}
            </ThemedText>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut }}
            disabled={isSigningOut}
            onPress={handleLogout}
            style={[
              styles.logoutButton,
              { backgroundColor: colors.text },
              isSigningOut ? styles.logoutButtonDisabled : null,
            ]}>
            <SignOut color={colors.background} size={18} weight="bold" />
            <ThemedText style={[styles.logoutText, { color: colors.background }]}>Logout</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function SettingsSection({ children, colors }: { children: React.ReactNode; colors: ProfileSemanticColors }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft }]}>
      {children}
    </View>
  );
}

function SettingsAction({
  colors,
  icon,
  isLast = false,
  onPress,
  title,
}: {
  colors: ProfileSemanticColors;
  icon: React.ReactNode;
  isLast?: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.actionRow,
        { borderBottomColor: colors.borderSoft, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth },
      ]}>
      <View style={[styles.actionIcon, { backgroundColor: colors.surface }]}>{icon}</View>
      <ThemedText style={[styles.actionTitle, { color: colors.text }]}>{title}</ThemedText>
      <ArrowRight color={colors.textSubtle} size={18} weight="regular" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  section: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  actionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  footer: {
    gap: 12,
    paddingTop: 2,
  },
  appDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  versionText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  logoutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: designSystem.radii.pill,
  },
  logoutButtonDisabled: {
    opacity: 0.65,
  },
  logoutText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
