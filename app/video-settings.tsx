import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  DEFAULT_VIDEO_SETTINGS,
  getVideoSettings,
  saveVideoSettings,
  VideoDisplayMode,
} from '../src/storage/videoSettings';
import {
  ThemeColors,
  ThemeMode,
  useTheme,
} from '../src/theme/ThemeProvider';
import { clearIdentity } from '../src/storage/identity';
import { setSessionActive } from '../src/storage/session';

export default function VideoSettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = createStyles(colors);

  const [displayMode, setDisplayMode] =
    useState<VideoDisplayMode>(
      DEFAULT_VIDEO_SETTINGS.displayMode,
    );

  const [autoScroll, setAutoScroll] =
    useState(DEFAULT_VIDEO_SETTINGS.autoScroll);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const settings = await getVideoSettings();

      if (!mounted) {
        return;
      }

      setDisplayMode(settings.displayMode);
      setAutoScroll(settings.autoScroll);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function updateSettings(
    nextDisplayMode: VideoDisplayMode,
    nextAutoScroll: boolean,
  ) {
    setDisplayMode(nextDisplayMode);
    setAutoScroll(nextAutoScroll);

    await saveVideoSettings({
      displayMode: nextDisplayMode,
      autoScroll: nextAutoScroll,
    });
  }

  function openComingSoon(title: string) {
    Alert.alert(
      title,
      `${title} settings will be available here as the HI-LINK feature is connected.`,
    );
  }

  function handleLogout() {
    Alert.alert(
      'Log out',
      'Your saved profile will remain available for you to sign back in.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            await clearIdentity();
            await setSessionActive(false);
            router.replace('/');
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="small"
          color={colors.accent}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.title}>
          Settings
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.settingsIntro}>
          Manage your HI-LINK account, privacy,
          appearance, chats and app preferences.
        </Text>

        <Text style={styles.sectionTitle}>
          ACCOUNT
        </Text>

        <View style={styles.menuCard}>
          <SettingsRow
            icon="people-outline"
            title="Profiles & Accounts"
            subtitle="Manage saved HI-LINK profiles and accounts"
            onPress={() => router.push('/profiles')}
            colors={colors}
          />

          <SettingsRow
            icon="person-outline"
            title="Account"
            subtitle="Identity, username and account information"
            onPress={() => openComingSoon('Account')}
            colors={colors}
            divider
          />
        </View>

        <Text style={styles.sectionTitle}>
          PREFERENCES
        </Text>

        <View style={styles.card}>
          <Text style={styles.optionTitle}>
            Appearance
          </Text>

          <Text style={styles.description}>
            Choose how HI-LINK looks on this device.
            System follows your device appearance setting.
          </Text>

          <View style={styles.segment}>
            {(
              [
                ['system', 'phone-portrait-outline', 'System'],
                ['light', 'sunny-outline', 'Light'],
                ['dark', 'moon-outline', 'Dark'],
              ] as const
            ).map(([themeMode, icon, label]) => {
              const active = mode === themeMode;

              return (
                <Pressable
                  key={themeMode}
                  onPress={() =>
                    void setMode(themeMode as ThemeMode)
                  }
                  style={[
                    styles.themeOption,
                    active && styles.themeOptionActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: active,
                  }}
                  accessibilityLabel={`${label} theme`}
                >
                  <Ionicons
                    name={icon}
                    size={18}
                    color={
                      active
                        ? colors.background
                        : colors.muted
                    }
                  />

                  <Text
                    style={[
                      styles.themeText,
                      active && styles.themeTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SettingsRow
          icon="notifications-outline"
          title="Notifications"
          subtitle="Messages, calls, events and campus alerts"
          onPress={() => openComingSoon('Notifications')}
          colors={colors}
        />

        <SettingsRow
          icon="shield-checkmark-outline"
          title="Privacy & Security"
          subtitle="Privacy, hidden posts and security controls"
          onPress={() => router.push('/privacy-security')}
          colors={colors}
        />

        <Text style={styles.sectionTitle}>
          COMMUNICATION
        </Text>

        <SettingsRow
          icon="chatbubbles-outline"
          title="Chats"
          subtitle="Chat preferences and message controls"
          onPress={() => openComingSoon('Chats')}
          colors={colors}
        />

        <SettingsRow
          icon="call-outline"
          title="Calls"
          subtitle="Voice and video call preferences"
          onPress={() => openComingSoon('Calls')}
          colors={colors}
        />

        <Text style={styles.sectionTitle}>
          MEDIA
        </Text>

        <View style={styles.card}>
          <Text style={styles.optionTitle}>
            Video Display
          </Text>

          <Text style={styles.description}>
            Every video uses the same feed frame.
            Choose how the video fits inside it.
          </Text>

          <View style={styles.segment}>
            <Pressable
              onPress={() =>
                void updateSettings(
                  'fit',
                  autoScroll,
                )
              }
              style={[
                styles.segmentOption,
                displayMode === 'fit' &&
                  styles.segmentOptionActive,
              ]}
            >
              <Ionicons
                name="scan-outline"
                size={20}
                color={
                  displayMode === 'fit'
                    ? colors.background
                    : colors.muted
                }
              />

              <Text
                style={[
                  styles.segmentText,
                  displayMode === 'fit' &&
                    styles.segmentTextActive,
                ]}
              >
                Fit
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                void updateSettings(
                  'fill',
                  autoScroll,
                )
              }
              style={[
                styles.segmentOption,
                displayMode === 'fill' &&
                  styles.segmentOptionActive,
              ]}
            >
              <Ionicons
                name="expand-outline"
                size={20}
                color={
                  displayMode === 'fill'
                    ? colors.background
                    : colors.muted
                }
              />

              <Text
                style={[
                  styles.segmentText,
                  displayMode === 'fill' &&
                    styles.segmentTextActive,
                ]}
              >
                Fill
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.optionTitle}>
                Auto-scroll videos
              </Text>

              <Text style={styles.description}>
                Automatically activate the video that
                becomes visible while scrolling.
              </Text>
            </View>

            <Switch
              value={autoScroll}
              onValueChange={(value) =>
                void updateSettings(
                  displayMode,
                  value,
                )
              }
              trackColor={{
                false: colors.border,
                true: colors.accent,
              }}
              thumbColor={colors.text}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          DATA & STORAGE
        </Text>

        <SettingsRow
          icon="phone-portrait-outline"
          title="Storage & Data"
          subtitle="Downloads, media and data usage"
          onPress={() => openComingSoon('Storage & Data')}
          colors={colors}
        />

        <SettingsRow
          icon="cloud-upload-outline"
          title="Backup"
          subtitle="Protect your local HI-LINK data"
          onPress={() => openComingSoon('Backup')}
          colors={colors}
        />

        <Text style={styles.sectionTitle}>
          ABOUT
        </Text>

        <SettingsRow
          icon="information-circle-outline"
          title="About HI-LINK"
          subtitle="Version, credits and application information"
          onPress={() => openComingSoon('About HI-LINK')}
          colors={colors}
        />

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.accent}
          />

          <Text style={styles.infoText}>
            HI-LINK keeps only one video player active
            at a time to reduce memory and playback
            problems.
          </Text>
        </View>

        <View style={styles.accountActions}>
          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={colors.text}
            />
            <Text style={styles.logoutText}>
              Log out
            </Text>
          </Pressable>

          <Pressable
            style={styles.deleteButton}
            onPress={() => router.push('/profiles')}
          >
            <Ionicons
              name="trash-outline"
              size={19}
              color={colors.danger}
            />
            <Text style={styles.deleteText}>
              Delete profile
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  colors,
  divider = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: ThemeColors;
  divider?: boolean;
}) {
  const styles = createStyles(colors);

  return (
    <Pressable
      style={[
        styles.settingsRow,
        divider && styles.settingsRowDivider,
      ]}
      onPress={onPress}
    >
      <View style={styles.settingsIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.accent}
        />
      </View>

      <View style={styles.settingsCopy}>
        <Text style={styles.settingsTitle}>
          {title}
        </Text>

        <Text style={styles.settingsSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={colors.muted}
      />
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  settingsIntro: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },

  menuCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    marginBottom: 22,
    overflow: 'hidden',
  },

  settingsRow: {
    minHeight: 74,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  settingsRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderWidth: 0,
    borderRadius: 0,
    marginBottom: 0,
  },

  settingsIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  settingsCopy: {
    flex: 1,
    paddingRight: 8,
  },

  settingsTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  settingsSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  sectionTitle: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 10,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },

  optionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  segment: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  segmentOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  segmentOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  themeOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  themeOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  themeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },

  themeTextActive: {
    color: colors.background,
  },

  segmentText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },

  segmentTextActive: {
    color: colors.background,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  settingCopy: {
    flex: 1,
  },

  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.cardRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },

  infoText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  accountActions: {
    marginTop: 24,
    gap: 10,
  },

  logoutButton: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  deleteButton: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  deleteText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  });
}
