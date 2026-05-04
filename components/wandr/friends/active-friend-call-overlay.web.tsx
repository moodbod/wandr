import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter, useSegments } from 'expo-router';
import { Room, RoomEvent, Track, createLocalAudioTrack, createLocalVideoTrack, type LocalTrack, type Participant, type RemoteTrackPublication, type RemoteTrack } from 'livekit-client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CallControls } from '@/components/wandr/friends/call/call-controls';
import { FullCallLoading, MiniCallLoading } from '@/components/wandr/friends/call/call-loading';
import { FullCallLayout } from '@/components/wandr/friends/call/full-call-layout';
import { VoiceCallStage } from '@/components/wandr/friends/call/voice-call-stage';
import { designSystem } from '@/constants/design-system';
import { useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import {
  createFriendCallTokenRef,
  endFriendCallRef,
  getFriendCallRef,
  joinScheduledFriendCallRef,
} from '@/lib/convex';
import type { FriendCircleMember } from '@/types/friends';

type LiveKitConnection = {
  serverUrl: string;
  token: string;
  roomName: string;
};

export default function ActiveFriendCallOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
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
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);
  const preparedCallKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeCallId) {
      setConnection(null);
      setRemoteParticipantCount(0);
      preparedCallKeyRef.current = null;
    }
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

  useEffect(() => {
    if (activeCallId && call === null) {
      clearCall();
    }
  }, [activeCallId, call, clearCall]);

  const shouldSendVideo = call?.mode === 'video' && isVideoEnabled;
  const callMembers = (call?.members ?? []) as FriendCircleMember[];
  const callTitle = call?.circleName ?? call?.title ?? 'Wandr';
  const callMode = call?.mode ?? 'voice';
  const isCallRoute = segments[0] === 'friends' && segments[1] === 'call';
  const shouldShowMiniCall = isMinimized || !isCallRoute;
  const handleExpand = useCallback(() => {
    if (!activeCallId) {
      return;
    }

    expandCall();
    router.push(`/friends/call/${activeCallId}`);
  }, [activeCallId, expandCall, router]);

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

  if (connection) {
    return (
      <WebLiveKitRoom
        connection={connection}
        onMediaError={setMediaError}
        onRemoteParticipantCountChange={setRemoteParticipantCount}
        shouldSendAudio={isMicEnabled}
        shouldSendVideo={shouldSendVideo}>
        {shouldShowMiniCall ? (
          <WebMiniCall callTitle={callTitle} mode={callMode} onExpand={handleExpand} />
        ) : (
          <FullCallLayout
            bottomInset={insets.bottom}
            onMinimize={minimizeCall}
            subtitle={
              mediaError ?? (remoteParticipantCount > 0 ? 'Call is active' : call?.circleId ? 'Call is active' : 'Waiting for others...')
            }
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
            {shouldSendVideo ? (
              <WebVideoStage callTitle={callTitle} mode={callMode} />
            ) : (
              <VoiceCallStage members={callMembers} title={callTitle} />
            )}
          </FullCallLayout>
        )}
      </WebLiveKitRoom>
    );
  }

  if (shouldShowMiniCall) {
    return (
      <WebMiniCallFrame onExpand={handleExpand}>
        <MiniCallLoading label={loadError ?? 'Connecting'} />
      </WebMiniCallFrame>
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
      <FullCallLoading label={loadError ?? 'Connecting...'} />
    </FullCallLayout>
  );
}

function WebLiveKitRoom({
  children,
  connection,
  onMediaError,
  onRemoteParticipantCountChange,
  shouldSendAudio,
  shouldSendVideo,
}: {
  children: ReactNode;
  connection: LiveKitConnection;
  onMediaError: (error: string | null) => void;
  onRemoteParticipantCountChange: (count: number) => void;
  shouldSendAudio: boolean;
  shouldSendVideo: boolean;
}) {
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<LocalTrack[]>([]);
  const remoteAudioElementsRef = useRef(new Map<string, HTMLAudioElement>());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    let cancelled = false;
    const remoteAudioElements = remoteAudioElementsRef.current;

    roomRef.current = room;

    async function connectRoom() {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await room.connect(connection.serverUrl, connection.token);
          if (cancelled) {
            return;
          }
          setIsConnected(true);
          onMediaError(null);
          onRemoteParticipantCountChange(room.remoteParticipants.size);
          return;
        } catch (error) {
          if (cancelled || isClientInitiatedDisconnect(error)) {
            return;
          }

          if (isLiveKitSignalAbort(error) && attempt === 0) {
            await delay(250);
            continue;
          }

          onMediaError(formatConnectionError(error));
          return;
        }
      }
    }

    const reportParticipants = () => onRemoteParticipantCountChange(room.remoteParticipants.size);
    const handleTrackSubscribed = (track: RemoteTrack, publication?: RemoteTrackPublication) => {
      if (track.kind !== Track.Kind.Audio) {
        return;
      }

      const trackKey = publication?.trackSid ?? track.sid;
      if (!trackKey) {
        return;
      }

      const audioElement = track.attach() as HTMLAudioElement;
      audioElement.autoplay = true;
      audioElement.dataset.livekitAudio = 'true';
      document.body.appendChild(audioElement);
      remoteAudioElements.set(trackKey, audioElement);
    };
    const handleTrackUnsubscribed = (track: RemoteTrack, publication?: RemoteTrackPublication) => {
      const trackKey = publication?.trackSid ?? track.sid;
      if (!trackKey) {
        return;
      }

      const audioElement = remoteAudioElements.get(trackKey);
      if (!audioElement) {
        return;
      }

      track.detach(audioElement);
      audioElement.remove();
      remoteAudioElements.delete(trackKey);
    };
    room.on(RoomEvent.ParticipantConnected, reportParticipants);
    room.on(RoomEvent.ParticipantDisconnected, reportParticipants);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    void connectRoom();

    return () => {
      cancelled = true;
      room.off(RoomEvent.ParticipantConnected, reportParticipants);
      room.off(RoomEvent.ParticipantDisconnected, reportParticipants);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      localTracksRef.current.forEach((track) => track.stop());
      localTracksRef.current = [];
      remoteAudioElements.forEach((audioElement) => audioElement.remove());
      remoteAudioElements.clear();
      room.disconnect();
      roomRef.current = null;
      setIsConnected(false);
      onMediaError(null);
      onRemoteParticipantCountChange(0);
    };
  }, [connection.serverUrl, connection.token, onMediaError, onRemoteParticipantCountChange]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || !isConnected) {
      return;
    }
    const liveRoom = room;

    let cancelled = false;
    async function enableAudio() {
      const existingAudio = localTracksRef.current.find((track) => track.source === Track.Source.Microphone);
      if (existingAudio) {
        return;
      }

      try {
        const audioTrack = await createLocalAudioTrack();
        if (cancelled) {
          audioTrack.stop();
          return;
        }
        localTracksRef.current.push(audioTrack);
        await liveRoom.localParticipant.publishTrack(audioTrack);
      } catch (error) {
        if (!cancelled) {
          onMediaError(formatMediaError(error, 'microphone'));
        }
      }
    }

    async function disableAudio() {
      const existingAudio = localTracksRef.current.find((track) => track.source === Track.Source.Microphone);
      if (!existingAudio) {
        return;
      }

      liveRoom.localParticipant.unpublishTrack(existingAudio);
      existingAudio.stop();
      localTracksRef.current = localTracksRef.current.filter((track) => track !== existingAudio);
    }

    async function enableVideo() {
      const existingVideo = localTracksRef.current.find((track) => track.source === Track.Source.Camera);
      if (existingVideo) {
        onMediaError(null);
        return;
      }

      try {
        assertCameraCanStart();
        const videoTrack = await createLocalVideoTrack(getWebCameraCaptureOptions());
        if (cancelled) {
          videoTrack.stop();
          return;
        }
        localTracksRef.current.push(videoTrack);
        await liveRoom.localParticipant.publishTrack(videoTrack);
        onMediaError(null);
      } catch (error) {
        if (!cancelled) {
          onMediaError(formatMediaError(error, 'camera'));
        }
      }
    }

    async function disableVideo() {
      const existingVideo = localTracksRef.current.find((track) => track.source === Track.Source.Camera);
      if (!existingVideo) {
        return;
      }

      liveRoom.localParticipant.unpublishTrack(existingVideo);
      existingVideo.stop();
      localTracksRef.current = localTracksRef.current.filter((track) => track !== existingVideo);
      onMediaError(null);
    }

    async function syncLocalTracks() {
      const tasks = [
        shouldSendVideo ? enableVideo() : disableVideo(),
        shouldSendAudio ? enableAudio() : disableAudio(),
      ];

      await Promise.all(tasks);
    }

    void syncLocalTracks();
    return () => {
      cancelled = true;
    };
  }, [isConnected, onMediaError, shouldSendAudio, shouldSendVideo]);

  return <LiveKitWebRoomContext.Provider value={roomRef}>{children}</LiveKitWebRoomContext.Provider>;
}

function isClientInitiatedDisconnect(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message === 'Client initiated disconnect' || error.name === 'AbortError';
}

function isLiveKitSignalAbort(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('Signal connection aborted') || error.message.includes('Abort handler called');
}

function formatConnectionError(error: unknown) {
  if (isLiveKitSignalAbort(error)) {
    return 'Call connection was interrupted. Trying again should reconnect.';
  }

  return error instanceof Error ? error.message : 'Unable to connect to this call.';
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assertCameraCanStart() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera capture is not supported in this browser.');
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('Camera requires HTTPS on mobile browsers. Open Wandr over HTTPS or localhost.');
  }
}

function getWebCameraCaptureOptions() {
  return isMobileWebRuntime() ? { facingMode: 'user' as const } : undefined;
}

function isMobileWebRuntime() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  const hasMobileUserAgent = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const hasTouchOnlyViewport = navigator.maxTouchPoints > 1 && typeof window !== 'undefined' && window.innerWidth < 900;

  return hasMobileUserAgent || hasTouchOnlyViewport;
}

function formatMediaError(error: unknown, deviceName: 'camera' | 'microphone') {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return `Allow ${deviceName} access to show your ${deviceName === 'camera' ? 'camera' : 'audio'}.`;
    }

    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return `No ${deviceName} was found for this browser.`;
    }

    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return `Your ${deviceName} is being used by another app.`;
    }

    return error.message;
  }

  return `Unable to start the ${deviceName}.`;
}

const LiveKitWebRoomContext = createContext<MutableRefObject<Room | null> | null>(null);

function WebMiniCall({
  callTitle,
  mode,
  onExpand,
}: {
  callTitle: string;
  mode: 'voice' | 'video';
  onExpand: () => void;
}) {
  const roomContext = useContext(LiveKitWebRoomContext);
  const [version, setVersion] = useState(0);
  const room = roomContext?.current ?? null;
  const participant = room ? room.localParticipant : null;
  void version;

  useEffect(() => {
    if (!room) {
      return;
    }

    const refresh = () => setVersion((value) => value + 1);
    room.on(RoomEvent.LocalTrackPublished, refresh);
    room.on(RoomEvent.LocalTrackUnpublished, refresh);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, refresh);
      room.off(RoomEvent.LocalTrackUnpublished, refresh);
    };
  }, [room]);

  return (
    <WebMiniCallFrame onExpand={onExpand}>
      {mode === 'video' && participant ? (
        <ParticipantVideo participant={participant} fallbackName={participant.name || participant.identity || callTitle} />
      ) : (
        <View style={styles.miniVoice}>
          <ThemedText style={styles.miniInitial}>{callTitle.charAt(0).toUpperCase()}</ThemedText>
        </View>
      )}
    </WebMiniCallFrame>
  );
}

function WebMiniCallFrame({ children, onExpand }: { children: ReactNode; onExpand: () => void }) {
  return (
    <View style={styles.miniCallWrap}>
      <Pressable accessibilityLabel="Expand call" accessibilityRole="button" onPress={onExpand} style={styles.miniCallPressable}>
        {children}
      </Pressable>
    </View>
  );
}

function WebVideoStage({ callTitle, mode }: { callTitle: string; mode: 'voice' | 'video' }) {
  const roomContext = useContext(LiveKitWebRoomContext);
  const [version, setVersion] = useState(0);
  const room = roomContext?.current ?? null;
  const participants = room ? [room.localParticipant, ...Array.from(room.remoteParticipants.values())] : [];
  void version;

  useEffect(() => {
    if (!room) {
      return;
    }

    const refresh = () => setVersion((value) => value + 1);
    room.on(RoomEvent.TrackSubscribed, refresh);
    room.on(RoomEvent.TrackUnsubscribed, refresh);
    room.on(RoomEvent.LocalTrackPublished, refresh);
    room.on(RoomEvent.LocalTrackUnpublished, refresh);
    room.on(RoomEvent.ParticipantConnected, refresh);
    room.on(RoomEvent.ParticipantDisconnected, refresh);

    return () => {
      room.off(RoomEvent.TrackSubscribed, refresh);
      room.off(RoomEvent.TrackUnsubscribed, refresh);
      room.off(RoomEvent.LocalTrackPublished, refresh);
      room.off(RoomEvent.LocalTrackUnpublished, refresh);
      room.off(RoomEvent.ParticipantConnected, refresh);
      room.off(RoomEvent.ParticipantDisconnected, refresh);
    };
  }, [room]);

  if (mode !== 'video') {
    return null;
  }

  return (
    <View style={styles.videoGrid}>
      {participants.slice(0, 9).map((participant) => (
        <View key={participant.identity} style={styles.videoTile}>
          <ParticipantVideo participant={participant} fallbackName={participant.name || participant.identity || callTitle} />
        </View>
      ))}
    </View>
  );
}

function ParticipantVideo({ fallbackName, participant }: { fallbackName: string; participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const publication = Array.from(participant.videoTrackPublications.values()).find((item) => item.track) as RemoteTrackPublication | undefined;
  const initial = fallbackName.charAt(0).toUpperCase();

  useEffect(() => {
    const element = videoRef.current;
    const track = publication?.track;
    if (!element || !track) {
      return;
    }

    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [publication?.track]);

  return publication?.track ? (
    <video autoPlay data-wandr-call-video="true" muted={participant.isLocal} playsInline ref={videoRef} style={videoStyle} />
  ) : (
    <View style={styles.videoPlaceholder}>
      <ThemedText style={styles.videoPlaceholderInitial}>{initial}</ThemedText>
    </View>
  );
}

const videoStyle = {
  height: '100%',
  objectFit: 'cover',
  width: '100%',
} satisfies React.CSSProperties;

const styles = StyleSheet.create({
  videoGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 132,
  },
  videoTile: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#050704',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  videoPlaceholderInitial: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  miniCallWrap: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    zIndex: 1001,
    width: 120,
    height: 144,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111',
    boxShadow: '0 18px 40px rgba(0,0,0,0.32)',
  },
  miniCallPressable: {
    flex: 1,
  },
  miniVoice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  miniInitial: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
});
