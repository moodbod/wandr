import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DISMISSED_KEY = 'wandr.pwaInstallBannerDismissedAt';
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function getInstallContext() {
  if (typeof window === 'undefined') {
    return {
      isAppleMobileSafari: false,
      isDesktopSafari: false,
    };
  }

  const userAgent = window.navigator.userAgent;
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium/.test(userAgent);
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent);

  return {
    isAppleMobileSafari: isSafari && isAppleMobile,
    isDesktopSafari: isSafari && !isAppleMobile,
  };
}

function wasDismissedRecently() {
  if (typeof window === 'undefined') {
    return true;
  }

  const rawValue = window.localStorage.getItem(DISMISSED_KEY);
  const dismissedAt = rawValue ? Number(rawValue) : 0;
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_DURATION_MS;
}

export function PwaInstallBanner() {
  const isDark = useColorScheme() === 'dark';
  const [isDismissed, setIsDismissed] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [installContext, setInstallContext] = useState({
    isAppleMobileSafari: false,
    isDesktopSafari: false,
  });
  const isInstallPromptSupported = Boolean(deferredPrompt);
  const { isAppleMobileSafari, isDesktopSafari } = installContext;
  const shouldShowFallback = isAppleMobileSafari || isDesktopSafari;
  const shouldShow = !isStandalone && !isDismissed && (isInstallPromptSupported || shouldShowFallback);

  useEffect(() => {
    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
    setIsStandalone(Boolean(navigatorWithStandalone.standalone) || window.matchMedia('(display-mode: standalone)').matches);
    setInstallContext(getInstallContext());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    };
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      setIsStandalone(Boolean(navigatorWithStandalone.standalone) || displayModeQuery.matches);
    };
    const timeout = window.setTimeout(() => {
      setIsDismissed(wasDismissedRecently());
    }, 1400);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    displayModeQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  if (!shouldShow) {
    return null;
  }

  const colors = {
    background: isDark ? 'rgba(17,19,15,0.96)' : 'rgba(249,249,246,0.96)',
    border: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft,
    iconBackground: isDark ? designSystem.colors.limeSoft : designSystem.colors.limeMist,
    icon: designSystem.colors.lime,
    text: isDark ? designSystem.colors.darkText : designSystem.colors.ink,
    muted: isDark ? designSystem.colors.darkMutedText : designSystem.colors.warmDark,
  };
  const title = isInstallPromptSupported ? 'Install Wandr' : 'Open Wandr as an app';
  const body = isInstallPromptSupported
    ? 'Add Wandr to your desktop or home screen for fullscreen access.'
    : 'In Safari, use Share, then Add to Home Screen to remove the browser frame.';

  function handleDismiss() {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setIsDismissed(true);
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') {
        handleDismiss();
      }
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View style={[styles.banner, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[styles.iconShell, { backgroundColor: colors.iconBackground }]}>
          <MaterialCommunityIcons color={colors.icon} name="cellphone-arrow-down" size={22} />
        </View>
        <View style={styles.copy}>
          <ThemedText lightColor={colors.text} darkColor={colors.text} style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText lightColor={colors.muted} darkColor={colors.muted} style={styles.body}>
            {body}
          </ThemedText>
        </View>
        {isInstallPromptSupported ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Install Wandr"
            disabled={isInstalling}
            style={({ pressed }) => [styles.installButton, pressed && styles.pressed, isInstalling && styles.disabled]}
            onPress={() => {
              void handleInstall();
            }}>
            <ThemedText lightColor={designSystem.colors.darkGreen} darkColor={designSystem.colors.darkGreen} style={styles.installText}>
              {isInstalling ? 'Opening' : 'Install'}
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable accessibilityLabel="Dismiss install banner" accessibilityRole="button" style={styles.closeButton} onPress={handleDismiss}>
          <MaterialCommunityIcons color={colors.muted} name="close" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    left: 0,
    paddingHorizontal: designSystem.spacing.md,
    position: 'fixed' as any,
    right: 0,
    top: 'calc(env(safe-area-inset-top, 0px) + 12px)' as any,
    zIndex: 1000,
  },
  banner: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: designSystem.radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    maxWidth: 620,
    minHeight: 76,
    padding: designSystem.spacing.sm,
    boxShadow: '0 16px 34px rgba(0,0,0,0.2)',
    width: '100%',
  },
  iconShell: {
    alignItems: 'center',
    borderRadius: designSystem.radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    ...designSystem.type.bodyStrong,
  },
  body: {
    ...designSystem.type.bodySmall,
  },
  installButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: designSystem.radii.pill,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: designSystem.spacing.md,
  },
  installText: {
    ...designSystem.type.bodySmallStrong,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: designSystem.radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  disabled: {
    opacity: 0.62,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
