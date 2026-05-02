import { SettingRow, ProfileSettingScreen } from '@/components/wandr/profile/profile-setting-screen';

export default function PrivacyScreen() {
  return (
    <ProfileSettingScreen
      title="Privacy"
      description="Control what other travelers can see and how your trip activity is used.">
      <SettingRow
        label="Profile visibility"
        description="Your profile is visible to people you connect with."
        value="Friends"
      />
      <SettingRow
        label="Trip activity"
        description="Trip progress and saved places stay private unless shared."
        value="Private"
      />
      <SettingRow
        label="Location"
        description="Live location is only used for nearby maps and active trip context."
        value="While using"
      />
    </ProfileSettingScreen>
  );
}
