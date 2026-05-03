import { useQuery } from 'convex/react';
import { useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { listIncomingFriendCallsRef } from '@/lib/convex';
import {
  answerNativeCall,
  endNativeCall,
  setupNativeCallSystem,
  showNativeIncomingCall,
} from '@/lib/native-calls';
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
  const segments = useSegments();
  const traveler = useCurrentTraveler();
  const { activeCallId, openCall } = useActiveFriendCall();
  const [presentedCallIds, setPresentedCallIds] = useState<Set<string>>(() => new Set());
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

    void setupNativeCallSystem();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const handleCallNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (data?.kind !== 'friend_call_ring' || typeof data.callId !== 'string') {
        return;
      }

      const callId = data.callId as Id<'friendCalls'>;
      if (response.actionIdentifier === FRIEND_CALL_DECLINE_ACTION_ID) {
        endNativeCall(callId);
        Notifications.clearLastNotificationResponse();
        return;
      }

      if (
        response.actionIdentifier === FRIEND_CALL_ANSWER_ACTION_ID ||
        response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        answerNativeCall(callId);
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
  }, [openCall]);

  useEffect(() => {
    if (!incomingCall || activeCallId || isCallRoute || Platform.OS === 'web') {
      return;
    }

    let cancelled = false;
    async function showIncomingCall() {
      const didShowCall = await showNativeIncomingCall({
        callId: incomingCall!._id,
        callerName: incomingCall!.createdByName,
        groupName: incomingCall!.circleName,
        mode: incomingCall!.mode,
      });
      if (!didShowCall) {
        await presentIncomingFriendCallNotification({
          callId: incomingCall!._id,
          callerName: incomingCall!.createdByName,
          circleName: incomingCall!.circleName,
          mode: incomingCall!.mode,
        });
      }
      if (!cancelled) {
        setPresentedCallIds((value) => new Set(value).add(incomingCall!._id));
      }
    }

    void showIncomingCall();
    return () => {
      cancelled = true;
    };
  }, [activeCallId, incomingCall, isCallRoute]);

  return null;
}
