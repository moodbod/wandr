import { Button, ContextMenu, Host } from '@expo/ui/jetpack-compose';
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
      <ContextMenu>
        <ContextMenu.Items>
          <Button leadingIcon="rounded.Phone" onPress={onStartVoiceCall}>Voice Call</Button>
          <Button leadingIcon="rounded.Call" onPress={onStartVideoCall}>Video Call</Button>
          <Button leadingIcon="rounded.DateRange" onPress={onScheduleCall}>Schedule Call</Button>
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <GlassButton accessibilityLabel="Call options" disabled={disabled} width={48} height={48}>
            <Phone color={iconColor} size={20} weight="bold" />
          </GlassButton>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}
