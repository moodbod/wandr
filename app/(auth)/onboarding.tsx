import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { type Country, type CountryCode } from 'react-native-country-picker-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { CountryPickerField } from '@/components/wandr/country-picker-field';
import { AuthFormShell } from '@/components/wandr/auth/auth-form-shell';
import { AUTH_LAYOUT, createAuthPalette } from '@/components/wandr/auth/auth-palette';
import { AuthPrimaryButton } from '@/components/wandr/auth/auth-primary-button';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { completeOnboardingRef, getCurrentAuthIdentityRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';
import { useAuthActions } from '@convex-dev/auth/react';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type TravelStyleOption = { value: 'solo' | 'couple' | 'friends' | 'family'; label: string; icon: MaterialIconName };
type TravelStyle = TravelStyleOption['value'];

const travelStyles: TravelStyleOption[] = [
  { value: 'solo', label: 'Solo', icon: 'account' },
  { value: 'couple', label: 'Couple', icon: 'heart' },
  { value: 'friends', label: 'Friends', icon: 'account-group' },
  { value: 'family', label: 'Family', icon: 'home-heart' },
] as const;

export default function OnboardingScreen() {
  const completeOnboarding = useMutation(completeOnboardingRef);
  const authIdentity = useQuery(getCurrentAuthIdentityRef);
  const { session } = useAuthSession();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const { isLargeScreen } = useResponsive();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('NA');
  const [countryLabel, setCountryLabel] = useState('Namibia');
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('solo');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shouldConstrainAuthWidth = isLargeScreen;
  const canContinueProfile = name.trim().length >= 2;

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)/explore');
      return;
    }

    if (authIdentity) {
      if (authIdentity.onboardingCompleted) {
        router.replace('/(tabs)/explore');
      } else {
        setEmail(authIdentity.email ?? '');
        setName((current) => current || authIdentity.name || '');
      }
    }
  }, [authIdentity, session, router]);

  function getErrorMessage(cause: unknown, fallback: string) {
    if (cause && typeof cause === 'object' && 'message' in cause && typeof (cause as { message?: unknown }).message === 'string') {
      return (cause as { message: string }).message;
    }
    return fallback;
  }

  async function handleFinish() {
    if (!canContinueProfile) {
      setError('Add your name.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await completeOnboarding({
        name: name.trim(),
        countryCode,
        countryLabel,
        homeCity: homeCity.trim() || undefined,
        travelStyle,
      });
      // Will redirect via the session effect
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not finish onboarding.'));
      setIsSubmitting(false);
    }
  }

  async function handleBackFromProfile() {
    setError(null);
    await signOut();
    router.replace('/sign-in');
  }

  function handleSelectCountry(country: Country) {
    setCountryCode(country.cca2);
    setCountryLabel(typeof country.name === 'string' ? country.name : country.name.common);
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.keyboardFrame, shouldConstrainAuthWidth && styles.maxWidthFrame]}>
        <AuthFormShell
          title="A few details for your trips"
          subtitle="This keeps your traveler profile, stays, and friend matching useful."
          footer={
            <AuthPrimaryButton
              disabled={!canContinueProfile || isSubmitting}
              label={isSubmitting ? 'Saving...' : 'Finish'}
              loading={isSubmitting}
              palette={palette}
              onPress={handleFinish}
            />
          }
          onBack={() => {
            void handleBackFromProfile();
          }}
          palette={palette}>
            <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
              Email
            </ThemedText>
            <Input containerStyle={styles.authInputContainer} editable={false} placeholder="Google account email" value={email} />

            <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
              Your name
            </ThemedText>
            <Input
              autoCapitalize="words"
              autoComplete="off"
              autoCorrect={false}
              containerStyle={styles.authInputContainer}
              importantForAutofill="no"
              placeholder="Tuyoleni"
              textContentType="none"
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
            />

            <CountryPickerField
              accessibilityLabel="Select home country"
              countryCode={countryCode}
              label="Home country"
              value={countryLabel}
              onSelect={handleSelectCountry}
            />

            <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
              Home city
            </ThemedText>
            <Input
              autoCapitalize="words"
              containerStyle={styles.authInputContainer}
              placeholder="Windhoek"
              value={homeCity}
              onChangeText={setHomeCity}
            />

            <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
              How do you usually travel?
            </ThemedText>
            <View style={styles.travelStyleGrid}>
              {travelStyles.map((item) => {
                const selected = travelStyle === item.value;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item.value}
                    style={[
                      styles.travelStyleBox,
                      {
                        backgroundColor: selected
                          ? isDark
                            ? designSystem.colors.darkSurface
                            : designSystem.colors.limeMist
                          : isDark
                            ? designSystem.colors.darkSurfaceOverlay
                            : designSystem.colors.surface,
                        borderColor: designSystem.colors.borderFaint,
                      },
                    ]}
                    onPress={() => setTravelStyle(item.value)}>
                    <View style={styles.travelStyleBoxContent}>
                      <MaterialCommunityIcons color={palette.borderStrong} name={item.icon} size={AUTH_LAYOUT.iconSizeMd} />
                      <ThemedText lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText} style={styles.travelStyleLabel}>
                        {item.label}
                      </ThemedText>
                    </View>
                    {selected ? <MaterialCommunityIcons color={palette.borderStrong} name="check" size={AUTH_LAYOUT.iconSizeMd} /> : null}
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.errorText}>
                {error}
              </ThemedText>
            ) : null}
        </AuthFormShell>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: designSystem.colors.background,
    flex: 1,
  },
  keyboardFrame: {
    flex: 1,
  },
  maxWidthFrame: {
    alignSelf: 'center',
    maxWidth: AUTH_LAYOUT.desktopMaxWidth,
    width: '100%',
  },
  fieldLabel: {
    ...designSystem.type.label,
    marginTop: designSystem.spacing.xs,
  },
  authInputContainer: {
    borderColor: designSystem.colors.border,
    borderWidth: 1,
  },
  travelStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing.xs + designSystem.spacing.xxs / 2,
  },
  travelStyleBox: {
    alignItems: 'center',
    borderRadius: designSystem.radii.card,
    borderWidth: 1,
    flexBasis: AUTH_LAYOUT.travelStyleWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: designSystem.layout.inputHeight + designSystem.spacing.md,
    paddingHorizontal: designSystem.layout.compactPadding,
  },
  travelStyleBoxContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.xs + designSystem.spacing.xxs / 2,
  },
  travelStyleLabel: {
    ...designSystem.type.bodyStrong,
  },
  errorText: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.liked,
  },
});
