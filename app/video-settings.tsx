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

import { colors } from '../src/theme/colors';
import {
  DEFAULT_VIDEO_SETTINGS,
  getVideoSettings,
  saveVideoSettings,
  VideoDisplayMode,
} from '../src/storage/videoSettings';

const COLORS = {
  background: '#070908',
  card: '#101411',
  border: '#202620',
  green: '#19E68C',
  white: '#FFFFFF',
  muted: '#77817A',
};

export default function VideoSettingsScreen() {
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
          color={COLORS.green}
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
            color={COLORS.white}
          />
        </Pressable>

        <Text style={styles.title}>
          Video Settings
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
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
                    ? COLORS.background
                    : COLORS.muted
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
                    ? COLORS.background
                    : COLORS.muted
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
                false: '#303630',
                true: COLORS.green,
              }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={COLORS.green}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    color: COLORS.white,
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
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 10,
  },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },

  optionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  description: {
    color: COLORS.muted,
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
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  segmentOptionActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },

  segmentText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },

  segmentTextActive: {
    color: COLORS.background,
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
    backgroundColor: '#0C120E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#193323',
    padding: 14,
  },

  infoText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
