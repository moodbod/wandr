import { LiveKitRoom, RoomAudioRenderer, VideoTrack, isTrackReference, useRemoteParticipants, useTracks } from '@livekit/components-react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter, useSegments } from 'expo-router';
import { Track, VideoPresets, type MediaDeviceFailure, type RoomOptions } from 'livekit-client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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

const WEB_ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
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
    } else if (call?.mode === 'video') {
      setIsVideoEnabled(true);
    }
  }, [activeCallId, call?.mode]);

  useEffect(() => {
    if (activeCallId && call === null) {
      clearCall();
    }
  }, [activeCallId, call, clearCall]);

  const shouldSendVideo = call?.mode === 'video' && isVideoEnabled;
  const callMembers = (call?.members ?? []) as FriendCircleMember[];
  const callTitle = call?.circleName ?? call?.title ?? 'Wandr';
  const callMode = call?.mode ?? 'voice';
  const routeSegments: readonly string[] = segments;
  const isCallRoute = routeSegments[0] === 'friends' && routeSegments[1] === 'call';
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
            {callMode === 'video' ? (
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
  const videoCaptureOptions = shouldSendVideo ? (getWebCameraCaptureOptions() ?? true) : false;

  return (
    <LiveKitRoom
      serverUrl={connection.serverUrl}
      token={connection.token}
      connect
      audio={shouldSendAudio}
      video={videoCaptureOptions}
      options={WEB_ROOM_OPTIONS}
      onConnected={() => onMediaError(null)}
      onError={(error) => onMediaError(formatConnectionError(error))}
      onMediaDeviceFailure={(failure, kind) => onMediaError(formatMediaDeviceFailure(failure, kind))}>
      <RoomAudioRenderer />
      <WebRemoteParticipantCountReporter onChange={onRemoteParticipantCountChange} />
      {children}
    </LiveKitRoom>
  );
}

function formatConnectionError(error: unknown) {
  if (error instanceof Error && (error.message.includes('Signal connection aborted') || error.message.includes('Abort handler called'))) {
    return 'Call connection was interrupted. Trying again should reconnect.';
  }

  return error instanceof Error ? error.message : 'Unable to connect to this call.';
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

function formatMediaDeviceFailure(failure?: MediaDeviceFailure, kind?: MediaDeviceKind) {
  const deviceName = kind === 'audioinput' ? 'microphone' : 'camera';
  const error = failure ? new Error(String(failure)) : undefined;
  if (error) {
    error.name = String(failure);
  }

  return formatMediaError(error, deviceName);
}

function WebRemoteParticipantCountReporter({ onChange }: { onChange: (count: number) => void }) {
  const remoteParticipants = useRemoteParticipants();

  useEffect(() => {
    onChange(remoteParticipants.length);
  }, [onChange, remoteParticipants.length]);

  return null;
}

function WebMiniCall({
  callTitle,
  mode,
  onExpand,
}: {
  callTitle: string;
  mode: 'voice' | 'video';
  onExpand: () => void;
}) {
  const tracks = useTracks([Track.Source.Camera]);
  const localVideoTrack = tracks.find((track) => isTrackReference(track) && track.participant.isLocal);

  return (
    <WebMiniCallFrame onExpand={onExpand}>
      {mode === 'video' && localVideoTrack ? (
        <VideoTrack data-wandr-call-video="true" muted playsInline trackRef={localVideoTrack} style={videoStyle} />
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
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);

  if (mode !== 'video') {
    return null;
  }

  return (
    <View style={styles.videoGrid}>
      {tracks.slice(0, 9).map((track) => (
        <View key={`${track.participant.identity}:${track.source}`} style={styles.videoTile}>
          {isTrackReference(track) ? (
            <VideoTrack data-wandr-call-video="true" muted={track.participant.isLocal} playsInline trackRef={track} style={videoStyle} />
          ) : (
            <ParticipantVideoPlaceholder fallbackName={track.participant.name || track.participant.identity || callTitle} />
          )}
        </View>
      ))}
    </View>
  );
}

function ParticipantVideoPlaceholder({ fallbackName }: { fallbackName: string }) {
  const initial = fallbackName.charAt(0).toUpperCase();

  return (
    <View style={styles.videoPlaceholder}>
      <ThemedText style={styles.videoPlaceholderInitial}>{initial}</ThemedText>
    </View>
  );
}

const videoStyle = {
  height: '100%',
  objectFit: 'cover',
  width: '100%',
} satisfies CSSProperties;

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
