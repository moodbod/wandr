import { useMutation } from 'convex/react';
import { type Href, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { type Country } from 'react-native-country-picker-modal';

import type { Id } from '@/convex/_generated/dataModel';
import { CountryPickerSheet } from '@/components/wandr/country-picker-field';
import {
  ProfileSettingScreen,
  SettingActionRow,
  SettingFormSection,
  SettingOptionGroup,
  SettingRow,
  SettingTextInput,
} from '@/components/wandr/profile/profile-setting-screen';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { generateAvatarUploadUrlRef, updateTravelerProfileRef } from '@/lib/convex';
import { uploadAvatarAsset } from '@/lib/upload-avatar';
import { useAuthSession } from '@/providers/auth-session';

type TravelStyle = 'solo' | 'couple' | 'friends' | 'family';

const travelStyleOptions = [
  { label: 'Solo', value: 'solo' },
  { label: 'Couple', value: 'couple' },
  { label: 'Friends', value: 'friends' },
  { label: 'Family', value: 'family' },
] as const;

function deferStateSync(update: () => void) {
  let isCancelled = false;
  const schedule = typeof queueMicrotask === 'function' ? queueMicrotask : (callback: () => void) => setTimeout(callback, 0);

  schedule(() => {
    if (!isCancelled) {
      update();
    }
  });

  return () => {
    isCancelled = true;
  };
}

export default function EditProfileScreen() {
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const { session, signOut } = useAuthSession();
  const isAdmin = session?.role === 'admin';
  const canManageBusiness = session?.role === 'serviceProvider';
  const generateAvatarUploadUrl = useMutation(generateAvatarUploadUrlRef);
  const updateTravelerProfile = useMutation(updateTravelerProfileRef);
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryLabel, setCountryLabel] = useState('');
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('solo');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarStorageId, setAvatarStorageId] = useState<Id<'_storage'> | undefined>();
  const [clearAvatar, setClearAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const hasLoadedTravelerRef = useRef(false);

  useEffect(() => {
    if (!traveler) {
      return;
    }

    return deferStateSync(() => {
      setName(traveler.name ?? '');
      setHomeCity(traveler.homeCity ?? '');
      setCountryCode(traveler.countryCode ?? '');
      setCountryLabel(traveler.countryLabel ?? '');
      setTravelStyle(traveler.travelStyle ?? 'solo');
      setAvatarUri(traveler.avatarUri ?? null);
      setAvatarStorageId(undefined);
      setClearAvatar(false);
      hasLoadedTravelerRef.current = true;
    });
  }, [traveler]);

  useEffect(() => {
    if (!traveler?.slug || !hasLoadedTravelerRef.current) {
      return;
    }

    const hasProfileChanged =
      name !== (traveler.name ?? '') ||
      homeCity !== (traveler.homeCity ?? '') ||
      countryCode !== (traveler.countryCode ?? '') ||
      countryLabel !== (traveler.countryLabel ?? '') ||
      travelStyle !== (traveler.travelStyle ?? 'solo') ||
      Boolean(avatarStorageId) ||
      clearAvatar;

    if (!hasProfileChanged) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsSaving(true);
      updateTravelerProfile({
        travelerSlug: traveler.slug,
        name,
        countryCode,
        countryLabel,
        homeCity: homeCity.trim() || undefined,
        travelStyle,
        avatarStorageId,
        clearAvatar,
      })
        .then(() => {
          setAvatarStorageId(undefined);
          setClearAvatar(false);
        })
        .catch((error) => {
          console.error('Failed to autosave profile', error);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }, 600);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    avatarStorageId,
    clearAvatar,
    countryCode,
    countryLabel,
    homeCity,
    name,
    traveler,
    travelStyle,
    updateTravelerProfile,
  ]);

  const handleChooseAvatar = async () => {
    if (!traveler?.slug || isUploading) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.86,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setIsUploading(true);
    try {
      const asset = result.assets[0];
      const uploadUrl = await generateAvatarUploadUrl({});
      const storageId = await uploadAvatarAsset(uploadUrl, asset);

      setAvatarUri(asset.uri);
      setAvatarStorageId(storageId);
      setClearAvatar(false);
    } catch (error) {
      console.error('Failed to upload avatar', error);
      Alert.alert('Upload failed', 'We could not upload that profile picture. Please try another image.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearProfilePhoto = () => {
    setAvatarUri(null);
    setAvatarStorageId(undefined);
    setClearAvatar(true);
  };

  const handleProfilePhotoPress = () => {
    if (isUploading) {
      return;
    }

    if (!avatarUri) {
      void handleChooseAvatar();
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
          options: ['Change Photo', 'Remove Photo', 'Cancel'],
          title: 'Profile photo',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            void handleChooseAvatar();
          }

          if (buttonIndex === 1) {
            clearProfilePhoto();
          }
        }
      );
      return;
    }

    Alert.alert('Profile photo', undefined, [
      { text: 'Change Photo', onPress: () => void handleChooseAvatar() },
      { text: 'Remove Photo', style: 'destructive', onPress: clearProfilePhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCountryLabel(typeof country.name === 'string' ? country.name : country.name.common);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
      Alert.alert('Could not sign out', 'Please try again.');
    }
  };

  return (
    <>
      <ProfileSettingScreen title="Account" wrapInSection={false}>
        <SettingFormSection title="Details">
          <SettingActionRow
            disabled={isUploading}
            label="Profile photo"
            onPress={handleProfilePhotoPress}
            value={isUploading ? 'Uploading...' : avatarUri ? 'Edit' : 'Add'}
          />
          <SettingTextInput label="Display name" value={name} onChangeText={setName} placeholder="Your name" />
          <SettingActionRow label="Country" value={countryLabel || 'Select'} onPress={() => setIsCountryPickerOpen(true)} />
          <SettingTextInput label="Home base" value={homeCity} onChangeText={setHomeCity} placeholder="Home city" />
          <SettingOptionGroup label="Travel style" options={travelStyleOptions} value={travelStyle} onChange={setTravelStyle} />
        </SettingFormSection>
        <SettingFormSection title="Account">
          <SettingRow label="Email" value={traveler?.email ?? 'Signed in'} />
          {isAdmin ? (
            <SettingActionRow label="Admin dashboard" value="Open" onPress={() => router.push('/admin' as Href)} />
          ) : null}
          {canManageBusiness ? (
            <SettingActionRow label="My business" value="Open" onPress={() => router.push('/profile/business' as Href)} />
          ) : null}
          {isSaving || isUploading ? (
            <SettingRow label="Status" value={isUploading ? 'Uploading...' : 'Saving changes...'} />
          ) : null}
          <SettingActionRow destructive label="Sign out" onPress={handleSignOut} />
        </SettingFormSection>
      </ProfileSettingScreen>
      <CountryPickerSheet
        countryCode={countryCode}
        isOpen={isCountryPickerOpen}
        onClose={() => setIsCountryPickerOpen(false)}
        onSelect={handleSelectCountry}
      />
    </>
  );
}
