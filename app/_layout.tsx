import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />

      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#070908',
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
