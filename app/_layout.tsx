import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useColors } from '../src/constants/theme';
import { initI18n } from '../src/i18n';

// STATUS: REAL — expo-updates was configured via `eas update:configure`
// (see app.json's updates.url and runtimeVersion, and eas.json's
// channel fields on each build profile). checkAutomatically defaults
// to ON_LOAD with fallbackToCacheTimeout: 0, which is already the
// silent, non-blocking behavior wanted: the app boots instantly from
// its current cached bundle every time, any newer OTA update is
// fetched in the background, and it only takes effect on the NEXT
// cold launch — never mid-session, never delaying this one. That
// default requires no code at all.
//
// The check below is intentionally not required for updates to work —
// it exists only so update activity is visible in logs rather than
// being completely invisible, since "silent by design" also means
// "impossible to confirm is working" without something like this.
// It fires once, after mount, and never blocks rendering: the
// isHydrated gate below is driven entirely by auth/theme state, not
// by this check.
function useSilentUpdateCheck() {
  useEffect(() => {
    // Updates.checkForUpdateAsync() only works in a real embedded
    // launch (an EAS build actually running the OTA-update system) —
    // it throws in Expo Go and in a dev client with no update channel
    // to check against. isEmbeddedLaunch is the officially recommended
    // check for this, rather than __DEV__: an EAS preview build is a
    // legitimate production-style APK where __DEV__ is already false,
    // so isEmbeddedLaunch is the semantically correct guard either way.
    if (!Updates.isEmbeddedLaunch) return;

    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          console.log('[updates] New update available — downloading for next launch.');
          await Updates.fetchUpdateAsync();
          console.log('[updates] Update downloaded. Will apply next time the app is opened.');
        } else {
          console.log('[updates] Already on the latest version.');
        }
      } catch (err) {
        // Non-fatal by design — a failed check (offline, server hiccup)
        // should never block or crash the app. The user just doesn't
        // get this particular update check; the next app open tries again.
        console.log('[updates] Update check failed (non-fatal):', err);
      }
    })();
  }, []);
}

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const isAuthHydrated = useAuthStore((s) => s.isHydrated);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const isThemeHydrated = useThemeStore((s) => s.isHydrated);
  const themeMode = useThemeStore((s) => s.mode);
  const colors = useColors();
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    hydrateAuth();
    hydrateTheme();
    initI18n().then(() => setIsI18nReady(true));
  }, []);

  useSilentUpdateCheck();

  // Wait on auth, theme, AND i18n hydration before rendering real UI —
  // same reasoning as the existing auth/theme gate: rendering before
  // i18n resolves its saved/device language would show raw
  // translation keys for a moment, the string equivalent of the
  // light-mode color flash this gate already prevents.
  const isHydrated = isAuthHydrated && isThemeHydrated && isI18nReady;

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
