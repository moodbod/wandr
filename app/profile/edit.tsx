import { useMutation } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Trash } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import CountryPicker, { type Country, type CountryCode } from 'react-native-country-picker-modal';

import type { Id } from '@/convex/_generated/dataModel';
import {
  ProfileSettingScreen,
  SettingActionButton,
  SettingOptionGroup,
  SettingRow,
  SettingSwitchRow,
  SettingTextInput,
} from '@/components/wandr/profile/profile-setting-screen';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { CountryFlagAvatar } from '@/components/wandr/country-flag-avatar';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useManagerMode } from '@/hooks/use-manager-mode';
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
  const traveler = useCurrentTraveler();
  const isDark = useColorScheme() === 'dark';
  const { signOut } = useAuthSession();
  const { isLoading: managerModeIsLoading, isManagerMode, setManagerMode } = useManagerMode();
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
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);

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
  }, [traveler]);

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

  const handleSave = async () => {
    if (!traveler?.slug || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await updateTravelerProfile({
        travelerSlug: traveler.slug,
        name,
        countryCode,
        countryLabel,
        homeCity: homeCity.trim() || undefined,
        travelStyle,
        avatarStorageId,
        clearAvatar,
      });
      Alert.alert('Profile saved', 'Your traveler profile has been updated.');
    } catch (error) {
      console.error('Failed to save profile', error);
      Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Please check your details and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCountryLabel(typeof country.name === 'string' ? country.name : country.name.common);
    setIsCountryPickerOpen(false);
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
        <FaceHashAvatar name={name || 'Traveler'} seed={traveler?.slug} size={96} uri={avatarUri} />
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select country"
        onPress={() => setIsCountryPickerOpen(true)}
        style={styles.countryRow}>
        <CountryFlagAvatar countryCode={countryCode} size={30} />
        <View style={styles.countryCopy}>
          <ThemedText style={styles.countryLabel}>Country</ThemedText>
          <ThemedText style={styles.countryValue}>{countryLabel}</ThemedText>
        </View>
      </Pressable>
      <CountryPicker
        countryCode={countryCode as CountryCode}
        onClose={() => setIsCountryPickerOpen(false)}
        onSelect={handleSelectCountry}
        theme={{
          backgroundColor: isDark ? designSystem.semantic.dark.surfaceRaised : designSystem.colors.white,
          onBackgroundTextColor: isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text,
          primaryColor: designSystem.colors.lime,
          primaryColorVariant: designSystem.colors.darkGreen,
        }}
        visible={isCountryPickerOpen}
        withFilter
        withFlag
      />
      <SettingOptionGroup label="Travel style" options={travelStyleOptions} value={travelStyle} onChange={setTravelStyle} />
      <SettingRow label="Phone" value={traveler?.phoneNumber ?? 'Local session'} />
      <SettingSwitchRow
        disabled={managerModeIsLoading}
        label="Manager mode"
        value={isManagerMode}
        onValueChange={setManagerMode}
      />
      <SettingActionButton disabled={isSaving || isUploading || !traveler?.slug} label={isSaving ? 'Saving...' : 'Save account'} onPress={handleSave} />
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
  countryRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: designSystem.colors.borderSoft,
  },
  countryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  countryLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  countryValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
});
