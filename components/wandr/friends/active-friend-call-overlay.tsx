import { AudioSession, LiveKitRoom, useConnectionState, useRemoteParticipants, useRoomContext } from '@livekit/react-native';
import { ConnectionState, VideoPresets, type RoomOptions } from 'livekit-client';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallControls } from '@/components/wandr/friends/call/call-controls';
import { FullCallLoading, MiniCallLoading } from '@/components/wandr/friends/call/call-loading';
import { CallVideoGrid, MiniCallContent } from '@/components/wandr/friends/call/call-video-grid';
import { DraggableMiniCall } from '@/components/wandr/friends/call/draggable-mini-call';
import { FullCallLayout } from '@/components/wandr/friends/call/full-call-layout';
import { VoiceCallStage } from '@/components/wandr/friends/call/voice-call-stage';
import type { Id } from '@/convex/_generated/dataModel';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { endNativeCall, markNativeCallConnected } from '@/lib/native-calls';
import type { FriendCircleMember } from '@/types/friends';
import {
  createFriendCallTokenRef,
  endFriendCallRef,
  getFriendCallRef,
  joinScheduledFriendCallRef,
} from '@/lib/convex';

type LiveKitConnection = {
  serverUrl: string;
  token: string;
  roomName: string;
};

const FRIEND_CALL_ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: { pixelDensity: 'screen' },
  dynacast: true,
  publishDefaults: {
    videoEncoding: {
      maxBitrate: 500_000,
      maxFramerate: 20,
    },
    videoSimulcastLayers: [VideoPresets.h180],
  },
};

export default function ActiveFriendCallOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const { activeCallId, clearCall, expandCall, isMinimized, minimizeCall } = useActiveFriendCall();
  const call = useQuery(
    getFriendCallRef,
    activeCallId && traveler?.slug
      ? {
          callId: activeCallId,
          travelerSlug: traveler.slug,
        }
      : 'skip'
  );
  const createToken = useAction(createFriendCallTokenRef);
  const joinScheduledCall = useMutation(joinScheduledFriendCallRef);
  const endCall = useMutation(endFriendCallRef);
  const [connection, setConnection] = useState<LiveKitConnection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);
  const preparedCallKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeCallId) {
      setConnection(null);
      setRemoteParticipantCount(0);
      preparedCallKeyRef.current = null;
      return;
    }

    void AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, [activeCallId]);

  useEffect(() => {
    if (!activeCallId || !traveler?.slug) {
      return;
    }

    const currentCallId = activeCallId;
    const currentTravelerSlug = traveler.slug;
    const prepareCallKey = `${currentCallId}:${currentTravelerSlug}`;
    if (preparedCallKeyRef.current === prepareCallKey) {
      return;
    }

    preparedCallKeyRef.current = prepareCallKey;
    let cancelled = false;

    async function prepareCall() {
      try {
        setLoadError(null);
        await joinScheduledCall({ callId: currentCallId, travelerSlug: currentTravelerSlug });
        const token = await createToken({ callId: currentCallId, travelerSlug: currentTravelerSlug });
        if (!cancelled) {
          setConnection(token);
        }
      } catch (error) {
        if (!cancelled) {
          preparedCallKeyRef.current = null;
          setLoadError(error instanceof Error ? error.message : 'Unable to prepare this call.');
        }
      }
    }

    void prepareCall();
    return () => {
      cancelled = true;
    };
  }, [activeCallId, createToken, joinScheduledCall, traveler?.slug]);

  useEffect(() => {
    if (call?.mode === 'voice') {
      setIsVideoEnabled(false);
    }
  }, [call?.mode]);

  if (!activeCallId) {
    return null;
  }

  const handleLeave = async () => {
    if (!activeCallId || !traveler?.slug || isLeaving) {
      return;
    }

    setIsLeaving(true);
    try {
      endNativeCall(activeCallId);
      if (!call?.circleId) {
        await endCall({ callId: activeCallId, travelerSlug: traveler.slug });
      }
    } finally {
      clearCall();
      setIsLeaving(false);
    }
  };

  const shouldSendVideo = call?.mode === 'video' && isVideoEnabled;
  const shouldPlayRingback =
    Boolean(activeCallId) &&
    call?.createdBySlug === traveler?.slug &&
    call?.status === 'active' &&
    remoteParticipantCount === 0 &&
    !isLeaving;
  const callMembers = (call?.members ?? []) as FriendCircleMember[];
  const callTitle = call?.circleName ?? call?.title ?? 'Wandr';
  const callMode = call?.mode ?? 'voice';
  const fullRoomContent = shouldSendVideo ? (
    <CallVideoGrid />
  ) : (
    <VoiceCallStage members={callMembers} title={callTitle} />
  );
  const callSurface = isMinimized ? (
    <DraggableMiniCall
      bottomInset={Math.max(insets.bottom, 18)}
      onExpand={() => {
        expandCall();
        router.push(`/friends/call/${activeCallId}`);
      }}>
      <MiniCallContent callTitle={callTitle} mode={callMode} />
    </DraggableMiniCall>
  ) : (
    <FullCallLayout
      bottomInset={insets.bottom}
      onMinimize={minimizeCall}
      subtitle={call?.circleId ? 'Call is active' : 'Waiting for others...'}
      title={callTitle}
      topInset={insets.top}
      controls={
        <CallControls
          isMicEnabled={isMicEnabled}
          isLeaving={isLeaving}
          mode={call?.mode}
          onEnd={handleLeave}
          onToggleMic={() => setIsMicEnabled((value) => !value)}
          onToggleVideo={() => setIsVideoEnabled((value) => !value)}
          shouldSendVideo={shouldSendVideo}
        />
      }>
      {fullRoomContent}
    </FullCallLayout>
  );

  if (connection) {
    return (
      <FriendLiveKitRoom
        callId={activeCallId}
        connection={connection}
        onRemoteParticipantCountChange={setRemoteParticipantCount}
        shouldSendAudio={isMicEnabled}
        shouldSendVideo={shouldSendVideo}>
        <CallerRingbackTone isPlaying={shouldPlayRingback} mode={callMode} />
        {callSurface}
      </FriendLiveKitRoom>
    );
  }

  if (isMinimized) {
    return (
      <DraggableMiniCall
        bottomInset={Math.max(insets.bottom, 18)}
        onExpand={() => {
          expandCall();
          router.push(`/friends/call/${activeCallId}`);
        }}>
        <CallerRingbackTone isPlaying={shouldPlayRingback} mode={callMode} />
        <MiniCallLoading label={loadError ?? 'Connecting'} />
      </DraggableMiniCall>
    );
  }

  return (
    <FullCallLayout
      bottomInset={insets.bottom}
      onMinimize={minimizeCall}
      subtitle={loadError ?? 'Connecting...'}
      title={callTitle}
      topInset={insets.top}
      controls={null}>
      <CallerRingbackTone isPlaying={shouldPlayRingback} mode={callMode} />
      <FullCallLoading label={loadError ?? 'Connecting...'} />
    </FullCallLayout>
  );
}

function CallerRingbackTone(_props: { isPlaying: boolean; mode: 'voice' | 'video' }) {
  return null;
}

function FriendLiveKitRoom({
  callId,
  children,
  connection,
  onRemoteParticipantCountChange,
  shouldSendAudio,
  shouldSendVideo,
}: {
  callId: Id<'friendCalls'>;
  children: ReactNode;
  connection: LiveKitConnection;
  onRemoteParticipantCountChange: (count: number) => void;
  shouldSendAudio: boolean;
  shouldSendVideo: boolean;
}) {
  return (
    <LiveKitRoom
      serverUrl={connection.serverUrl}
      token={connection.token}
      connect
      audio={shouldSendAudio}
      video={shouldSendVideo}
      options={FRIEND_CALL_ROOM_OPTIONS}>
      <NativeCallConnectionReporter callId={callId} />
      <RemoteParticipantCountReporter onChange={onRemoteParticipantCountChange} />
      {children}
    </LiveKitRoom>
  );
}

function RemoteParticipantCountReporter({ onChange }: { onChange: (count: number) => void }) {
  const remoteParticipants = useRemoteParticipants();

  useEffect(() => {
    onChange(remoteParticipants.length);
  }, [onChange, remoteParticipants.length]);

  return null;
}

function NativeCallConnectionReporter({ callId }: { callId: Id<'friendCalls'> }) {
  const room = useRoomContext();
  const connectionState = useConnectionState(room);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      markNativeCallConnected(callId);
    }
  }, [callId, connectionState]);

  return null;
}
