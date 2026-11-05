import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import {
  bootstrapCampus,
  syncReminders,
} from '../src/storage/campus';

import {
  ThemeProvider,
  useTheme,
} from '../src/theme/ThemeProvider';

function RootNavigator() {
  const { colors, resolvedMode } = useTheme();

  useEffect(() => {
    // Register known accounts with the campus layer, then surface any due
    // reminders. Reminders also refresh whenever the app returns to the
    // foreground (there is no background service to wake it).
    bootstrapCampus()
      .then(syncReminders)
      .catch((error) => console.warn('Campus startup failed:', error));

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncReminders().catch((error) => console.warn('Reminder sync failed:', error));
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />

      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="create"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
            contentStyle: {
              backgroundColor: 'transparent',
            },
          }}
        />

        <Stack.Screen
          name="create-video"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="create-text"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
