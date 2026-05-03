import { useQuery } from 'convex/react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { listIncomingFriendCallsRef } from '@/lib/convex';
import {
  FRIEND_CALL_ANSWER_ACTION_ID,
  FRIEND_CALL_DECLINE_ACTION_ID,
  presentIncomingFriendCallNotification,
} from '@/lib/notifications';

type IncomingFriendCall = {
  _id: Id<'friendCalls'>;
  circleName: string;
  createdByName: string;
  createdByAvatarUri: string | null;
  mode: 'voice' | 'video';
  title: string;
};

export function IncomingFriendCallCenter() {
  const router = useRouter();
  const segments = useSegments();
  const traveler = useCurrentTraveler();
  const { activeCallId, openCall } = useActiveFriendCall();
  const [presentedCallIds, setPresentedCallIds] = useState<Set<string>>(() => new Set());
  const [ringingCall, setRingingCall] = useState<IncomingFriendCall | null>(null);
  const incomingCalls = useQuery(
    listIncomingFriendCallsRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : 'skip'
  ) as IncomingFriendCall[] | undefined;
  const isCallRoute = segments[0] === 'friends' && segments[1] === 'call';
  const incomingCall = useMemo(
    () =>
      incomingCalls?.find(
        (call) => call._id !== activeCallId && !presentedCallIds.has(call._id)
      ) ?? null,
    [activeCallId, incomingCalls, presentedCallIds]
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const handleCallNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (data?.kind === 'friend_chat_message' && typeof data.href === 'string') {
        router.push(data.href as never);
        Notifications.clearLastNotificationResponse();
        return;
      }

      if (data?.kind !== 'friend_call_ring' || typeof data.callId !== 'string') {
        return;
      }

      const callId = data.callId as Id<'friendCalls'>;
      if (response.actionIdentifier === FRIEND_CALL_DECLINE_ACTION_ID) {
        Notifications.clearLastNotificationResponse();
        return;
      }

      if (
        response.actionIdentifier === FRIEND_CALL_ANSWER_ACTION_ID ||
        response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        openCall(callId);
      }
      Notifications.clearLastNotificationResponse();
    };

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleCallNotificationResponse);

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification.request.content.data?.kind === 'friend_call_ring') {
      handleCallNotificationResponse(lastResponse);
    }

    return () => {
      responseSubscription.remove();
    };
  }, [openCall, router]);

  useEffect(() => {
    if (!incomingCall || activeCallId || isCallRoute || Platform.OS === 'web') {
      return;
    }

    let cancelled = false;
    async function showIncomingCall() {
      setRingingCall(incomingCall);
      await presentIncomingFriendCallNotification({
        callId: incomingCall!._id,
        callerName: incomingCall!.createdByName,
        circleName: incomingCall!.circleName,
        mode: incomingCall!.mode,
      });
      if (!cancelled) {
        setPresentedCallIds((value) => new Set(value).add(incomingCall!._id));
      }
    }

    void showIncomingCall();
    return () => {
      cancelled = true;
    };
  }, [activeCallId, incomingCall, isCallRoute]);

  useEffect(() => {
    if (!ringingCall) {
      return;
    }
    if (activeCallId || isCallRoute || !incomingCalls?.some((call) => call._id === ringingCall._id)) {
      setRingingCall(null);
    }
  }, [activeCallId, incomingCalls, isCallRoute, ringingCall]);

  return <IncomingCallRingtone mode={ringingCall?.mode ?? null} />;
}

function IncomingCallRingtone({ mode }: { mode: IncomingFriendCall['mode'] | null }) {
  useEffect(() => {
    if (!mode || Platform.OS === 'web') {
      return;
    }

    let player: ReturnType<typeof createAudioPlayer> | null = null;
    let stopped = false;
    try {
      player = createAudioPlayer(
        mode === 'video'
          ? require('../../../assets/sounds/video_call_ring.wav')
          : require('../../../assets/sounds/voice_call_ring.wav'),
        { keepAudioSessionActive: true }
      );
      player.loop = true;
      player.volume = 1;
      void setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      }).catch(() => {});
      player.play();
    } catch (error) {
      console.warn('Unable to start incoming call ringtone', error);
    }

    return () => {
      stopped = true;
      try {
        player?.remove();
      } catch (error) {
        if (!stopped) {
          console.warn('Unable to stop incoming call ringtone', error);
        }
      }
    };
  }, [mode]);

  return null;
}
