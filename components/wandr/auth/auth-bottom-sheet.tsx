import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useAuthActions } from '@convex-dev/auth/react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { type Country, type CountryCode } from 'react-native-country-picker-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'convex/react';

import { Input } from '@/components/ui/input';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { AuthFormShell } from '@/components/wandr/auth/auth-form-shell';
import { createAuthPalette } from '@/components/wandr/auth/auth-palette';
import { AuthPrimaryButton } from '@/components/wandr/auth/auth-primary-button';
import { CountryPickerField } from '@/components/wandr/country-picker-field';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { completeOnboardingRef, getCurrentAuthIdentityRef } from '@/lib/convex';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type TravelStyle = 'solo' | 'couple' | 'friends' | 'family';

export type AuthSheetMode = 'signIn' | 'signUp' | 'onboarding';

type AuthBottomSheetProps = {
  isOpen: boolean;
  mode: AuthSheetMode;
  returnTo: string;
  onClose: () => void;
  onModeChange: (mode: AuthSheetMode) => void;
  onOnboardingBack: () => void;
};

const travelStyles: { value: TravelStyle; label: string; icon: MaterialIconName }[] = [
  { value: 'solo', label: 'Solo', icon: 'account' },
  { value: 'couple', label: 'Couple', icon: 'heart' },
  { value: 'friends', label: 'Friends', icon: 'account-group' },
  { value: 'family', label: 'Family', icon: 'home-heart' },
];

WebBrowser.maybeCompleteAuthSession();

function getErrorMessage(cause: unknown, fallback: string) {
  if (cause && typeof cause === 'object' && 'message' in cause && typeof (cause as { message?: unknown }).message === 'string') {
    const message = (cause as { message: string }).message;
    if (message.includes('InvalidAccountId') || message.includes('InvalidSecret') || message.includes('Invalid credentials')) {
      return 'Email or password does not match. Try again or create an account.';
    }
    if (message.includes('TooManyFailedAttempts')) {
      return 'Too many sign-in attempts. Wait a few minutes and try again.';
    }
    if (message.includes('Invalid `redirectTo`') || message.includes('Invalid auth redirect target')) {
      return 'Google sign-in could not return to Wandr. Try again in a moment.';
    }
    return message;
  }

  return fallback;
}

function getCodeFromUrl(url: string) {
  const code = Linking.parse(url).queryParams?.code;
  return typeof code === 'string' ? code : null;
}

function getOAuthRedirectTo(mode: Exclude<AuthSheetMode, 'onboarding'>, returnTo: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = new URL('/', window.location.origin);
    url.searchParams.set('authMode', mode);
    url.searchParams.set('returnTo', returnTo);
    return url.toString();
  }

  return Linking.createURL('/', {
    queryParams: {
      authMode: mode,
      returnTo,
    },
  });
}

async function completeGoogleOAuth(
  signIn: ReturnType<typeof useAuthActions>['signIn'],
  redirectTo: string
) {
  const result = await signIn('google', { redirectTo });
  if (Platform.OS === 'web') {
    return;
  }

  if (!result?.redirect) {
    return;
  }

  const authResult = await WebBrowser.openAuthSessionAsync(result.redirect.toString(), redirectTo);
  if (authResult.type !== 'success') {
    return;
  }

  const code = getCodeFromUrl(authResult.url);
  if (!code) {
    throw new Error('Google did not return an auth code.');
  }

  await (signIn as unknown as (provider: undefined, params: { code: string }) => Promise<unknown>)(undefined, { code });
}

function useIsDesktopAuthSheet() {
  const { isLargeScreen } = useResponsive();
  return Platform.OS === 'web' && isLargeScreen;
}

export function AuthBottomSheet({
  isOpen,
  mode,
  returnTo,
  onClose,
  onModeChange,
  onOnboardingBack,
}: AuthBottomSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const isOnboarding = mode === 'onboarding';
  const isDesktopSheet = Platform.OS === 'web' && isLargeScreen;
  const snapPoints = useMemo(() => [isOnboarding ? '92%' : '84%'], [isOnboarding]);
  const desktopPopupHostStyle = useMemo<ViewStyle[] | undefined>(
    () =>
      isDesktopSheet
        ? [styles.desktopPopupHost, { height: isOnboarding ? '92%' : '84%' }]
        : undefined,
    [isDesktopSheet, isOnboarding]
  );
  const renderBackdrop = useMemo(
    () =>
      function AuthSheetBackdrop(props: BottomSheetBackdropProps) {
        return (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.32}
            pressBehavior={isOnboarding ? 'none' : 'close'}
          />
        );
      },
    [isOnboarding]
  );

  return (
    <GlassBottomSheet
      ref={sheetRef}
      index={isOpen ? 0 : -1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={!isOnboarding}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      containerStyle={styles.sheetLayer}
      desktopPopupHostStyle={desktopPopupHostStyle}
      onClose={onClose}>
      <BottomSheetView style={[styles.sheetBody, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardFrame}>
          {mode === 'signIn' ? (
            <SignInSheetForm
              returnTo={returnTo}
              onBack={onClose}
              onSwitchMode={() => onModeChange('signUp')}
            />
          ) : null}
          {mode === 'signUp' ? (
            <SignUpSheetForm
              returnTo={returnTo}
              onBack={() => onModeChange('signIn')}
              onSwitchMode={() => onModeChange('signIn')}
            />
          ) : null}
          {mode === 'onboarding' ? (
            <OnboardingSheetForm returnTo={returnTo} onBack={onOnboardingBack} />
          ) : null}
        </KeyboardAvoidingView>
      </BottomSheetView>
    </GlassBottomSheet>
  );
}

function SignInSheetForm({
  returnTo,
  onBack,
  onSwitchMode,
}: {
  returnTo: string;
  onBack: () => void;
  onSwitchMode: () => void;
}) {
  const { signIn } = useAuthActions();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const isDesktopSheet = useIsDesktopAuthSheet();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn('password', {
        email: email.trim().toLowerCase(),
        password,
        flow: 'signIn',
      });
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not sign in.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsSubmitting(true);
    try {
      const redirectTo = getOAuthRedirectTo('signIn', returnTo);
      await completeGoogleOAuth(signIn, redirectTo);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not continue with Google.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="Sign in to Wandr"
      subtitle="Keep exploring, then sign in when you are ready to save trips, join groups, or message friends."
      palette={palette}
      footer={
        <AuthPrimaryButton
          disabled={isSubmitting}
          label={isSubmitting ? 'Signing in...' : 'Continue'}
          loading={isSubmitting}
          palette={palette}
          onPress={handleSubmit}
        />
      }
      onBack={onBack}
      scrollMode="bottomSheet"
      showBackButton={false}>
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Email</ThemedText>
      <Input
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null, { borderColor: palette.border }]}
        keyboardType="email-address"
        lightColor={palette.surface}
        darkColor={palette.surface}
        style={isDesktopSheet ? styles.desktopInputText : null}
        textContentType="emailAddress"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(null);
        }}
      />
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Password</ThemedText>
      <Input
        autoCapitalize="none"
        autoComplete="current-password"
        autoCorrect={false}
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null, { borderColor: palette.border }]}
        darkColor={palette.surface}
        lightColor={palette.surface}
        secureTextEntry
        style={isDesktopSheet ? styles.desktopInputText : null}
        textContentType="password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError(null);
        }}
      />
      {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.error}>{error}</ThemedText> : null}
      <AuthPrimaryButton
        disabled={isSubmitting}
        label="Continue with Google"
        palette={palette}
        onPress={handleGoogleSignIn}
      />
      <View style={styles.switchRow}>
        <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted}>New here?</ThemedText>
        <Pressable accessibilityRole="button" onPress={onSwitchMode}>
          <ThemedText lightColor={palette.primaryText} darkColor={palette.primary} style={styles.switchLink}>Create account</ThemedText>
        </Pressable>
      </View>
    </AuthFormShell>
  );
}

function SignUpSheetForm({
  returnTo,
  onBack,
  onSwitchMode,
}: {
  returnTo: string;
  onBack: () => void;
  onSwitchMode: () => void;
}) {
  const { signIn } = useAuthActions();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const isDesktopSheet = useIsDesktopAuthSheet();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password.');
      return;
    }

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn('password', {
        email: email.trim().toLowerCase(),
        password,
        flow: 'signUp',
      });
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not create your account.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    setError(null);
    setIsSubmitting(true);
    try {
      const redirectTo = getOAuthRedirectTo('signUp', returnTo);
      await completeGoogleOAuth(signIn, redirectTo);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not continue with Google.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="Create your account"
      subtitle="Make a traveler profile without leaving the place you were exploring."
      palette={palette}
      footer={
        <AuthPrimaryButton
          disabled={isSubmitting}
          label={isSubmitting ? 'Creating...' : 'Continue'}
          loading={isSubmitting}
          palette={palette}
          onPress={handleSubmit}
        />
      }
      onBack={onBack}
      scrollMode="bottomSheet"
      showBackButton={false}>
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Email</ThemedText>
      <Input
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null, { borderColor: palette.border }]}
        keyboardType="email-address"
        lightColor={palette.surface}
        darkColor={palette.surface}
        style={isDesktopSheet ? styles.desktopInputText : null}
        textContentType="emailAddress"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(null);
        }}
      />
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Password</ThemedText>
      <Input
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null, { borderColor: palette.border }]}
        darkColor={palette.surface}
        lightColor={palette.surface}
        secureTextEntry
        style={isDesktopSheet ? styles.desktopInputText : null}
        textContentType="newPassword"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError(null);
        }}
      />
      {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.error}>{error}</ThemedText> : null}
      <AuthPrimaryButton
        disabled={isSubmitting}
        label="Continue with Google"
        palette={palette}
        onPress={handleGoogleSignUp}
      />
      <View style={styles.switchRow}>
        <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted}>Already have one?</ThemedText>
        <Pressable accessibilityRole="button" onPress={onSwitchMode}>
          <ThemedText lightColor={palette.primaryText} darkColor={palette.primary} style={styles.switchLink}>Sign in</ThemedText>
        </Pressable>
      </View>
    </AuthFormShell>
  );
}

function OnboardingSheetForm({
  onBack,
}: {
  returnTo: string;
  onBack: () => void;
}) {
  const completeOnboarding = useMutation(completeOnboardingRef);
  const identity = useQuery(getCurrentAuthIdentityRef, {});
  const { signOut } = useAuthActions();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const isDesktopSheet = useIsDesktopAuthSheet();
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode | string>('');
  const [countryLabel, setCountryLabel] = useState('');
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('solo');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canFinish = name.trim().length >= 2 && countryCode.length > 0 && countryLabel.length > 0;

  useEffect(() => {
    if (identity?.name) {
      setName((current) => current || identity.name || '');
    }
  }, [identity?.name]);

  function handleSelectCountry(country: Country) {
    setCountryCode(country.cca2);
    setCountryLabel(country.name.toString());
  }

  async function handleFinish() {
    if (!canFinish) {
      setError('Enter your name.');
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
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not save your profile.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBack() {
    await signOut();
    onBack();
  }

  return (
    <AuthFormShell
      title="A few details for your trips"
      subtitle="Finish the traveler profile Wandr uses for trips, bookings, and friend features."
      palette={palette}
      footer={
        <AuthPrimaryButton
          disabled={!canFinish || isSubmitting}
          label={isSubmitting ? 'Saving...' : 'Finish'}
          loading={isSubmitting}
          palette={palette}
          onPress={handleFinish}
        />
      }
      onBack={handleBack}
      scrollMode="bottomSheet"
      showBackButton={false}>
      {identity?.email ? (
        <>
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Email</ThemedText>
          <Input
            containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null, { borderColor: palette.border }]}
            darkColor={palette.surface}
            editable={false}
            lightColor={palette.surface}
            style={isDesktopSheet ? styles.desktopInputText : null}
            value={identity.email}
          />
        </>
      ) : null}
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Your name</ThemedText>
      <Input
        autoCapitalize="words"
        autoCorrect={false}
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null, { borderColor: palette.border }]}
        darkColor={palette.surface}
        lightColor={palette.surface}
        placeholder="Tuyoleni"
        style={isDesktopSheet ? styles.desktopInputText : null}
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError(null);
        }}
      />
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Country</ThemedText>
      <CountryPickerField
        accessibilityLabel={`Change country, currently ${countryLabel}`}
        countryCode={countryCode}
        label="Country"
        value={countryLabel}
        onSelect={handleSelectCountry}
      />
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Home city</ThemedText>
      <Input
        autoCapitalize="words"
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null, { borderColor: palette.border }]}
        darkColor={palette.surface}
        lightColor={palette.surface}
        placeholder="Home city"
        style={isDesktopSheet ? styles.desktopInputText : null}
        value={homeCity}
        onChangeText={setHomeCity}
      />
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>How do you usually travel?</ThemedText>
      <View style={styles.travelGrid}>
        {travelStyles.map((item) => {
          const selected = item.value === travelStyle;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={item.value}
              onPress={() => setTravelStyle(item.value)}
              style={[
                styles.travelOption,
                isDesktopSheet ? styles.desktopTravelOption : null,
                {
                  backgroundColor: selected ? palette.primary : palette.surface,
                  borderColor: selected ? palette.primaryText : palette.border,
                },
              ]}>
              <MaterialCommunityIcons color={palette.primaryText} name={item.icon} size={isDesktopSheet ? 18 : 22} />
              <ThemedText lightColor={palette.text} darkColor={palette.text} style={[styles.travelLabel, isDesktopSheet ? styles.desktopTravelLabel : null]}>
                {item.label}
              </ThemedText>
              {selected ? <MaterialCommunityIcons color={palette.primaryText} name="check" size={isDesktopSheet ? 18 : 20} /> : null}
            </Pressable>
          );
        })}
      </View>
      {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.error}>{error}</ThemedText> : null}
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  error: {
    ...designSystem.type.caption,
  },
  input: {
    borderWidth: 1,
  },
  desktopInput: {
    height: 44,
    paddingHorizontal: designSystem.spacing.md,
  },
  desktopInputText: {
    fontSize: 14,
    height: 20,
    lineHeight: 20,
  },
  desktopPopupHost: {
    maxHeight: '100%',
  },
  desktopLabel: {
    fontSize: 12,
    lineHeight: 15,
  },
  desktopTravelLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  desktopTravelOption: {
    borderRadius: designSystem.radii.card - 4,
    gap: designSystem.spacing.xs,
    minHeight: 44,
    paddingHorizontal: designSystem.spacing.sm,
  },
  keyboardFrame: {
    flex: 1,
  },
  label: {
    ...designSystem.type.label,
  },
  sheetBody: {
    flex: 1,
  },
  sheetLayer: {
    elevation: 2000,
    zIndex: 2000,
  },
  switchLink: {
    ...designSystem.type.bodyStrong,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    justifyContent: 'center',
    marginTop: designSystem.spacing.md,
  },
  travelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing.sm,
  },
  travelLabel: {
    ...designSystem.type.bodyStrong,
    flex: 1,
  },
  travelOption: {
    alignItems: 'center',
    borderRadius: designSystem.radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing.md,
    width: '47%',
  },
});
