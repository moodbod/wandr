import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ensureNotificationSetupAsync } from '@/lib/notifications';

const DISMISSED_STORAGE_KEY = 'wandr.webNotificationsDismissedAt';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

type BrowserNotificationPermission = NotificationPermission | 'unsupported';

function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return window.Notification.permission;
}

function wasRecentlyDismissed() {
  if (typeof window === 'undefined') {
    return false;
  }

  const dismissedAt = Number(window.localStorage.getItem(DISMISSED_STORAGE_KEY) ?? 0);
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_MS;
}

export function TripNotificationCenter() {
  const isDark = useColorScheme() === 'dark';
  const [permission, setPermission] = useState<BrowserNotificationPermission>(() => getBrowserNotificationPermission());
  const [isDismissed, setIsDismissed] = useState(() => wasRecentlyDismissed());
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const refreshPermission = () => {
      setPermission(getBrowserNotificationPermission());
      setIsDismissed(wasRecentlyDismissed());
    };

    document.addEventListener('visibilitychange', refreshPermission);

    return () => {
      document.removeEventListener('visibilitychange', refreshPermission);
    };
  }, []);

  const palette = useMemo(
    () => ({
      background: isDark ? designSystem.colors.darkGlassStrong : designSystem.colors.lightGlassStrong,
      border: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
      text: isDark ? designSystem.colors.darkText : designSystem.colors.ink,
      muted: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText,
      button: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen,
      buttonText: isDark ? designSystem.colors.darkGreen : designSystem.colors.white,
    }),
    [isDark]
  );

  const handleEnable = useCallback(async () => {
    setIsRequesting(true);
    try {
      const granted = await ensureNotificationSetupAsync();
      const nextPermission = getBrowserNotificationPermission();
      setPermission(nextPermission);

      if (granted && typeof window !== 'undefined' && 'Notification' in window) {
        new window.Notification('Wandr notifications are on', {
          body: 'Trip reminders can now show in this browser while Wandr is open.',
          icon: '/wandr-icon.png',
          tag: 'wandr-notifications-enabled',
        });
      }
    } finally {
      setIsRequesting(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, String(Date.now()));
    }
    setIsDismissed(true);
  }, []);

  if (permission !== 'default' || isDismissed) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.card, { backgroundColor: palette.background, borderColor: palette.border }]}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.text }]}>Enable notifications</Text>
          <Text style={[styles.body, { color: palette.muted }]}>
            Get trip reminders from this browser while Wandr is open.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={isRequesting}
            onPress={handleEnable}
            style={[styles.enableButton, { backgroundColor: palette.button, opacity: isRequesting ? 0.7 : 1 }]}
          >
            <Text style={[styles.enableText, { color: palette.buttonText }]}>{isRequesting ? 'Opening...' : 'Enable'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleDismiss} style={styles.dismissButton}>
            <Text style={[styles.dismissText, { color: palette.muted }]}>Later</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 14,
    left: 14,
    right: 14,
    zIndex: 1200,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 24,
    padding: 12,
    gap: 12,
    boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
  },
  copy: {
    gap: 2,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  enableButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  dismissButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
});
