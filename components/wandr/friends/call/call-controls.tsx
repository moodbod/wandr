import {
  DotsThree,
  MicrophoneSlash,
  PhoneDisconnect,
  SpeakerHigh,
  VideoCamera,
  VideoCameraSlash,
} from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { designSystem } from '@/constants/design-system';

export function CallControls({
  isLeaving,
  mode,
  onEnd,
  onToggleVideo,
  shouldSendVideo,
  style,
}: {
  isLeaving: boolean;
  mode: 'voice' | 'video' | undefined;
  onEnd: () => void;
  onToggleVideo: () => void;
  shouldSendVideo: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.callControls, style]}>
      <CallControlButton icon={<DotsThree color={designSystem.colors.white} size={30} weight="bold" />} />
      {mode === 'video' ? (
        <CallControlButton
          icon={
            shouldSendVideo ? (
              <VideoCameraSlash color={designSystem.colors.white} size={30} weight="fill" />
            ) : (
              <VideoCamera color={designSystem.colors.white} size={30} weight="fill" />
            )
          }
          onPress={onToggleVideo}
        />
      ) : (
        <CallControlButton icon={<VideoCamera color={designSystem.colors.white} size={30} weight="fill" />} disabled />
      )}
      <CallControlButton icon={<SpeakerHigh color={designSystem.colors.black} size={30} weight="fill" />} tone="light" />
      <CallControlButton icon={<MicrophoneSlash color={designSystem.colors.white} size={30} weight="bold" />} />
      <CallControlButton
        disabled={isLeaving}
        icon={<PhoneDisconnect color={designSystem.colors.white} size={30} weight="fill" />}
        tone="danger"
        onPress={onEnd}
      />
    </View>
  );
}

function CallControlButton({
  disabled = false,
  icon,
  onPress,
  tone = 'default',
}: {
  disabled?: boolean;
  icon: ReactNode;
  onPress?: () => void;
  tone?: 'default' | 'light' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.controlButton,
        tone === 'light' ? styles.controlButtonLight : null,
        tone === 'danger' ? styles.controlButtonDanger : null,
        disabled ? styles.controlButtonDisabled : null,
      ]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  callControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  controlButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252525',
  },
  controlButtonLight: {
    backgroundColor: designSystem.colors.white,
  },
  controlButtonDanger: {
    backgroundColor: '#f3063d',
  },
  controlButtonDisabled: {
    opacity: 0.42,
  },
});
