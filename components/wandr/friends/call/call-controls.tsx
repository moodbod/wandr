import {
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
  VideoCamera,
  VideoCameraSlash,
} from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { designSystem } from '@/constants/design-system';

export function CallControls({
  isMicEnabled,
  isLeaving,
  mode,
  onEnd,
  onToggleMic,
  onToggleVideo,
  shouldSendVideo,
  style,
}: {
  isMicEnabled: boolean;
  isLeaving: boolean;
  mode: 'voice' | 'video' | undefined;
  onEnd: () => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  shouldSendVideo: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isVideoCall = mode === 'video';

  return (
    <View style={[styles.callControls, style]}>
      {isVideoCall ? (
        <CallControlButton
          accessibilityLabel={shouldSendVideo ? 'Turn camera off' : 'Turn camera on'}
          icon={
            shouldSendVideo ? (
              <VideoCameraSlash color={designSystem.colors.white} size={25} weight="fill" />
            ) : (
              <VideoCamera color={designSystem.colors.white} size={25} weight="fill" />
            )
          }
          onPress={onToggleVideo}
        />
      ) : null}
      <CallControlButton
        accessibilityLabel={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
        icon={
          isMicEnabled ? (
            <Microphone color={designSystem.colors.darkGreen} size={25} weight="fill" />
          ) : (
            <MicrophoneSlash color={designSystem.colors.white} size={25} weight="bold" />
          )
        }
        tone={isMicEnabled ? 'light' : 'default'}
        onPress={onToggleMic}
      />
      <CallControlButton
        accessibilityLabel="End call"
        disabled={isLeaving}
        icon={<PhoneDisconnect color={designSystem.colors.white} size={26} weight="fill" />}
        tone="danger"
        onPress={onEnd}
      />
    </View>
  );
}

function CallControlButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  tone = 'default',
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  icon: ReactNode;
  onPress?: () => void;
  tone?: 'default' | 'light' | 'danger';
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
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
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  controlButtonLight: {
    backgroundColor: 'rgba(249,249,246,0.94)',
    borderColor: 'rgba(249,249,246,0.72)',
  },
  controlButtonDanger: {
    backgroundColor: '#f3063d',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  controlButtonDisabled: {
    opacity: 0.42,
  },
});
