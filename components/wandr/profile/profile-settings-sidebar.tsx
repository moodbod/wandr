import { type Href, useRouter } from 'expo-router';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BellRinging, CurrencyDollar, LockSimple, PencilSimple, SignOut } from 'phosphor-react-native';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAppMetadata } from '@/lib/app-metadata';
import { useAuthSession } from '@/providers/auth-session';

const SIDEBAR_WIDTH = 360;
type ProfileSemanticColors = (typeof designSystem.semantic)[keyof typeof designSystem.semantic];

type ProfileSettingsSidebarProps = {
  avatarUri?: string | null;
  avatarPaletteKey?: string | null;
  baseLabel: string;
  isOpen: boolean;
  name: string;
  onClose: () => void;
};

export function ProfileSettingsSidebar({
  avatarUri,
  avatarPaletteKey,
  baseLabel,
  isOpen,
  name,
  onClose,
}: ProfileSettingsSidebarProps) {
  const router = useRouter();
  const { signOut } = useAuthSession();
  const metadata = getAppMetadata();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;
  const slideProgress = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      dragX.setValue(0);
    }

    Animated.timing(slideProgress, {
      toValue: isOpen ? 1 : 0,
      duration: isOpen ? 240 : 200,
      easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isOpen) {
        setIsRendered(false);
      }
    });
  }, [dragX, isOpen, slideProgress]);

  const onGestureEvent = Animated.event<PanGestureHandlerGestureEvent>(
    [{ nativeEvent: { translationX: dragX } }],
    { useNativeDriver: true }
  );

  const onGestureStateChange = ({ nativeEvent }: PanGestureHandlerStateChangeEvent) => {
    if (nativeEvent.oldState !== State.ACTIVE) {
      return;
    }

    const shouldClose = nativeEvent.translationX < -SIDEBAR_WIDTH * 0.22 || nativeEvent.velocityX < -520;

    if (shouldClose) {
      onClose();
      return;
    }

    Animated.spring(dragX, {
      toValue: 0,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  };

  const slideTranslateX = slideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-SIDEBAR_WIDTH, 0],
  });
  const dragTranslateX = dragX.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0, SIDEBAR_WIDTH],
    outputRange: [-SIDEBAR_WIDTH, 0, 0],
    extrapolate: 'clamp',
  });

  const sidebarStyle = {
    transform: [
      {
        translateX: Animated.add(slideTranslateX, dragTranslateX),
      },
    ],
  };
  const navigateTo = (href: Href) => {
    onClose();
    router.push(href);
  };

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    onClose();

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Modal animationType="none" transparent visible={isRendered} onRequestClose={onClose}>
      <View style={styles.sidebarOverlay}>
        <Pressable
          accessibilityLabel="Close profile settings"
          style={[styles.sidebarScrim, { backgroundColor: isDark ? designSystem.colors.darkScrim : designSystem.colors.scrim }]}
          onPress={onClose}
        />
        <PanGestureHandler
          activeOffsetX={[-12, 12]}
          failOffsetY={[-18, 18]}
          enabled={isOpen}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onGestureStateChange}>
          <Animated.View style={[styles.sidebar, { backgroundColor: colors.background }, sidebarStyle]}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarIdentity}>
                <FaceHashAvatar name={name} paletteKey={avatarPaletteKey} size={58} uri={avatarUri} style={[styles.sidebarAvatar, { backgroundColor: colors.text }]} />
                <View style={styles.sidebarNameWrap}>
                  <ThemedText numberOfLines={1} style={styles.sidebarName}>
                    {name}
                  </ThemedText>
                  <ThemedText numberOfLines={1} style={styles.sidebarBase}>
                    {baseLabel}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.sidebarSection}>
              <ThemedText style={styles.sidebarSectionTitle}>Profile settings</ThemedText>
              <SidebarAction
                colors={colors}
                icon={<PencilSimple color={colors.text} size={20} weight="regular" />}
                onPress={() => navigateTo('/profile/edit')}
                title="Account"
              />
              <SidebarAction
                colors={colors}
                icon={<CurrencyDollar color={colors.text} size={20} weight="regular" />}
                onPress={() => navigateTo('/profile/preferences')}
                title="Preferences"
              />
              <SidebarAction
                colors={colors}
                icon={<BellRinging color={colors.text} size={20} weight="regular" />}
                onPress={() => navigateTo('/profile/notifications')}
                title="Notifications"
              />
              <SidebarAction
                colors={colors}
                icon={<LockSimple color={colors.text} size={20} weight="regular" />}
                onPress={() => navigateTo('/profile/privacy')}
                title="Privacy"
              />
            </View>

            <View style={styles.sidebarFooter}>
              {metadata.appDescription ? (
                <ThemedText style={styles.appDescription}>{metadata.appDescription}</ThemedText>
              ) : null}
              {metadata.versionLabel ? (
                <ThemedText style={styles.versionText}>Version {metadata.versionLabel}</ThemedText>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isSigningOut }}
                disabled={isSigningOut}
                onPress={handleLogout}
                style={[styles.logoutButton, { backgroundColor: colors.text }, isSigningOut && styles.logoutButtonDisabled]}>
                <SignOut color={colors.background} size={18} weight="bold" />
                <ThemedText style={[styles.logoutText, { color: colors.background }]}>Logout</ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}

function SidebarAction({
  colors,
  icon,
  onPress,
  title,
}: {
  colors: ProfileSemanticColors;
  icon: React.ReactNode;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionRow, { borderColor: colors.borderSoft }]}>
      <View style={[styles.actionIcon, { backgroundColor: colors.surface }]}>{icon}</View>
      <View style={styles.actionTextWrap}>
        <ThemedText style={styles.actionTitle}>{title}</ThemedText>
      </View>
      <ArrowRight color={colors.textSubtle} size={18} weight="regular" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sidebar: {
    width: '84%',
    maxWidth: 360,
    height: '100%',
    gap: 24,
    paddingHorizontal: 18,
    paddingTop: 76,
    paddingBottom: 28,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sidebarIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  sidebarNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  sidebarName: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sidebarBase: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: designSystem.colors.mutedText,
  },
  sidebarSection: {
    flex: 1,
    gap: 4,
  },
  sidebarFooter: {
    gap: 12,
    paddingTop: 12,
  },
  appDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: designSystem.colors.mutedText,
  },
  versionText: {
    marginBottom: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.subtleText,
  },
  logoutButton: {
    minHeight: 50,
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
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  sidebarSectionTitle: {
    marginBottom: 4,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  actionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
});
