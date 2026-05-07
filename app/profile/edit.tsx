import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Bed, Camera, MapTrifold, Trash } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { type Country } from 'react-native-country-picker-modal';

import type { Id } from '@/convex/_generated/dataModel';
import { CountryPickerField } from '@/components/wandr/country-picker-field';
import {
  ProfileSettingScreen,
  SettingActionButton,
  SettingOptionGroup,
  SettingRow,
  SettingSwitchRow,
  SettingTextInput,
} from '@/components/wandr/profile/profile-setting-screen';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useManagerMode } from '@/hooks/use-manager-mode';
import { useManagerResourceMode } from '@/hooks/use-manager-resource-mode';
import { generateAvatarUploadUrlRef, updateTravelerProfileRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';

type TravelStyle = 'solo' | 'couple' | 'friends' | 'family';

const travelStyleOptions = [
  { label: 'Solo', value: 'solo' },
  { label: 'Couple', value: 'couple' },
  { label: 'Friends', value: 'friends' },
  { label: 'Family', value: 'family' },
] as const;

export default function EditProfileScreen() {
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const { signOut } = useAuthSession();
  const { isLoading: managerModeIsLoading, isManagerMode, setManagerMode } = useManagerMode();
  const { openManager } = useManagerResourceMode();
  const generateAvatarUploadUrl = useMutation(generateAvatarUploadUrlRef);
  const updateTravelerProfile = useMutation(updateTravelerProfileRef);
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [countryCode, setCountryCode] = useState('NA');
  const [countryLabel, setCountryLabel] = useState('Namibia');
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('solo');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarStorageId, setAvatarStorageId] = useState<Id<'_storage'> | undefined>();
  const [clearAvatar, setClearAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const hasLoadedTravelerRef = useRef(false);

  useEffect(() => {
    if (!traveler) {
      return;
    }

    setName(traveler.name ?? '');
    setHomeCity(traveler.homeCity ?? '');
    setCountryCode(traveler.countryCode ?? 'NA');
    setCountryLabel(traveler.countryLabel ?? 'Namibia');
    setTravelStyle(traveler.travelStyle ?? 'solo');
    setAvatarUri(traveler.avatarUri ?? null);
    setAvatarStorageId(undefined);
    setClearAvatar(false);
    hasLoadedTravelerRef.current = true;
  }, [traveler]);

  useEffect(() => {
    if (!traveler?.slug || !hasLoadedTravelerRef.current) {
      return;
    }

    const hasProfileChanged =
      name !== (traveler.name ?? '') ||
      homeCity !== (traveler.homeCity ?? '') ||
      countryCode !== (traveler.countryCode ?? 'NA') ||
      countryLabel !== (traveler.countryLabel ?? 'Namibia') ||
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
      const photoResponse = await fetch(asset.uri);
      const blob = await photoResponse.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': asset.mimeType ?? blob.type ?? 'image/jpeg' },
        body: blob,
      });
      const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };

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
    <ProfileSettingScreen title="Account">
      <View style={styles.avatarPanel}>
        <FaceHashAvatar name={name || 'Traveler'} paletteKey={traveler?.slug} size={96} uri={avatarUri} />
        <View style={styles.avatarActions}>
          <Pressable accessibilityRole="button" onPress={handleChooseAvatar} style={styles.avatarButton}>
            <Camera color={designSystem.colors.darkGreen} size={18} weight="bold" />
            <ThemedText style={styles.avatarButtonText}>{isUploading ? 'Uploading...' : 'Change photo'}</ThemedText>
          </Pressable>
          {avatarUri ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAvatarUri(null);
                setAvatarStorageId(undefined);
                setClearAvatar(true);
              }}
              style={styles.avatarButton}>
              <Trash color={designSystem.colors.darkGreen} size={18} weight="bold" />
              <ThemedText style={styles.avatarButtonText}>Remove</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <SettingTextInput label="Display name" value={name} onChangeText={setName} placeholder="Your name" />
      <SettingTextInput label="Home city or base" value={homeCity} onChangeText={setHomeCity} placeholder="Windhoek" />
      <CountryPickerField
        accessibilityLabel="Select country"
        countryCode={countryCode}
        label="Country"
        value={countryLabel}
        onSelect={handleSelectCountry}
      />
      <SettingOptionGroup label="Travel style" options={travelStyleOptions} value={travelStyle} onChange={setTravelStyle} />
      <SettingRow label="Phone" value={traveler?.phoneNumber ?? 'Add during onboarding'} />
      <SettingRow label="Email" value={traveler?.email ?? 'Signed in'} />
      <SettingSwitchRow
        disabled={managerModeIsLoading}
        label="Manager mode"
        value={isManagerMode}
        onValueChange={setManagerMode}
      />
      {isManagerMode ? (
        <View style={styles.managerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open experience management"
            onPress={() => {
              openManager('experiences');
              router.push('/profile');
            }}
            style={styles.managerActionButton}>
            <MapTrifold color={designSystem.colors.darkGreen} size={18} weight="bold" />
            <ThemedText style={styles.managerActionText}>Experiences</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open room management"
            onPress={() => {
              openManager('rooms');
              router.push('/profile');
            }}
            style={styles.managerActionButton}>
            <Bed color={designSystem.colors.darkGreen} size={18} weight="bold" />
            <ThemedText style={styles.managerActionText}>Rooms</ThemedText>
          </Pressable>
        </View>
      ) : null}
      {isSaving || isUploading ? (
        <ThemedText style={styles.autosaveText}>{isUploading ? 'Uploading...' : 'Saving changes...'}</ThemedText>
      ) : null}
      <SettingActionButton label="Sign out" variant="secondary" onPress={handleSignOut} />
    </ProfileSettingScreen>
  );
}

const styles = StyleSheet.create({
  avatarPanel: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  avatarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  avatarButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: designSystem.colors.lime,
  },
  avatarButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  managerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  managerActionButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 24,
    backgroundColor: designSystem.colors.lime,
  },
  managerActionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: designSystem.colors.darkGreen,
  },
  autosaveText: {
    alignSelf: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: designSystem.colors.gray,
  },
});
