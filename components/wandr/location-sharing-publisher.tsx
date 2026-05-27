import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentLocationSharingSetting } from '@/hooks/use-current-user-settings';
import { useSharedLocationPublishingForSetting } from '@/hooks/use-shared-location-publishing';
import { useAuthSession } from '@/providers/auth-session';

type ActiveLocationSharing = 'whileUsing' | 'tripOnly';

export function LocationSharingPublisherGate() {
  const { session } = useAuthSession();
  const locationSharing = useCurrentLocationSharingSetting();

  if (!session || !isActiveLocationSharing(locationSharing)) {
    return null;
  }

  return <LocationSharingPublisher locationSharing={locationSharing} />;
}

function LocationSharingPublisher({ locationSharing }: { locationSharing: ActiveLocationSharing }) {
  const currentLocation = useCurrentLocation();
  useSharedLocationPublishingForSetting(currentLocation, locationSharing);

  return null;
}

function isActiveLocationSharing(value: unknown): value is ActiveLocationSharing {
  return value === 'whileUsing' || value === 'tripOnly';
}
