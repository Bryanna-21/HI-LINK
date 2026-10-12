# Upgrading HI-LINK to Expo SDK 57

Code changes already made (they need the SDK 56+ packages to resolve):
- `app/(tabs)/_layout.tsx` imports `BottomTabBar` / `BottomTabBarProps` from `expo-router/js-tabs`
  (expo-router no longer depends on `@react-navigation/*` from SDK 56).
- React Native's deprecated `SafeAreaView` replaced with `react-native-safe-area-context`'s.
- `package.json`: `expo`, `react`, `react-native` bumped; `engines.node >= 22.13`.

Everything else (all `expo-*` packages, react-native-screens, safe-area-context, async-storage,
TypeScript, @types/react) must be aligned by Expo's tool, not by hand:

```bash
node -v                                    # must be 22.13 or newer
rm -rf node_modules package-lock.json
npm install
npx expo install expo@^57.0.17 --fix       # aligns every package to SDK 57
npx expo-doctor@latest
npx tsc --noEmit
npx expo start -c
```

Notes
- Expo Go for SDK 57 only opens SDK 57 projects (this repo is no longer usable with an SDK 54 Expo Go).
- SDK 55+ is New Architecture only; Hermes v1 is the default from SDK 56.
- `expo-media-library` (used to save videos in Home) is deprecated in SDK 56 in favour of its new
  object API. It still works; migrate later.
- Reference: https://expo.dev/changelog/sdk-57 , /sdk-56 , /sdk-55
