import {
  ProfileSettingScreen,
  SettingField,
} from '@/components/wandr/profile/profile-setting-screen';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';

export default function EditProfileScreen() {
  const traveler = useCurrentTraveler();

  return (
    <ProfileSettingScreen title="Edit profile" description="Manage the traveler details shown across Wandr.">
      <SettingField label="Name" value={traveler?.name ?? ''} />
      <SettingField label="Home base" value={traveler?.regionName ?? traveler?.countryLabel ?? ''} />
      <SettingField label="Phone" value={traveler?.phoneNumber ?? ''} />
    </ProfileSettingScreen>
  );
}
