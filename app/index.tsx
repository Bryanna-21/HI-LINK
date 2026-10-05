import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemeColors, useTheme } from '../src/theme/ThemeProvider';
import { isOnboardingComplete } from '../src/storage/onboarding';
import { isSessionActive } from '../src/storage/session';
import { getUsers } from '../src/storage/users';

export default function Index() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [sessionActive, setSessionActiveState] = useState(false);
  const [hasSavedProfiles, setHasSavedProfiles] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  async function checkOnboarding() {
    const result = await isOnboardingComplete();
    const active = await isSessionActive();
    const users = await getUsers();

    setComplete(result);
    setSessionActiveState(active);
    setHasSavedProfiles(users.length > 0);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />
      </View>
    );
  }

  if (complete && sessionActive) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (hasSavedProfiles) {
    return <Redirect href="/profiles" />;
  }

  return <Redirect href="/onboarding" />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
