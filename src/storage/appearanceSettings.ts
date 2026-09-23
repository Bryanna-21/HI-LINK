import { getLocal, setLocal } from './localStore';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AppearanceSettings = {
  themeMode: ThemeMode;
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  themeMode: 'system',
};

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';

export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  return getLocal<AppearanceSettings>(
    APPEARANCE_SETTINGS_KEY,
    DEFAULT_APPEARANCE_SETTINGS,
  );
}

export async function saveAppearanceSettings(
  settings: AppearanceSettings,
): Promise<void> {
  await setLocal(APPEARANCE_SETTINGS_KEY, settings);
}
