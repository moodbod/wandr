import { getAppMetadata } from '@/lib/app-metadata';
import { ProfileSettingScreen, SettingRow } from '@/components/wandr/profile/profile-setting-screen';

export default function AccountScreen() {
  const metadata = getAppMetadata();

  return (
    <ProfileSettingScreen
      title="Account"
      description="Review account, security, and application details.">
      <SettingRow label="App" description={metadata.appDescription} value={metadata.appName} />
      <SettingRow
        label="Version"
        description="Pulled from the installed app metadata."
        value={metadata.versionLabel ?? 'Development'}
      />
      <SettingRow
        label="Security"
        description="Authentication controls will appear here when sign-in is connected."
        value="Local"
      />
    </ProfileSettingScreen>
  );
}
