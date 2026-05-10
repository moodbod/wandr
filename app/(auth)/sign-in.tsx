import { useAuthActions } from '@convex-dev/auth/react';
import * as Linking from 'expo-linking';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { AuthFormShell } from '@/components/wandr/auth/auth-form-shell';
import { AUTH_LAYOUT, createAuthPalette } from '@/components/wandr/auth/auth-palette';
import { AuthPrimaryButton } from '@/components/wandr/auth/auth-primary-button';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { useAuthSession } from '@/providers/auth-session';

WebBrowser.maybeCompleteAuthSession();

function getErrorMessage(cause: unknown, fallback: string) {
  if (cause && typeof cause === 'object' && 'message' in cause && typeof (cause as { message?: unknown }).message === 'string') {
    return (cause as { message: string }).message;
  }

  return fallback;
}

function getReturnTo(raw: unknown) {
  return typeof raw === 'string' && raw.startsWith('/') ? raw : '/(tabs)/explore';
}

function getCodeFromUrl(url: string) {
  const code = Linking.parse(url).queryParams?.code;
  return typeof code === 'string' ? code : null;
}

function getOAuthRedirectTo(returnTo: string) {
  return Linking.createURL(`sign-in?returnTo=${encodeURIComponent(returnTo)}`);
}

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { signIn } = useAuthActions();
  const { isAuthenticated, onboardingRequired, session } = useAuthSession();
  const { width } = useWindowDimensions();
  const { isLargeScreen } = useResponsive();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const returnTo = getReturnTo(params.returnTo);

  useEffect(() => {
    if (session) {
      router.replace(returnTo as never);
      return;
    }

    if (isAuthenticated && onboardingRequired) {
      router.replace({ pathname: '/(auth)/onboarding', params: { returnTo } });
    }
  }, [isAuthenticated, onboardingRequired, returnTo, router, session]);

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
      const redirectTo = getOAuthRedirectTo(returnTo);
      const result = await signIn('google', { redirectTo });
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
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not continue with Google.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.keyboardFrame, isLargeScreen && { maxWidth: AUTH_LAYOUT.desktopMaxWidth, width: Math.min(width, AUTH_LAYOUT.desktopMaxWidth) }]}>
        <AuthFormShell
          title="Sign in to Wandr"
          subtitle="Use your email to continue. If your profile is not finished, Wandr will take you back to details next."
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
          onBack={() => router.replace('/(tabs)/explore')}>
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.label}>Email</ThemedText>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            containerStyle={[styles.input, { borderColor: palette.border }]}
            keyboardType="email-address"
            lightColor={palette.surface}
            darkColor={palette.surface}
            textContentType="emailAddress"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
          />
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.label}>Password</ThemedText>
          <Input
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect={false}
            containerStyle={[styles.input, { borderColor: palette.border }]}
            darkColor={palette.surface}
            lightColor={palette.surface}
            secureTextEntry
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
            <Link href={{ pathname: '/(auth)/sign-up', params: { returnTo } }}>
              <ThemedText lightColor={palette.primaryText} darkColor={palette.primary} style={styles.switchLink}>Create account</ThemedText>
            </Link>
          </View>
        </AuthFormShell>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  error: {
    ...designSystem.type.caption,
  },
  input: {
    borderWidth: 1,
  },
  keyboardFrame: {
    alignSelf: 'center',
    flex: 1,
    width: '100%',
  },
  label: {
    ...designSystem.type.label,
  },
  safeArea: {
    flex: 1,
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
});
