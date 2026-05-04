import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';

import {
  ProfileSettingScreen,
  SettingOptionGroup,
  SettingSwitchRow,
} from '@/components/wandr/profile/profile-setting-screen';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { updatePrivacySettingsRef } from '@/lib/convex';

type ProfileVisibility = 'friends' | 'public' | 'private';
type LocationSharing = 'off' | 'whileUsing' | 'tripOnly';

const visibilityOptions = [
  { label: 'Friends', value: 'friends' },
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
] as const;

const locationOptions = [
  { label: 'Off', value: 'off' },
  { label: 'While using', value: 'whileUsing' },
  { label: 'Trips only', value: 'tripOnly' },
] as const;

export default function PrivacyScreen() {
  const traveler = useCurrentTraveler();
  const settings = useCurrentUserSettings();
  const updatePrivacySettings = useMutation(updatePrivacySettingsRef);
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>('friends');
  const [showSavedPlaces, setShowSavedPlaces] = useState(true);
  const [showTripActivity, setShowTripActivity] = useState(false);
  const [locationSharing, setLocationSharing] = useState<LocationSharing>('tripOnly');

  useEffect(() => {
    if (!settings) {
      return;
    }

    setProfileVisibility(settings.profileVisibility);
    setShowSavedPlaces(settings.showSavedPlaces);
    setShowTripActivity(settings.showTripActivity);
    setLocationSharing(settings.locationSharing);
  }, [settings]);

  const savePrivacy = async ({
    nextProfileVisibility = profileVisibility,
    nextShowSavedPlaces = showSavedPlaces,
    nextShowTripActivity = showTripActivity,
    nextLocationSharing = locationSharing,
  }: {
    nextProfileVisibility?: ProfileVisibility;
    nextShowSavedPlaces?: boolean;
    nextShowTripActivity?: boolean;
    nextLocationSharing?: LocationSharing;
  }) => {
    if (!traveler?.slug) {
      return;
    }

    try {
      await updatePrivacySettings({
        travelerSlug: traveler.slug,
        profileVisibility: nextProfileVisibility,
        showSavedPlaces: nextShowSavedPlaces,
        showTripActivity: nextShowTripActivity,
        locationSharing: nextLocationSharing,
      });
    } catch (error) {
      console.error('Failed to update privacy settings', error);
    }
  };

  return (
    <ProfileSettingScreen title="Privacy" bottomNote="Changes apply to this traveler profile.">
      <SettingOptionGroup
        label="Profile visibility"
        options={visibilityOptions}
        value={profileVisibility}
        onChange={(nextProfileVisibility) => {
          setProfileVisibility(nextProfileVisibility);
          void savePrivacy({ nextProfileVisibility });
        }}
      />
      <SettingSwitchRow
        label="Show saved places"
        value={showSavedPlaces}
        onValueChange={(nextShowSavedPlaces) => {
          setShowSavedPlaces(nextShowSavedPlaces);
          void savePrivacy({ nextShowSavedPlaces });
        }}
      />
      <SettingSwitchRow
        label="Show trip activity"
        value={showTripActivity}
        onValueChange={(nextShowTripActivity) => {
          setShowTripActivity(nextShowTripActivity);
          void savePrivacy({ nextShowTripActivity });
        }}
      />
      <SettingOptionGroup
        label="Location sharing"
        options={locationOptions}
        value={locationSharing}
        onChange={(nextLocationSharing) => {
          setLocationSharing(nextLocationSharing);
          void savePrivacy({ nextLocationSharing });
        }}
      />
    </ProfileSettingScreen>
  );
}
