import { isTrackReference, useTracks, VideoTrack } from '@livekit/react-native';
import { startIOSPIP } from '@livekit/react-native-webrtc';
import { Track } from 'livekit-client';
import { CornersOut } from 'phosphor-react-native';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState, type Component, type ComponentProps } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type TrackItem = ReturnType<typeof useTracks>[number];
type VideoTrackRef = ComponentProps<typeof VideoTrack>['trackRef'];
type NativeVideoTrackRef = ComponentProps<typeof VideoTrack>['ref'];

export type CallVideoGridHandle = {
  startPictureInPicture: () => boolean;
};

export const CallVideoGrid = forwardRef<CallVideoGridHandle>(function CallVideoGrid(_props, ref) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const primaryVideoRef = useRef<Component | null>(null);
  const data = useMemo(() => tracks.slice(0, 9), [tracks]);
  const frames = useMemo(() => getVideoTileFrames(data.length, layout.width, layout.height), [data.length, layout]);

  useImperativeHandle(ref, () => ({
    startPictureInPicture: () => {
      if (Platform.OS !== 'ios' || !primaryVideoRef.current) {
        return false;
      }

      startIOSPIP(primaryVideoRef);
      return true;
    },
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setLayout((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  return (
    <View style={styles.videoGrid}>
      <View onLayout={handleLayout} style={styles.videoStage}>
        {data.map((item, index) => (
          <View key={getTrackKey(item, index)} style={[styles.videoTile, frames[index]]}>
            {isTrackReference(item) ? (
              <VideoTrack
                iosPIP={getPictureInPictureOptions(index)}
                objectFit="cover"
                ref={index === 0 ? (primaryVideoRef as NativeVideoTrackRef) : undefined}
                trackRef={item}
                style={styles.video}
              />
            ) : (
              <ParticipantVideoPlaceholder item={item} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
});

function getPictureInPictureOptions(index: number) {
  if (Platform.OS !== 'ios' || index !== 0) {
    return undefined;
  }

  return {
    enabled: true,
    preferredSize: {
      width: 9,
      height: 16,
    },
    startAutomatically: true,
    stopAutomatically: true,
  };
}

function ParticipantVideoPlaceholder({ item }: { item: TrackItem }) {
  const name = item.participant.name || item.participant.identity || 'Wandr';
  const initial = name.charAt(0).toUpperCase();

  return (
    <View style={styles.videoPlaceholder}>
      <ThemedText style={styles.videoPlaceholderInitial}>{initial}</ThemedText>
    </View>
  );
}

function getTrackKey(item: TrackItem, index: number) {
  const trackId = isTrackReference(item) ? item.publication.trackSid : item.source;
  return `${item.participant.identity}-${trackId}-${index}`;
}

function getVideoTileFrames(count: number, width: number, height: number): ViewStyle[] {
  if (count === 0 || width <= 0 || height <= 0) {
    return [];
  }

  const gap = count === 1 ? 0 : 8;
  const frame = (left: number, top: number, tileWidth: number, tileHeight: number): ViewStyle => ({
    height: tileHeight,
    left,
    position: 'absolute',
    top,
    width: tileWidth,
  });

  if (count === 1) {
    return [frame(0, 0, width, height)];
  }

  const isLandscape = width > height;
  if (count === 2) {
    if (isLandscape) {
      const tileWidth = (width - gap) / 2;
      return [frame(0, 0, tileWidth, height), frame(tileWidth + gap, 0, tileWidth, height)];
    }
    const tileHeight = (height - gap) / 2;
    return [frame(0, 0, width, tileHeight), frame(0, tileHeight + gap, width, tileHeight)];
  }

  if (count === 3) {
    if (isLandscape) {
      const primaryWidth = (width - gap) * 0.6;
      const secondaryWidth = width - primaryWidth - gap;
      const secondaryHeight = (height - gap) / 2;
      return [
        frame(0, 0, primaryWidth, height),
        frame(primaryWidth + gap, 0, secondaryWidth, secondaryHeight),
        frame(primaryWidth + gap, secondaryHeight + gap, secondaryWidth, secondaryHeight),
      ];
    }

    const primaryHeight = (height - gap) * 0.6;
    const secondaryHeight = height - primaryHeight - gap;
    const secondaryWidth = (width - gap) / 2;
    return [
      frame(0, 0, width, primaryHeight),
      frame(0, primaryHeight + gap, secondaryWidth, secondaryHeight),
      frame(secondaryWidth + gap, primaryHeight + gap, secondaryWidth, secondaryHeight),
    ];
  }

  const columns = count <= 4 ? 2 : Math.ceil(Math.sqrt(count * (width / Math.max(height, 1))));
  const rows = Math.ceil(count / columns);
  const tileWidth = (width - gap * (columns - 1)) / columns;
  const tileHeight = (height - gap * (rows - 1)) / rows;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return frame(column * (tileWidth + gap), row * (tileHeight + gap), tileWidth, tileHeight);
  });
}

export function MiniCallContent({ callTitle, mode }: { callTitle: string; mode: 'voice' | 'video' }) {
  const tracks = useTracks([Track.Source.Camera]);
  const firstTrack = tracks.find(isTrackReference) as VideoTrackRef | undefined;

  if (mode === 'video' && firstTrack) {
    return <VideoTrack trackRef={firstTrack} style={styles.miniVideo} />;
  }

  return (
    <View style={styles.miniVoice}>
      <ThemedText style={styles.miniInitial}>{callTitle.charAt(0).toUpperCase()}</ThemedText>
      <CornersOut color={designSystem.colors.white} size={16} weight="bold" style={styles.miniExpandIcon} />
    </View>
  );
}

const styles = StyleSheet.create({
  videoGrid: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 132,
  },
  videoStage: {
    flex: 1,
  },
  videoTile: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#050704',
  },
  video: {
    flex: 1,
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
  miniVideo: {
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
  miniExpandIcon: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
});
