import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAction, useMutation } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { AsYouType, parsePhoneNumberFromString, type CountryCode as PhoneCountryCode } from 'libphonenumber-js/min';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react';
import { FlagType, getAllCountries, type Country, type CountryCode } from 'react-native-country-picker-modal';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type TextInput,
  type TextInputKeyPressEventData,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountryFlagAvatar } from '@/components/wandr/country-flag-avatar';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { completePhoneOnboardingRef, getPhoneAuthSessionRef, requestPhoneOtpRef, verifyPhoneOtpRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type IntroSlide = { icon: MaterialIconName; title: string; body: string };
type TravelStyleOption = { value: 'solo' | 'couple' | 'friends' | 'family'; label: string; icon: MaterialIconName };

const introSlides: IntroSlide[] = [
  {
    icon: 'map-marker-path',
    title: 'PLAN THE ROUTE, NOT JUST THE PIN',
    body: 'Build trips around stays, hidden gems, friends, and what is actually close enough to enjoy.',
  },
  {
    icon: 'account-group',
    title: 'TRAVEL WITH YOUR PEOPLE',
    body: 'Match with friends, plan in circles, and keep chats tied to the places you are choosing.',
  },
  {
    icon: 'compass-rose',
    title: 'WONDER YOUR WAY INTO THE NEXT TRIP',
    body: 'Wandr is for the curious bit before you go: the places you keep thinking about, the routes you might take, and the trip that starts forming from there.',
  },
];

const travelStyles: TravelStyleOption[] = [
  { value: 'solo', label: 'Solo', icon: 'account' },
  { value: 'couple', label: 'Couple', icon: 'heart-outline' },
  { value: 'friends', label: 'Friends', icon: 'account-group-outline' },
  { value: 'family', label: 'Family', icon: 'home-heart' },
] as const;

type FlowStep = 'intro' | 'phone' | 'verify' | 'profile' | 'done';
type TravelStyle = (typeof travelStyles)[number]['value'];
type AuthPalette = ReturnType<typeof createAuthPalette>;

const AUTH_LAYOUT = {
  artIconSize: 108,
  artSize: 180,
  artRotation: '6deg',
  artOrbOpacity: 0.68,
  artOrbRotation: '-12deg',
  artOrbSize: '92%',
  artStageMaxWidth: 360,
  backButtonSize: 44,
  checkIconSize: 112,
  codeBoxHeight: designSystem.layout.inputHeight + 2,
  codeBoxWidth: 48,
  countryFlagCircleSize: 32,
  countryRowFlagWidth: 32,
  countrySheetSnapPoints: ['58%'] as (string | number)[],
  doneCheckRadius: 42,
  doneCheckRotation: '-10deg',
  doneCheckSize: 190,
  disabledOpacity: 0.45,
  formTitleFontSize: 31,
  iconSize: 24,
  iconSizeSm: 20,
  iconSizeMd: 22,
  introCopyMaxWidth: 320,
  introSlideHorizontalPadding: designSystem.spacing.xxl,
  primaryButtonHeight: designSystem.layout.inputHeight + designSystem.spacing.xs / 2,
  progressHeight: 5,
  sheetBackdropOpacity: 0.28,
  skipButtonHeight: 42,
  skipButtonWidth: 76,
  travelStyleWidth: '47%',
} as const;

function createAuthPalette(isDark: boolean) {
  return {
    background: isDark ? designSystem.semantic.dark.background : designSystem.semantic.light.background,
    surface: isDark ? designSystem.semantic.dark.surfaceRaised : designSystem.colors.white,
    surfaceMuted: isDark ? designSystem.semantic.dark.surface : designSystem.colors.surface,
    text: isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text,
    textMuted: isDark ? designSystem.semantic.dark.textMuted : designSystem.semantic.light.textMuted,
    textSubtle: isDark ? designSystem.semantic.dark.textSubtle : designSystem.semantic.light.textSubtle,
    border: isDark ? designSystem.semantic.dark.borderSoft : designSystem.semantic.light.border,
    borderStrong: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen,
    placeholder: isDark ? designSystem.semantic.dark.placeholder : designSystem.semantic.light.placeholder,
    primary: designSystem.colors.lime,
    primaryText: designSystem.colors.darkGreen,
    error: designSystem.colors.liked,
    countryPickerTheme: {
      primaryColor: designSystem.colors.lime,
      primaryColorVariant: isDark ? designSystem.colors.darkGreen : designSystem.colors.mint,
      backgroundColor: isDark ? designSystem.semantic.dark.surfaceRaised : designSystem.colors.white,
      onBackgroundTextColor: isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text,
      filterPlaceholderTextColor: isDark ? designSystem.semantic.dark.placeholder : designSystem.semantic.light.placeholder,
    },
  };
}

export default function PhoneOnboardingScreen() {
  const { signIn } = useAuthSession();
  const completeOnboarding = useMutation(completePhoneOnboardingRef);
  const getPhoneAuthSession = useMutation(getPhoneAuthSessionRef);
  const requestPhoneOtp = useAction(requestPhoneOtpRef);
  const verifyPhoneOtp = useMutation(verifyPhoneOtpRef);
  const { height, width } = useWindowDimensions();
  const { isLargeScreen } = useResponsive();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const countrySheetRef = useRef<BottomSheet>(null);
  const codeInputRefs = useRef<(TextInput | null)[]>([]);
  const [step, setStep] = useState<FlowStep>('intro');
  const [slideIndex, setSlideIndex] = useState(0);
  const [countryCode, setCountryCode] = useState<CountryCode>('NA');
  const [callingCode, setCallingCode] = useState('264');
  const [countryLabel, setCountryLabel] = useState('Namibia');
  const [countries, setCountries] = useState<Country[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('solo');
  const [error, setError] = useState<string | null>(null);
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formattedPhone = useMemo(() => new AsYouType(countryCode as PhoneCountryCode).input(phone), [countryCode, phone]);
  const parsedPhoneNumber = useMemo(
    () => parsePhoneNumberFromString(phone, countryCode as PhoneCountryCode),
    [countryCode, phone]
  );
  const fullPhoneNumber = parsedPhoneNumber?.number ?? `+${callingCode}${phone.replace(/\D/g, '')}`;

  const canContinuePhone = parsedPhoneNumber?.isValid() ?? false;
  const canContinueProfile = name.trim().length >= 2;
  const isDesktopAuth = Platform.OS === 'web' && isLargeScreen;
  const authFrameWidth = isDesktopAuth ? Math.min(width - designSystem.spacing.xl * 2, 430) : width;
  const authFrameHeight = isDesktopAuth ? Math.min(height - designSystem.spacing.xl * 2, 780) : undefined;
  const filteredCountries = useMemo(() => {
    const query = normalizeSearch(countrySearch);
    if (!query) {
      return countries;
    }

    return countries.filter((country) => {
      const name = normalizeSearch(getCountryName(country));
      const code = country.cca2.toLowerCase();
      const dialCode = country.callingCode[0] ?? '';
      const dialQuery = query.replace(/\D/g, '');
      return name.includes(query) || code.includes(query) || (dialQuery.length > 0 && dialCode.includes(dialQuery));
    });
  }, [countries, countrySearch]);

  useEffect(() => {
    let isMounted = true;

    getAllCountries(FlagType.EMOJI)
      .then((nextCountries) => {
        if (!isMounted) {
          return;
        }

        setCountries(nextCountries);
        const currentCountry = nextCountries.find((country) => country.cca2 === countryCode);
        if (currentCountry) {
          setCountryLabel(getCountryName(currentCountry));
          setCallingCode(currentCountry.callingCode[0] ?? callingCode);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCountries([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [callingCode, countryCode]);

  function handleSelectCountry(nextCountry: Country) {
    setCountryCode(nextCountry.cca2);
    setCallingCode(nextCountry.callingCode[0] ?? '');
    setCountryLabel(getCountryName(nextCountry));
    setCountrySearch('');
    setPhone('');
    setError(null);
    countrySheetRef.current?.close();
  }

  function handleIntroNext() {
    if (slideIndex < introSlides.length - 1) {
      setSlideIndex((current) => current + 1);
      return;
    }

    setStep('phone');
  }

  async function handlePhoneNext() {
    if (!canContinuePhone) {
      setError('Enter a valid mobile number.');
      return;
    }

    setError(null);
    setOtpHint(null);
    setVerificationToken(null);
    setCode('');
    setIsSubmitting(true);

    try {
      const result = await requestPhoneOtp({ phoneNumber: fullPhoneNumber });
      setOtpHint(result.devCode ? `Dev build code: ${result.devCode}` : null);
      setStep('verify');
      setTimeout(() => codeInputRefs.current[0]?.focus(), 150);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send that code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCodeChange(value: string, index: number) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextCode = `${code.slice(0, index)}${digit}${code.slice(index + 1)}`.slice(0, 6);

    setCode(nextCode);
    setError(null);

    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
    if (event.nativeEvent.key !== 'Backspace') {
      return;
    }

    if (code[index]) {
      const nextCode = `${code.slice(0, index)}${code.slice(index + 1)}`.slice(0, 6);
      setCode(nextCode);
      return;
    }

    if (index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerifyCode() {
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await verifyPhoneOtp({
        phoneNumber: fullPhoneNumber,
        code,
      });
      setVerificationToken(result.verificationToken);

      const traveler = await getPhoneAuthSession({
        phoneNumber: fullPhoneNumber,
        verificationToken: result.verificationToken,
      });

      if (traveler) {
        await signIn({
          travelerSlug: traveler.slug,
          phoneNumber: traveler.phoneNumber,
        });
        setStep('done');
        return;
      }

      setStep('profile');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify that phone number.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFinish() {
    if (!verificationToken) {
      setError('Verify your phone number first.');
      return;
    }

    if (!canContinueProfile) {
      setError('Enter your name.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const traveler = await completeOnboarding({
        phoneNumber: fullPhoneNumber,
        verificationToken,
        name: name.trim(),
        countryCode,
        countryLabel,
        homeCity: homeCity.trim() || undefined,
        travelStyle,
      });
      await signIn({
        travelerSlug: traveler.slug,
        phoneNumber: traveler.phoneNumber,
      });
      setStep('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not finish onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, isDesktopAuth && styles.desktopSafeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.keyboardFrame,
          isDesktopAuth && [
            styles.desktopAuthFrame,
            {
              backgroundColor: palette.background,
              borderColor: palette.border,
              height: authFrameHeight,
              width: authFrameWidth,
            },
          ],
        ]}>
        {step === 'intro' ? (
          <IntroStep
            palette={palette}
            slideIndex={slideIndex}
            width={authFrameWidth}
            onNext={handleIntroNext}
            onSlideChange={setSlideIndex}
            onSkip={() => setStep('phone')}
          />
        ) : null}

        {step === 'phone' ? (
          <FormShell
            title="Verify your phone number with a code"
            subtitle="We will use your mobile number as your secure Wandr sign-in."
            footer={
              <PrimaryButton
                disabled={!canContinuePhone || isSubmitting}
                label={isSubmitting ? 'Sending...' : 'Send code'}
                loading={isSubmitting}
                palette={palette}
                onPress={handlePhoneNext}
              />
            }
            onBack={() => setStep('intro')}
            palette={palette}
          >
            <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
              Your phone number
            </ThemedText>
            <View style={styles.phoneInputRow}>
              <Pressable
                accessibilityLabel={`Change country, currently ${countryLabel}`}
                accessibilityRole="button"
                style={[styles.phoneCountryButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => countrySheetRef.current?.snapToIndex(0)}>
                <CountryFlagAvatar countryCode={countryCode} size={AUTH_LAYOUT.countryFlagCircleSize} />
                <ThemedText lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText} style={styles.countryDial}>
                  +{callingCode}
                </ThemedText>
                <MaterialCommunityIcons color={palette.borderStrong} name="chevron-down" size={AUTH_LAYOUT.iconSizeSm} />
              </Pressable>
              <Input
                keyboardType="number-pad"
                placeholder="Phone number"
                containerStyle={[styles.authInputContainer, styles.phoneNumberInput]}
                textContentType="telephoneNumber"
                value={formattedPhone}
                onChangeText={(value) => {
                  setPhone(value);
                  setError(null);
                }}
              />
            </View>
            {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.errorText}>{error}</ThemedText> : null}
          </FormShell>
        ) : null}

        {step === 'verify' ? (
          <FormShell
            title="We just sent you an SMS"
            subtitle={`Enter the security code for ${fullPhoneNumber}.`}
            footer={
              <PrimaryButton
                disabled={code.length !== 6 || isSubmitting}
                label={isSubmitting ? 'Checking...' : 'Next'}
                loading={isSubmitting}
                palette={palette}
                onPress={handleVerifyCode}
              />
            }
            onBack={() => setStep('phone')}
            palette={palette}
          >
            <View style={styles.codeRow}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Input
                  key={index}
                  ref={(input) => {
                    codeInputRefs.current[index] = input;
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                  containerStyle={[styles.codeBox, code.length === index && { borderColor: palette.borderStrong, borderWidth: 2 }]}
                  style={styles.codeBoxInput}
                  value={code[index] ?? ''}
                  onChangeText={(value) => handleCodeChange(value, index)}
                  onKeyPress={(event) => handleCodeKeyPress(event, index)}
                />
              ))}
            </View>
            {otpHint ? (
              <ThemedText lightColor={designSystem.colors.darkGreen} darkColor={designSystem.colors.lime} style={styles.helpText}>
                {otpHint}
              </ThemedText>
            ) : null}
            {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.errorText}>{error}</ThemedText> : null}
          </FormShell>
        ) : null}

        {step === 'profile' ? (
          <FormShell
            title="A few details for your trips"
            subtitle="Just enough to personalize stays, friends, and trip planning."
            footer={
              <PrimaryButton
                disabled={!canContinueProfile || isSubmitting}
                label={isSubmitting ? 'Saving...' : 'Finish'}
                loading={isSubmitting}
                palette={palette}
                onPress={handleFinish}
              />
            }
            onBack={() => setStep('verify')}
            palette={palette}
          >
            <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
              Your name
            </ThemedText>
            <Input
              autoCapitalize="words"
              placeholder="Tuyoleni"
              containerStyle={styles.authInputContainer}
              value={name}
              onChangeText={setName}
            />

            <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
              Home city
            </ThemedText>
            <Input
              autoCapitalize="words"
              placeholder="Windhoek"
              containerStyle={styles.authInputContainer}
              value={homeCity}
              onChangeText={setHomeCity}
            />

            <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
              How do you usually travel?
            </ThemedText>
            <View style={styles.travelStyleGrid}>
              {travelStyles.map((item) => (
                <Pressable
                  key={item.value}
                  style={[
                    styles.travelStyleChip,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                    travelStyle === item.value && { backgroundColor: palette.primary, borderColor: palette.borderStrong },
                  ]}
                  onPress={() => setTravelStyle(item.value)}
                >
                  <MaterialCommunityIcons
                    color={travelStyle === item.value ? palette.primaryText : palette.borderStrong}
                    name={item.icon}
                    size={AUTH_LAYOUT.iconSizeMd}
                  />
                  <ThemedText
                    lightColor={travelStyle === item.value ? palette.primaryText : designSystem.colors.ink}
                    darkColor={travelStyle === item.value ? palette.primaryText : designSystem.colors.darkText}
                    style={styles.travelStyleLabel}>
                    {item.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.errorText}>{error}</ThemedText> : null}
          </FormShell>
        ) : null}

        {step === 'done' ? <DoneStep palette={palette} /> : null}
      </KeyboardAvoidingView>
      <CountrySelectorSheet
        countries={filteredCountries}
        countrySearch={countrySearch}
        palette={palette}
        selectedCountryCode={countryCode}
        sheetRef={countrySheetRef}
        onChangeSearch={setCountrySearch}
        onSelectCountry={handleSelectCountry}
      />
    </SafeAreaView>
  );
}

function getCountryName(country: Country) {
  return typeof country.name === 'string' ? country.name : country.name.common;
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function CountrySelectorSheet({
  countries,
  countrySearch,
  palette,
  selectedCountryCode,
  sheetRef,
  onChangeSearch,
  onSelectCountry,
}: {
  countries: Country[];
  countrySearch: string;
  palette: AuthPalette;
  selectedCountryCode: CountryCode;
  sheetRef: RefObject<BottomSheet | null>;
  onChangeSearch: (value: string) => void;
  onSelectCountry: (country: Country) => void;
}) {
  return (
    <GlassBottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={AUTH_LAYOUT.countrySheetSnapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={AUTH_LAYOUT.sheetBackdropOpacity} />
      )}
    >
      <View style={styles.countrySheet}>
        <View style={styles.countrySheetHeader}>
          <View>
            <ThemedText lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText} style={styles.countrySheetTitle}>
              Select country
            </ThemedText>
            <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.countrySheetSubtitle}>
              Choose the mobile country code for verification.
            </ThemedText>
          </View>
        </View>

        <GlassInput
          placeholder="Search country or code"
          value={countrySearch}
          onChangeText={onChangeSearch}
          containerStyle={styles.countrySearchBox}
        />

        <BottomSheetFlatList
          data={countries}
          extraData={countrySearch}
          keyExtractor={(country) => country.cca2}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.countryListContent}
          renderItem={({ item }) => {
            const isSelected = item.cca2 === selectedCountryCode;
            return (
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.countryRow,
                  isSelected && { backgroundColor: palette.primary },
                ]}
                onPress={() => onSelectCountry(item)}
              >
                <CountryFlagAvatar countryCode={item.cca2} size={AUTH_LAYOUT.countryRowFlagWidth} />
                <View style={styles.countryRowText}>
                  <ThemedText
                    lightColor={isSelected ? palette.primaryText : designSystem.colors.ink}
                    darkColor={isSelected ? palette.primaryText : designSystem.colors.darkText}
                    style={styles.countryRowName}>
                    {getCountryName(item)}
                  </ThemedText>
                  <ThemedText
                    lightColor={isSelected ? palette.primaryText : designSystem.colors.warmDark}
                    darkColor={isSelected ? palette.primaryText : designSystem.colors.darkMutedText}
                    style={styles.countryRowMeta}>
                    {item.cca2} · +{item.callingCode[0] ?? ''}
                  </ThemedText>
                </View>
                {isSelected ? (
                  <MaterialCommunityIcons color={palette.primaryText} name="check-bold" size={AUTH_LAYOUT.iconSizeSm} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </View>
    </GlassBottomSheet>
  );
}

function IntroStep({
  palette,
  slideIndex,
  width,
  onNext,
  onSlideChange,
  onSkip,
}: {
  palette: AuthPalette;
  slideIndex: number;
  width: number;
  onNext: () => void;
  onSlideChange: (index: number) => void;
  onSkip: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const slideWidth = Math.max(width - AUTH_LAYOUT.introSlideHorizontalPadding * 2, 1);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: slideIndex * slideWidth, animated: true });
  }, [slideIndex, slideWidth]);

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    onSlideChange(Math.min(Math.max(nextIndex, 0), introSlides.length - 1));
  }

  return (
    <View style={styles.introFrame}>
      <View style={styles.progressRow}>
        {introSlides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressTrack,
              { backgroundColor: palette.border },
              index <= slideIndex && { backgroundColor: palette.borderStrong },
            ]}
          />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding intro"
      style={({ pressed }) => [
        styles.skipButton,
        { backgroundColor: palette.primary },
        pressed && styles.filledButtonPressed,
      ]}
        onPress={onSkip}>
        <ThemedText lightColor={palette.primaryText} darkColor={palette.primaryText} style={styles.skipText}>
          Skip
        </ThemedText>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        scrollEventThrottle={designSystem.spacing.md}
        showsHorizontalScrollIndicator={false}
        style={styles.introPager}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {introSlides.map((item) => (
          <View key={item.title} style={[styles.introPage, { width: slideWidth }]}>
            <View style={[styles.artStage, { width: Math.min(width - designSystem.spacing.xxl * 2, AUTH_LAYOUT.artStageMaxWidth) }]}>
              <LinearGradient
                colors={['#9fe870', '#f8e67a', '#78d6ff']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.artOrb}
              />
              <View style={[styles.artIconShell, { backgroundColor: palette.surface }]}>
                <MaterialCommunityIcons color={palette.borderStrong} name={item.icon} size={AUTH_LAYOUT.artIconSize} />
              </View>
            </View>

            <View style={styles.introCopy}>
              <ThemedText lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText} style={styles.introTitle}>
                {item.title}
              </ThemedText>
              <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.introBody}>
                {item.body}
              </ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>

      <PrimaryButton label={slideIndex === introSlides.length - 1 ? 'Get started' : 'Next'} palette={palette} onPress={onNext} />
    </View>
  );
}

function FormShell({
  children,
  footer,
  onBack,
  palette,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  footer: ReactNode;
  onBack: () => void;
  palette: AuthPalette;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.formFrame}>
      <View style={styles.formHeader}>
        <GlassButton
          accessibilityLabel="Go back"
          height={AUTH_LAYOUT.backButtonSize}
          width={AUTH_LAYOUT.backButtonSize}
          onPress={onBack}>
          <MaterialCommunityIcons color={palette.borderStrong} name="arrow-left" size={AUTH_LAYOUT.iconSize} />
        </GlassButton>
      </View>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <ThemedText lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText} style={styles.formTitle}>
          {title}
        </ThemedText>
        <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.formSubtitle}>
          {subtitle}
        </ThemedText>
        <View style={styles.formFields}>{children}</View>
      </ScrollView>
      <View style={[styles.footer, { borderColor: palette.border }]}>{footer}</View>
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  loading,
  palette,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  palette: AuthPalette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: palette.primary },
        disabled && styles.primaryButtonDisabled,
        pressed && styles.filledButtonPressed,
      ]}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={palette.primaryText} />
      ) : (
        <ThemedText lightColor={palette.primaryText} darkColor={palette.primaryText} style={styles.primaryButtonText}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

function DoneStep({ palette }: { palette: AuthPalette }) {
  return (
    <View style={[styles.doneFrame, { backgroundColor: palette.background }]}>
      <View style={styles.doneCheck}>
        <MaterialCommunityIcons color={palette.primaryText} name="check-bold" size={AUTH_LAYOUT.checkIconSize} />
      </View>
      <ThemedText lightColor={designSystem.colors.lime} darkColor={designSystem.colors.lime} style={styles.doneTitle}>
        ALL DONE!
      </ThemedText>
      <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.doneBody}>
        You are ready to start planning with Wandr.
      </ThemedText>
      <ActivityIndicator color={designSystem.colors.lime} />
    </View>
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
  desktopSafeArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: designSystem.spacing.xl,
  },
  desktopAuthFrame: {
    borderRadius: designSystem.radii.sheet,
    borderWidth: 1,
    boxShadow: '0 24px 80px rgba(0,0,0,0.26)',
    flex: 0,
    maxHeight: 780,
    overflow: 'hidden',
  },
  introFrame: {
    flex: 1,
    gap: designSystem.spacing.xl,
    justifyContent: 'space-between',
    padding: designSystem.spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    paddingTop: designSystem.spacing.xs,
  },
  progressTrack: {
    backgroundColor: designSystem.colors.border,
    borderRadius: designSystem.radii.pill,
    flex: 1,
    height: AUTH_LAYOUT.progressHeight,
  },
  progressTrackActive: {
    backgroundColor: designSystem.colors.darkGreen,
  },
  skipText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  introPager: {
    flexGrow: 0,
  },
  introPage: {
    alignItems: 'center',
    gap: designSystem.layout.sectionGap + designSystem.spacing.xxs / 2,
    justifyContent: 'center',
  },
  artStage: {
    alignItems: 'center',
    alignSelf: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  artOrb: {
    borderRadius: AUTH_LAYOUT.artSize,
    height: AUTH_LAYOUT.artOrbSize,
    opacity: AUTH_LAYOUT.artOrbOpacity,
    position: 'absolute',
    transform: [{ rotate: AUTH_LAYOUT.artOrbRotation }],
    width: AUTH_LAYOUT.artOrbSize,
  },
  artIconShell: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.whiteGlassHigh,
    borderRadius: designSystem.radii.sheet - designSystem.spacing.xxs / 2,
    height: AUTH_LAYOUT.artSize,
    justifyContent: 'center',
    transform: [{ rotate: AUTH_LAYOUT.artRotation }],
    width: AUTH_LAYOUT.artSize,
  },
  introCopy: {
    alignItems: 'center',
    gap: designSystem.layout.compactPadding,
  },
  introTitle: {
    color: designSystem.colors.ink,
    fontSize: designSystem.type.pageTitle.fontSize,
    fontWeight: '600',
    lineHeight: designSystem.type.pageTitle.lineHeight,
    textAlign: 'center',
  },
  introBody: {
    ...designSystem.type.body,
    color: designSystem.colors.warmDark,
    maxWidth: AUTH_LAYOUT.introCopyMaxWidth,
    textAlign: 'center',
  },
  formFrame: {
    flex: 1,
  },
  formHeader: {
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: designSystem.spacing.xs + designSystem.spacing.xxs / 2,
  },
  formContent: {
    paddingBottom: designSystem.spacing.xxl,
    paddingHorizontal: designSystem.spacing.xl,
    paddingTop: designSystem.spacing.xxl,
  },
  formTitle: {
    color: designSystem.colors.ink,
    fontSize: AUTH_LAYOUT.formTitleFontSize,
    fontWeight: '600',
    lineHeight: designSystem.type.pageTitle.lineHeight,
  },
  formSubtitle: {
    ...designSystem.type.body,
    color: designSystem.colors.warmDark,
    marginTop: designSystem.layout.compactPadding,
  },
  formFields: {
    gap: designSystem.spacing.sm,
    marginTop: designSystem.radii.sheet - designSystem.spacing.xxs / 2,
  },
  fieldLabel: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
    marginTop: designSystem.spacing.xs,
  },
  authInputContainer: {
    borderColor: designSystem.colors.border,
    borderWidth: 1,
  },
  phoneInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
  },
  phoneCountryButton: {
    alignItems: 'center',
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: designSystem.spacing.xs - designSystem.spacing.xxs / 2,
    height: designSystem.layout.inputHeight,
    paddingHorizontal: designSystem.spacing.xs,
  },
  countryDial: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.warmDark,
  },
  phoneNumberInput: {
    flex: 1,
    marginBottom: 0,
  },
  countrySheet: {
    flex: 1,
    paddingHorizontal: designSystem.spacing.md,
    paddingTop: designSystem.spacing.lg,
  },
  countrySheetHeader: {
    alignItems: 'flex-start',
    marginBottom: designSystem.type.subtitle.fontSize,
  },
  countrySheetTitle: {
    ...designSystem.type.title,
    fontWeight: '600',
  },
  countrySheetSubtitle: {
    ...designSystem.type.bodySmall,
    marginTop: designSystem.spacing.xxs,
    maxWidth: designSystem.spacing.xxxl * 7,
  },
  countrySearchBox: {
    marginBottom: 0,
  },
  countryListContent: {
    paddingBottom: designSystem.spacing.xxl,
    paddingTop: designSystem.spacing.sm,
  },
  countryRow: {
    alignItems: 'center',
    borderRadius: designSystem.radii.card - designSystem.spacing.sm / 2,
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    minHeight: designSystem.layout.inputHeight + designSystem.spacing.xxs,
    paddingHorizontal: designSystem.spacing.xs,
  },
  countryRowText: {
    flex: 1,
    gap: designSystem.spacing.xxs / 2,
  },
  countryRowName: {
    ...designSystem.type.bodyStrong,
  },
  countryRowMeta: {
    ...designSystem.type.caption,
  },
  codeRow: {
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    justifyContent: 'space-between',
  },
  codeBox: {
    borderColor: designSystem.colors.border,
    borderRadius: designSystem.radii.card - designSystem.spacing.sm / 2,
    borderWidth: 1,
    height: AUTH_LAYOUT.codeBoxHeight,
    paddingHorizontal: 0,
    width: AUTH_LAYOUT.codeBoxWidth,
  },
  codeBoxInput: {
    ...designSystem.type.title,
    height: designSystem.type.title.lineHeight,
    textAlign: 'center',
  },
  helpText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
    marginTop: designSystem.spacing.xl,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  travelStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing.xs + designSystem.spacing.xxs / 2,
  },
  travelStyleChip: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.white,
    borderColor: designSystem.colors.border,
    borderRadius: designSystem.radii.card - designSystem.spacing.xxs / 2,
    borderWidth: 1,
    flexBasis: AUTH_LAYOUT.travelStyleWidth,
    flexDirection: 'row',
    gap: designSystem.spacing.xs + designSystem.spacing.xxs / 2,
    minHeight: designSystem.layout.inputHeight + designSystem.spacing.xs - StyleSheet.hairlineWidth * 2,
    paddingHorizontal: designSystem.layout.compactPadding,
  },
  travelStyleLabel: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  errorText: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.liked,
  },
  footer: {
    borderColor: designSystem.colors.borderSoft,
    borderTopWidth: 1,
    padding: designSystem.spacing.lg,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: designSystem.radii.pill,
    justifyContent: 'center',
    minHeight: AUTH_LAYOUT.primaryButtonHeight,
    paddingHorizontal: designSystem.spacing.lg,
    width: '100%',
  },
  primaryButtonDisabled: {
    opacity: AUTH_LAYOUT.disabledOpacity,
  },
  primaryButtonText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  filledButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  skipButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: designSystem.radii.pill,
    justifyContent: 'center',
    minHeight: AUTH_LAYOUT.skipButtonHeight,
    minWidth: AUTH_LAYOUT.skipButtonWidth,
    paddingHorizontal: designSystem.spacing.md,
  },
  doneFrame: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.darkGreen,
    flex: 1,
    gap: designSystem.spacing.xl - designSystem.spacing.xxs / 2,
    justifyContent: 'center',
    padding: designSystem.spacing.xxl,
  },
  doneCheck: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: AUTH_LAYOUT.doneCheckRadius,
    height: AUTH_LAYOUT.doneCheckSize,
    justifyContent: 'center',
    transform: [{ rotate: AUTH_LAYOUT.doneCheckRotation }],
    width: AUTH_LAYOUT.doneCheckSize,
  },
  doneTitle: {
    color: designSystem.colors.lime,
    fontSize: designSystem.type.display.fontSize,
    fontWeight: '600',
    lineHeight: designSystem.type.display.lineHeight,
    textAlign: 'center',
  },
  doneBody: {
    ...designSystem.type.body,
    color: designSystem.colors.darkText,
    textAlign: 'center',
  },
});
