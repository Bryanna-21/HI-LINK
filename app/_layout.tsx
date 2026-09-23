import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import {
  ThemeProvider,
  useTheme,
} from '../src/theme/ThemeProvider';

function RootNavigator() {
  const { colors, resolvedMode } = useTheme();

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
