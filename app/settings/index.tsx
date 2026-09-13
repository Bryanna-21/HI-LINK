import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ShellScreen } from '../../src/components/ShellScreen';
import { StatusBanner } from '../../src/components/StatusBanner';
import { useColors, Radius, Spacing } from '../../src/constants/theme';
import { useThemeStore } from '../../src/store/themeStore';
import { SUPPORTED_LANGUAGES, TRANSLATED_LANGUAGES, changeLanguage, LanguageCode } from '../../src/i18n';

// STATUS: Appearance/Dark mode, Change password, and — new tonight —
// Language are all REAL now. Language is real infrastructure
// (i18next + react-i18next + expo-localization, a new native
// dependency requiring a fresh EAS build) with ENGLISH content only.
// The other nine languages are wired into the language list and are
// genuinely selectable and saved, but their translation files are
// honest empty stubs — selecting one falls back to English per-key
// via i18next's own fallbackLng mechanism, with a clear
// "not yet translated" note shown rather than silently pretending
// they're complete. Everything else on this screen (push
// notifications, privacy/security beyond password, offline storage,
// per-screen accessibility) remains SHELL, unchanged, each still
// stating exactly what it's waiting on.

export default function SettingsScreen() {
  const colors = useColors();
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const { i18n } = useTranslation();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          padding: Spacing.md,
          paddingTop: Spacing.xl,
        },
        title: {
          fontSize: 24,
          fontWeight: '800',
          color: colors.text,
        },
        section: {
          marginTop: Spacing.lg,
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.text,
          paddingHorizontal: Spacing.md,
          marginBottom: Spacing.xs,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          marginHorizontal: Spacing.md,
          marginTop: Spacing.sm,
          padding: Spacing.md,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        rowText: {
          fontSize: 14,
          color: colors.text,
        },
        rowChevron: {
          fontSize: 18,
          color: colors.textMuted,
        },
        languageRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          marginHorizontal: Spacing.md,
          marginTop: Spacing.xs,
          padding: Spacing.md,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        languageRowActive: { borderColor: colors.primary },
        languageLabel: { fontSize: 14, color: colors.text },
        languageNativeLabel: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
        languageStub: { fontSize: 11, color: colors.textMuted, marginTop: 1, fontStyle: 'italic' },
        checkmark: { fontSize: 16, color: colors.primary, fontWeight: '700' },
      }),
    [colors]
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <StatusBanner status="real" note="Dark mode is live and saved to your device." />
        <View style={styles.row}>
          <Text style={styles.rowText}>Dark mode</Text>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <StatusBanner status="real" note="Password changes are confirmed by email code, same as the web app." />
        <TouchableOpacity style={styles.row} onPress={() => router.push('/settings/change-password')}>
          <Text style={styles.rowText}>Change password</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <StatusBanner
          status="real"
          note="Language selection is real and saved to your device. Only English is fully translated so far — other languages fall back to English until translated."
        />
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = i18n.language === lang.code;
          const isTranslated = TRANSLATED_LANGUAGES.includes(lang.code as LanguageCode);
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.languageRow, isActive && styles.languageRowActive]}
              onPress={() => changeLanguage(lang.code as LanguageCode)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isActive }}
              accessibilityLabel={`${lang.label}${isTranslated ? '' : ', not yet translated'}`}
            >
              <View>
                <Text style={styles.languageLabel}>{lang.label}</Text>
                <Text style={styles.languageNativeLabel}>{lang.nativeLabel}</Text>
                {!isTranslated ? <Text style={styles.languageStub}>Not yet translated — showing English</Text> : null}
              </View>
              {isActive ? (
                <Text style={styles.checkmark} accessibilityElementsHidden importantForAccessibility="no">
                  ✓
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <ShellScreen
        title=""
        sections={[
          {
            title: 'Notifications',
            items: ['Push notification preferences'],
            backendNote: 'Needs: expo-notifications + backend to actually trigger pushes.',
          },
          {
            title: 'Privacy & Security',
            items: ['Privacy settings', 'Security settings'],
            backendNote: 'Needs: dedicated settings routes on the User model. (Change password is now real - see the Security section above.)',
          },
          {
            title: 'Storage',
            items: ['Downloads', 'Storage usage'],
            backendNote: 'Needs: offline download feature to exist first.',
          },
          {
            title: 'Accessibility',
            items: ['Screen reader support', 'Large text', 'High contrast', 'Reduced motion'],
            backendNote: 'Needs: accessibility props added screen-by-screen (React Native has real APIs for this — genuine work, not a toggle).',
          },
        ]}
      />
    </ScrollView>
  );
}
