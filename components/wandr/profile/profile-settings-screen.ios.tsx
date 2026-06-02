import { type Href, useRouter } from 'expo-router';
import type React from 'react';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  BellRinging,
  CaretRight,
  CurrencyDollar,
  LockSimple,
  SignOut,
  Storefront,
} from 'phosphor-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WandrAvatar } from '@/components/wandr/avatar';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { getAppMetadata } from '@/lib/app-metadata';
import { useAuthSession } from '@/providers/auth-session';

type ProfileSemanticColors = (typeof designSystem.semantic)[keyof typeof designSystem.semantic];

const ROW_LEADING_INSET = 16 + 30 + 14; // padding + icon box + gap — aligns separators under the labels

export function ProfileSettingsScreen() {
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const { session, signOut } = useAuthSession();
  const metadata = getAppMetadata();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;
  const [isSigningOut, setIsSigningOut] = useState(false);
  const name = traveler?.name?.trim() || session?.name?.trim() || 'Traveler';
  const baseLabel = traveler?.countryLabel ?? traveler?.regionName ?? 'Wandr traveler';

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
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigateTo('/profile/edit')}
          style={({ pressed }) => [
            styles.section,
            styles.bannerRow,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft },
            pressed ? { opacity: 0.7 } : null,
          ]}>
          <WandrAvatar name={name} paletteKey={traveler?.slug} size={60} uri={traveler?.avatarUri ?? null} />
          <View style={styles.bannerCopy}>
            <ThemedText numberOfLines={1} style={[styles.bannerName, { color: colors.text }]}>
              {name}
            </ThemedText>
            <ThemedText numberOfLines={1} style={[styles.bannerMeta, { color: colors.textSubtle }]}>
              {baseLabel}
            </ThemedText>
          </View>
          <CaretRight color={colors.textSubtle} size={18} weight="bold" />
        </Pressable>

        <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft }]}>
          <NavRow
            colors={colors}
            icon={<CurrencyDollar color={colors.text} size={19} weight="regular" />}
            label="Preferences"
            onPress={() => navigateTo('/profile/preferences')}
          />
          <Separator colors={colors} />
          <NavRow
            colors={colors}
            icon={<BellRinging color={colors.text} size={19} weight="regular" />}
            label="Notifications"
            onPress={() => navigateTo('/profile/notifications')}
          />
          {session?.role === 'serviceProvider' ? (
            <>
              <Separator colors={colors} />
              <NavRow
                colors={colors}
                icon={<Storefront color={colors.text} size={19} weight="regular" />}
                label="My business"
                onPress={() => navigateTo('/profile/business' as Href)}
              />
            </>
          ) : null}
          <Separator colors={colors} />
          <NavRow
            colors={colors}
            icon={<LockSimple color={colors.text} size={19} weight="regular" />}
            label="Privacy"
            onPress={() => navigateTo('/profile/privacy')}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut }}
            disabled={isSigningOut}
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutRow, pressed ? { opacity: 0.7 } : null]}>
            <SignOut color={designSystem.colors.liked} size={19} weight="regular" />
            <ThemedText style={[styles.logoutText, { color: designSystem.colors.liked }]}>
              {isSigningOut ? 'Logging out…' : 'Log out'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          {metadata.appDescription ? (
            <ThemedText style={[styles.footerText, { color: colors.textSubtle }]}>{metadata.appDescription}</ThemedText>
          ) : null}
          {metadata.versionLabel ? (
            <ThemedText style={[styles.footerText, { color: colors.textSubtle }]}>
              Version {metadata.versionLabel}
            </ThemedText>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function NavRow({
  colors,
  icon,
  label,
  onPress,
}: {
  colors: ProfileSemanticColors;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.navRow, pressed ? { backgroundColor: colors.overlay } : null]}>
      <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>{icon}</View>
      <ThemedText style={[styles.navLabel, { color: colors.text }]}>{label}</ThemedText>
      <CaretRight color={colors.textSubtle} size={16} weight="bold" />
    </Pressable>
  );
}

function Separator({ colors }: { colors: ProfileSemanticColors }) {
  return <View style={[styles.separator, { backgroundColor: colors.borderSoft }]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 48,
  },
  section: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  bannerRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bannerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  bannerName: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
  },
  bannerMeta: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  navRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  navLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: ROW_LEADING_INSET,
  },
  logoutRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  logoutText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
