import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Appearance,
  ColorSchemeName,
} from 'react-native';

import {
  colors,
  colorsLight,
} from './colors';
import {
  DEFAULT_APPEARANCE_SETTINGS,
  getAppearanceSettings,
  saveAppearanceSettings,
  ThemeMode,
} from '../storage/appearanceSettings';

export type { ThemeMode };

export type ThemeColors = {
  background: string;
  card: string;
  cardRaised: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentDark: string;
  blue: string;
  blueSoft: string;
  blueDark: string;
  danger: string;
  orange: string;
};

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const darkColors: ThemeColors = {
  background: colors.background,
  card: colors.card,
  cardRaised: colors.charcoal2,
  text: colors.white,
  textSecondary: colors.whiteMuted,
  muted: colors.muted,
  border: colors.border,
  accent: colors.exileGreen,
  accentSoft: '#123B2A',
  accentDark: colors.exileGreenDark,
  blue: colors.exileBlue,
  blueSoft: '#122747',
  blueDark: colors.exileBlueDark,
  danger: colors.red,
  orange: colors.orange,
};

const lightColors: ThemeColors = {
  background: colorsLight.background,
  card: colorsLight.card,
  cardRaised: '#EEF2EE',
  text: colorsLight.text,
  textSecondary: '#344039',
  muted: colorsLight.muted,
  border: colorsLight.border,
  accent: colors.exileGreenDark,
  accentSoft: '#E2F5EB',
  accentDark: colors.exileGreenDark,
  blue: colors.exileBlueDark,
  blueSoft: '#E7EFFD',
  blueDark: colors.exileBlueDark,
  danger: colors.red,
  orange: colors.orange,
};

const ThemeContext =
  createContext<ThemeContextValue | null>(null);

function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: ColorSchemeName,
): 'light' | 'dark' {
  if (mode === 'light') {
    return 'light';
  }

  if (mode === 'dark') {
    return 'dark';
  }

  return systemScheme === 'light'
    ? 'light'
    : 'dark';
}

export function ThemeProvider({
  children,
}: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>(
    DEFAULT_APPEARANCE_SETTINGS.themeMode,
  );

  const [systemScheme, setSystemScheme] =
    useState<ColorSchemeName>(
      Appearance.getColorScheme(),
    );

  useEffect(() => {
    let mounted = true;

    async function load() {
      const settings =
        await getAppearanceSettings();

      if (mounted) {
        setModeState(settings.themeMode);
      }
    }

    void load();

    const subscription =
      Appearance.addChangeListener(
        ({ colorScheme }) => {
          setSystemScheme(colorScheme);
        },
      );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const resolvedMode = resolveThemeMode(
    mode,
    systemScheme,
  );

  const themeColors =
    resolvedMode === 'light'
      ? lightColors
      : darkColors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      colors: themeColors,
      setMode: async (nextMode) => {
        setModeState(nextMode);

        await saveAppearanceSettings({
          themeMode: nextMode,
        });
      },
    }),
    [mode, resolvedMode, themeColors],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider',
    );
  }

  return context;
}
