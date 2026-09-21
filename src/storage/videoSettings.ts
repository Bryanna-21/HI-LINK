import { getLocal, setLocal } from './localStore';

export type VideoDisplayMode = 'fit' | 'fill';

export type VideoSettings = {
  displayMode: VideoDisplayMode;
  autoScroll: boolean;
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  displayMode: 'fit',
  autoScroll: true,
};

const VIDEO_SETTINGS_KEY = 'video-settings';

export async function getVideoSettings(): Promise<VideoSettings> {
  return getLocal<VideoSettings>(
    VIDEO_SETTINGS_KEY,
    DEFAULT_VIDEO_SETTINGS,
  );
}

export async function saveVideoSettings(
  settings: VideoSettings,
): Promise<void> {
  await setLocal(VIDEO_SETTINGS_KEY, settings);
}
