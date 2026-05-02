import { AudioSession, LiveKitRoom, registerGlobals } from '@livekit/react-native';
import { VideoPresets } from 'livekit-client';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallControls } from '@/components/wandr/friends/call/call-controls';
import { FullCallLoading, MiniCallLoading } from '@/components/wandr/friends/call/call-loading';
import { CallVideoGrid, MiniCallContent } from '@/components/wandr/friends/call/call-video-grid';
import { DraggableMiniCall } from '@/components/wandr/friends/call/draggable-mini-call';
import { FullCallLayout } from '@/components/wandr/friends/call/full-call-layout';
import { VoiceCallStage } from '@/components/wandr/friends/call/voice-call-stage';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import {
  createFriendCallTokenRef,
  endFriendCallRef,
  getFriendCallRef,
  joinScheduledFriendCallRef,
} from '@/lib/convex';

registerGlobals();

type LiveKitConnection = {
  serverUrl: string;
  token: string;
  roomName: string;
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
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!activeCallId) {
      setConnection(null);
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
      await endCall({ callId: activeCallId, travelerSlug: traveler.slug });
    } finally {
      clearCall();
      setIsLeaving(false);
    }
  };

  const shouldSendVideo = call?.mode === 'video' && isVideoEnabled;
  const memberAvatars = call?.members.flatMap((member) => (member.avatarUri ? [member.avatarUri] : [])) ?? [];
  const callTitle = call?.circleName ?? call?.title ?? 'Wandr';
  const callMode = call?.mode ?? 'voice';
  const roomContent = isMinimized ? (
    <MiniCallContent callTitle={callTitle} mode={callMode} />
  ) : shouldSendVideo ? (
    <CallVideoGrid />
  ) : (
    <VoiceCallStage memberAvatars={memberAvatars} title={callTitle} />
  );

  const room = connection ? (
    <FriendLiveKitRoom connection={connection} shouldSendVideo={shouldSendVideo}>
      {roomContent}
    </FriendLiveKitRoom>
  ) : null;

  if (isMinimized) {
    return (
      <DraggableMiniCall
        bottomInset={Math.max(insets.bottom, 18)}
        onExpand={() => {
          expandCall();
          router.push(`/friends/call/${activeCallId}`);
        }}>
        {room ?? <MiniCallLoading label={loadError ?? 'Connecting'} />}
      </DraggableMiniCall>
    );
  }

  return (
    <FullCallLayout
      bottomInset={insets.bottom}
      onMinimize={minimizeCall}
      subtitle={connection ? 'Waiting for others...' : loadError ?? 'Connecting...'}
      title={callTitle}
      topInset={insets.top}
      controls={
        <CallControls
          isLeaving={isLeaving}
          mode={call?.mode}
          onEnd={handleLeave}
          onToggleVideo={() => setIsVideoEnabled((value) => !value)}
          shouldSendVideo={shouldSendVideo}
        />
      }>
      {room ?? <FullCallLoading label={loadError ?? 'Preparing secure call room...'} />}
    </FullCallLayout>
  );
}

function FriendLiveKitRoom({
  children,
  connection,
  shouldSendVideo,
}: {
  children: ReactNode;
  connection: LiveKitConnection;
  shouldSendVideo: boolean;
}) {
  return (
    <LiveKitRoom
      serverUrl={connection.serverUrl}
      token={connection.token}
      connect
      audio
      video={shouldSendVideo}
      options={{
        adaptiveStream: { pixelDensity: 'screen' },
        dynacast: true,
        publishDefaults: {
          videoEncoding: {
            maxBitrate: 500_000,
            maxFramerate: 20,
          },
          videoSimulcastLayers: [VideoPresets.h180],
        },
      }}>
      {children}
    </LiveKitRoom>
  );
}
