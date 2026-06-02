import { GroupSummaryCard } from '@/components/wandr/group-summary-card';
import type { TripGroupDetails } from '@/types/trip';

export function TripGroupPanel({
  group,
  onOpenChat,
}: {
  group: TripGroupDetails;
  onOpenChat: () => void;
}) {
  const activeMembers = group.members.filter((member) => member.status === 'active');
  const activeCount = activeMembers.length > 0 ? activeMembers.length : group.memberCount;
  const avatars = activeMembers.map((member) => ({
    name: member.name,
    paletteKey: member.travelerSlug,
    uri: member.avatarUri,
  }));
  const firstActiveMember = activeMembers[0];

  return (
    <GroupSummaryCard
      accessibilityLabel={`Open ${group.name} chat`}
      avatars={avatars}
      destinationLabel={group.destinationLabel}
      fallbackName={firstActiveMember?.name ?? group.name}
      fallbackPaletteKey={firstActiveMember?.travelerSlug ?? group.circleId}
      memberCount={group.memberCount}
      memberLabel={`${activeCount} active`}
      onPress={onOpenChat}
      title={group.name}
    />
  );
}
