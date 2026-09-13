import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';

import en from './locales/en.json';
import sw from './locales/sw.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import de from './locales/de.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';

// STATUS: REAL infrastructure, ENGLISH content only. The other nine
// languages listed in the old Settings shell (Swahili, French,
// Arabic, Spanish, German, Chinese, Japanese, Portuguese, Russian)
// are wired into i18next's resource list as genuinely EMPTY files —
// each is just { "_status": "not_yet_translated" } — not machine
// translations dressed up as real content. Shipping fabricated
// translations would be worse than the honest shell this replaces:
// a French-speaking user seeing subtly wrong French is a worse
// experience than a clearly-labeled "not yet translated" notice that
// falls back to English.
//
// i18next's own fallback mechanism (fallbackLng: 'en') handles this
// automatically and per-key: if a component asks for a key that
// doesn't exist in the active language (which, for the nine stub
// languages, is every key), it silently falls back to the English
// value for that specific key rather than showing the raw key name
// or crashing. This means selecting "Français" today shows a fully
// English app with the language preference honestly saved — not
// broken, just not yet translated, and it requires no special-case
// code anywhere else in the app to behave this way.
//
// Stack matches the current (2026) standard approach confirmed via
// several independent sources, not a single vendor's recommendation:
// i18next + react-i18next for translation management, expo-localization
// for device locale detection. This is a NEW native dependency
// (expo-localization) as of tonight — requires npx expo install and a
// fresh EAS build, will not take effect via OTA alone.

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'sw', label: 'Swahili', nativeLabel: 'Kiswahili' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// Only English actually has content. Used by the Settings screen to
// show an honest "not yet translated" note rather than pretending
// every listed language is equally ready.
export const TRANSLATED_LANGUAGES: LanguageCode[] = ['en'];

const STORAGE_KEY = 'unilink_language';

async function getInitialLanguage(): Promise<string> {
  try {
    const saved = await SecureStore.getItemAsync(STORAGE_KEY);
    if (saved) return saved;
  } catch {
    // Fall through to device locale detection below.
  }
  const deviceLocale = Localization.getLocales()[0]?.languageCode;
  const supported = SUPPORTED_LANGUAGES.some((l) => l.code === deviceLocale);
  return supported ? deviceLocale! : 'en';
}

export async function initI18n() {
  const initialLanguage = await getInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      sw: { translation: sw },
      fr: { translation: fr },
      ar: { translation: ar },
      es: { translation: es },
      de: { translation: de },
      zh: { translation: zh },
      ja: { translation: ja },
      pt: { translation: pt },
      ru: { translation: ru },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

  return i18n;
}

export async function changeLanguage(code: LanguageCode) {
  await i18n.changeLanguage(code);
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, code);
  } catch {
    // Non-fatal: the language still changes for the current session
    // even if persisting the choice fails.
  }
}

export default i18n;
