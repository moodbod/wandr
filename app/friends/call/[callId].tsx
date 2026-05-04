import { isRunningInExpoGo } from 'expo';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { PhoneDisconnect, VideoCamera } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ActiveFriendCallOverlay from '@/components/wandr/friends/active-friend-call-overlay';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';

export default function FriendCallScreen() {
  if (Platform.OS !== 'web' && isRunningInExpoGo()) {
    return <ExpoGoUnsupportedCallScreen />;
  }

  return <ActiveCallRouteBridge />;
}

function ActiveCallRouteBridge() {
  const router = useRouter();
  const params = useLocalSearchParams<{ callId?: string | string[] }>();
  const callIdParam = Array.isArray(params.callId) ? params.callId[0] : params.callId;
  const callId = callIdParam as Id<'friendCalls'> | undefined;
  const { activeCallId, isMinimized, openCall } = useActiveFriendCall();
  const didOpenCall = useRef(false);
  const didSeeActiveCall = useRef(false);

  useEffect(() => {
    if (!callId) {
      return;
    }
    didOpenCall.current = true;
    openCall(callId);
  }, [callId, openCall]);

  useEffect(() => {
    if (!didOpenCall.current) {
      return;
    }

    if (activeCallId) {
      didSeeActiveCall.current = true;
    }

    if (didSeeActiveCall.current && (isMinimized || !activeCallId)) {
      const timeoutId = setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace('/friends/chat');
      }, 0);

      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [activeCallId, isMinimized, router]);

  return (
    <ThemedView style={styles.routeHost}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActiveFriendCallOverlay />
    </ThemedView>
  );
}

function ExpoGoUnsupportedCallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + 18, paddingBottom: Math.max(insets.bottom, 18) }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          <VideoCamera color={designSystem.colors.darkGreen} size={28} weight="bold" />
        </View>
        <ThemedText style={styles.title}>Calls need a development build</ThemedText>
        <ThemedText style={styles.body}>
          LiveKit uses native WebRTC modules that are not available in Expo Go or the web preview. Run Wandr in a custom
          development build to join voice or video calls.
        </ThemedText>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}>
          <PhoneDisconnect color={designSystem.colors.white} size={20} weight="bold" />
          <ThemedText style={styles.buttonText}>Leave call</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
    backgroundColor: designSystem.colors.charcoal,
  },
  routeHost: {
    flex: 1,
    backgroundColor: '#050704',
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
  },
  title: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '600',
    color: designSystem.colors.white,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: designSystem.colors.darkMutedText,
    textAlign: 'center',
  },
  button: {
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: designSystem.colors.copper,
  },
  buttonText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.whiteOverlayBarely,
  },
  secondaryButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
});
