import { useQuery } from 'convex/react';
import { useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { listIncomingFriendCallsRef } from '@/lib/convex';
import { answerNativeCall, endNativeCall, showNativeIncomingCall } from '@/lib/native-calls';
import {
  FRIEND_CALL_ANSWER_ACTION_ID,
  FRIEND_CALL_DECLINE_ACTION_ID,
} from '@/lib/notifications';

type IncomingFriendCall = {
  _id: Id<'calls'>;
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
  const incomingCalls = useQuery(
    listIncomingFriendCallsRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : 'skip'
  ) as IncomingFriendCall[] | undefined;
  const routeSegments: readonly string[] = segments;
  const isCallRoute = routeSegments[0] === 'friends' && routeSegments[1] === 'call';
  const incomingCall = useMemo(
    () =>
      incomingCalls?.find(
        (call) => call._id !== activeCallId && !presentedCallIds.has(call._id)
      ) ?? null,
    [activeCallId, incomingCalls, presentedCallIds]
  );

  const answerCall = useCallback(
    (callId: Id<'calls'>) => {
      setPresentedCallIds((value) => new Set(value).add(callId));
      answerNativeCall(callId);
      openCall(callId);
    },
    [openCall]
  );

  const declineCall = useCallback(
    (callId: Id<'calls'>) => {
      setPresentedCallIds((value) => new Set(value).add(callId));
      endNativeCall(callId);
    },
    []
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

      const callId = data.callId as Id<'calls'>;
      void Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
      if (response.actionIdentifier === FRIEND_CALL_DECLINE_ACTION_ID) {
        declineCall(callId);
        Notifications.clearLastNotificationResponse();
        return;
      }

      if (response.actionIdentifier === FRIEND_CALL_ANSWER_ACTION_ID) {
        answerCall(callId);
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
  }, [answerCall, declineCall, router]);

  useEffect(() => {
    if (!incomingCall || activeCallId || isCallRoute || Platform.OS === 'web') {
      return;
    }

    const currentIncomingCall = incomingCall;
    let cancelled = false;
    async function showIncomingCall() {
      await showNativeIncomingCall({
        callId: currentIncomingCall._id,
        callerName: currentIncomingCall.createdByName,
        groupName: currentIncomingCall.circleName,
        mode: currentIncomingCall.mode,
      });
      if (!cancelled) {
        setPresentedCallIds((value) => new Set(value).add(currentIncomingCall._id));
      }
    }

    void showIncomingCall();
    return () => {
      cancelled = true;
    };
  }, [activeCallId, incomingCall, isCallRoute]);

  return null;
}
