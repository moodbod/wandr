import { type Href, useRouter } from 'expo-router';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, GearSix, LockSimple, PencilSimple, SignOut } from 'phosphor-react-native';
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

const SIDEBAR_WIDTH = 360;
const APP_ICON_OPTIONS = [
  { label: 'Default', value: null, backgroundColor: '#eaf6df', foregroundColor: '#174900' },
  { label: 'Forest', value: 'Forest', backgroundColor: '#0f1f12', foregroundColor: '#9fe870' },
  { label: 'Sky', value: 'Sky', backgroundColor: '#edf8ff', foregroundColor: '#103246' },
] as const;

type AppIconValue = (typeof APP_ICON_OPTIONS)[number]['value'];
type ProfileSemanticColors = (typeof designSystem.semantic)[keyof typeof designSystem.semantic];

type ProfileSettingsSidebarProps = {
  avatarUri?: string | null;
  baseLabel: string;
  isOpen: boolean;
  name: string;
  onClose: () => void;
};

export function ProfileSettingsSidebar({
  avatarUri,
  baseLabel,
  isOpen,
  name,
  onClose,
}: ProfileSettingsSidebarProps) {
  const router = useRouter();
  const metadata = getAppMetadata();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;
  const slideProgress = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = useState(isOpen);
  const [selectedAppIcon, setSelectedAppIcon] = useState<AppIconValue>(null);

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
                <FaceHashAvatar name={name} size={58} uri={avatarUri} style={[styles.sidebarAvatar, { backgroundColor: colors.text }]} />
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
                title="Edit profile"
                subtitle="Photo, home base, and traveler details"
              />
              <SidebarAction
                colors={colors}
                icon={<Bell color={colors.text} size={20} weight="regular" />}
                onPress={() => navigateTo('/notifications')}
                title="Notifications"
                subtitle="Trip alerts, chats, and friend invites"
              />
              <SidebarAction
                colors={colors}
                icon={<LockSimple color={colors.text} size={20} weight="regular" />}
                onPress={() => navigateTo('/profile/privacy')}
                title="Privacy"
                subtitle="Visibility, saved places, and data controls"
              />
              <SidebarAction
                colors={colors}
                icon={<GearSix color={colors.text} size={20} weight="regular" />}
                onPress={() => navigateTo('/profile/account')}
                title="Account"
                subtitle="Security, billing, and app preferences"
              />
            </View>

            <View style={styles.sidebarFooter}>
              <AppIconPicker
                selectedIcon={selectedAppIcon}
                onSelectIcon={setSelectedAppIcon}
              />
              {metadata.appDescription ? (
                <ThemedText style={styles.appDescription}>{metadata.appDescription}</ThemedText>
              ) : null}
              {metadata.versionLabel ? (
                <ThemedText style={styles.versionText}>Version {metadata.versionLabel}</ThemedText>
              ) : null}
              <Pressable style={[styles.logoutButton, { backgroundColor: colors.text }]}>
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

function AppIconPicker({
  selectedIcon,
  onSelectIcon,
}: {
  selectedIcon: AppIconValue;
  onSelectIcon: (icon: AppIconValue) => void;
}) {
  return (
    <View style={styles.appIconPicker}>
      <View style={styles.appIconPickerHeader}>
        <ThemedText style={styles.appIconPickerTitle}>App icon</ThemedText>
      </View>
      <View style={styles.appIconOptions}>
        {APP_ICON_OPTIONS.map((option) => {
          const isSelected = selectedIcon === option.value;

          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Select ${option.label} app icon`}
              onPress={() => onSelectIcon(option.value)}
              style={[styles.appIconOption, isSelected && styles.appIconOptionActive]}
            >
              <View style={[styles.appIconPreview, { backgroundColor: option.backgroundColor }]}>
                <ThemedText style={[styles.appIconGlyph, { color: option.foregroundColor }]}>W</ThemedText>
              </View>
              <ThemedText style={styles.appIconLabel}>{option.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SidebarAction({
  colors,
  icon,
  onPress,
  subtitle,
  title,
}: {
  colors: ProfileSemanticColors;
  icon: React.ReactNode;
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionRow, { borderColor: colors.borderSoft }]}>
      <View style={[styles.actionIcon, { backgroundColor: colors.surface }]}>{icon}</View>
      <View style={styles.actionTextWrap}>
        <ThemedText style={styles.actionTitle}>{title}</ThemedText>
        <ThemedText style={styles.actionSubtitle}>{subtitle}</ThemedText>
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
  appIconPicker: {
    gap: 10,
  },
  appIconPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  appIconPickerTitle: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.ink,
  },
  appIconOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  appIconOption: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  appIconOptionActive: {
    borderColor: designSystem.colors.borderAccent,
    backgroundColor: designSystem.colors.limeSoft,
  },
  appIconPreview: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  appIconGlyph: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '600',
  },
  appIconLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.mutedText,
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
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 11,
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
  actionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: designSystem.colors.subtleText,
  },
});
