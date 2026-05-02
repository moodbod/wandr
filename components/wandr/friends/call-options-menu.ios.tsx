import { Button, Host, Menu } from '@expo/ui/swift-ui';
import { Phone } from 'phosphor-react-native';

import { GlassButton } from '@/components/ui/glass-button';
import type { CallOptionsMenuProps } from '@/components/wandr/friends/call-options-menu.types';

export function CallOptionsMenu({
  disabled = false,
  iconColor,
  onScheduleCall,
  onStartVideoCall,
  onStartVoiceCall,
}: CallOptionsMenuProps) {
  return (
    <Host matchContents>
      <Menu
        label={
          <GlassButton accessibilityLabel="Call options" disabled={disabled} width={48} height={48}>
            <Phone color={iconColor} size={20} weight="bold" />
          </GlassButton>
        }>
        <Button label="Voice Call" systemImage="phone" onPress={onStartVoiceCall} />
        <Button label="Video Call" systemImage="video" onPress={onStartVideoCall} />
        <Button label="Schedule Call" systemImage="calendar" onPress={onScheduleCall} />
      </Menu>
    </Host>
  );
}
