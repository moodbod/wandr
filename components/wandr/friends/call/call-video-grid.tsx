import { isTrackReference, useTracks, VideoTrack } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { CornersOut } from 'phosphor-react-native';
import { useMemo, type ComponentProps } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type TrackItem = ReturnType<typeof useTracks>[number];
type VideoTrackRef = ComponentProps<typeof VideoTrack>['trackRef'];

export function CallVideoGrid() {
  const tracks = useTracks([Track.Source.Camera]);
  const data = useMemo(() => tracks, [tracks]);

  const renderTrack: ListRenderItem<TrackItem> = ({ item }) => (
    <View style={styles.videoTile}>{isTrackReference(item) ? <VideoTrack trackRef={item} style={styles.video} /> : null}</View>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(item, index) => `${isTrackReference(item) ? item.participant.identity : 'placeholder'}-${index}`}
      renderItem={renderTrack}
      numColumns={2}
      contentContainerStyle={styles.videoGrid}
      columnWrapperStyle={styles.videoRow}
    />
  );
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
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 132,
    gap: 10,
  },
  videoRow: {
    gap: 10,
  },
  videoTile: {
    flex: 1,
    minHeight: 220,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#151515',
  },
  video: {
    flex: 1,
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
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900',
    color: designSystem.colors.white,
  },
  miniExpandIcon: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
});
