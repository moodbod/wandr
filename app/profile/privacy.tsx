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
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>('public');
  const [showSavedPlaces, setShowSavedPlaces] = useState(true);
  const [showTripActivity, setShowTripActivity] = useState(false);
  const [locationSharing, setLocationSharing] = useState<LocationSharing>('off');
  const [showOtherUsersLiveLocation, setShowOtherUsersLiveLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setProfileVisibility(settings.profileVisibility);
    setShowSavedPlaces(settings.showSavedPlaces);
    setShowTripActivity(settings.showTripActivity);
    setLocationSharing(settings.locationSharing);
    setShowOtherUsersLiveLocation(settings.showOtherUsersLiveLocation);
  }, [settings]);

  const savePrivacy = async ({
    nextProfileVisibility = profileVisibility,
    nextShowSavedPlaces = showSavedPlaces,
    nextShowTripActivity = showTripActivity,
    nextLocationSharing = locationSharing,
    nextShowOtherUsersLiveLocation = showOtherUsersLiveLocation,
  }: {
    nextProfileVisibility?: ProfileVisibility;
    nextShowSavedPlaces?: boolean;
    nextShowTripActivity?: boolean;
    nextLocationSharing?: LocationSharing;
    nextShowOtherUsersLiveLocation?: boolean;
  }) => {
    if (!traveler?.slug) {
      return;
    }

    setIsSaving(true);
    setErrorText(null);
    try {
      await updatePrivacySettings({
        travelerSlug: traveler.slug,
        profileVisibility: nextProfileVisibility,
        showSavedPlaces: nextShowSavedPlaces,
        showTripActivity: nextShowTripActivity,
        locationSharing: nextLocationSharing,
        showOtherUsersLiveLocation: nextShowOtherUsersLiveLocation,
      });
    } catch (error) {
      console.error('Failed to update privacy settings', error);
      setErrorText(error instanceof Error ? error.message : 'Could not save privacy settings.');
    } finally {
      setIsSaving(false);
    }
  };
  const canEdit = Boolean(traveler?.slug && settings && !isSaving);
  const bottomNote = errorText ?? (isSaving ? 'Saving...' : 'Changes save instantly.');

  return (
    <ProfileSettingScreen title="Privacy" bottomNote={bottomNote} description="Control who can find you and see your map location.">
      <SettingOptionGroup
        disabled={!canEdit}
        label="Profile visibility"
        options={visibilityOptions}
        value={profileVisibility}
        onChange={(nextProfileVisibility) => {
          setProfileVisibility(nextProfileVisibility);
          void savePrivacy({ nextProfileVisibility });
        }}
      />
      <SettingSwitchRow
        description="Let other travelers see places you have saved."
        disabled={!canEdit}
        label="Show saved places"
        value={showSavedPlaces}
        onValueChange={(nextShowSavedPlaces) => {
          setShowSavedPlaces(nextShowSavedPlaces);
          void savePrivacy({ nextShowSavedPlaces });
        }}
      />
      <SettingSwitchRow
        description="Let other travelers see recent trip activity when supported."
        disabled={!canEdit}
        label="Show trip activity"
        value={showTripActivity}
        onValueChange={(nextShowTripActivity) => {
          setShowTripActivity(nextShowTripActivity);
          void savePrivacy({ nextShowTripActivity });
        }}
      />
      <SettingOptionGroup
        disabled={!canEdit}
        label="Location sharing"
        options={locationOptions}
        value={locationSharing}
        onChange={(nextLocationSharing) => {
          setLocationSharing(nextLocationSharing);
          void savePrivacy({ nextLocationSharing });
        }}
      />
      <SettingSwitchRow
        description="Show live pucks from travelers who are sharing with you."
        disabled={!canEdit}
        label="Show other users live location"
        value={showOtherUsersLiveLocation}
        onValueChange={(nextShowOtherUsersLiveLocation) => {
          setShowOtherUsersLiveLocation(nextShowOtherUsersLiveLocation);
          void savePrivacy({ nextShowOtherUsersLiveLocation });
        }}
      />
    </ProfileSettingScreen>
  );
}
