import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
        <Text style={styles.sectionTitle}>
          APPEARANCE
        </Text>

        <View style={styles.card}>
          <Text style={styles.optionTitle}>
            Theme
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

        <Text style={styles.sectionTitle}>
          VIDEO DISPLAY
        </Text>

        <View style={styles.card}>
          <Text style={styles.optionTitle}>
            Video size
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

        <Text style={styles.sectionTitle}>
          VIDEO PLAYBACK
        </Text>

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
      </ScrollView>
    </View>
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
  });
}
