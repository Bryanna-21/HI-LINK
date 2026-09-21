import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { colors } from '../../src/theme/colors';
import {
  clearIdentity,
  getIdentity,
} from '../../src/storage/identity';
import {
  getLocal,
  setLocal,
} from '../../src/storage/localStore';
import { setOnboardingComplete } from '../../src/storage/onboarding';
import { HiLinkUser } from '../../src/models/user';

const PROFILE_PICTURE_KEY = 'profile_picture_uri';
const COVER_IMAGE_KEY = 'cover_image_uri';

export default function MeScreen() {
  const { width } = useWindowDimensions();

  const [identity, setIdentity] = useState<HiLinkUser | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const horizontalPadding = Math.max(16, Math.min(24, width * 0.05));
  const avatarSize = Math.min(76, width * 0.20);
  const coverHeight = Math.min(190, Math.max(160, width * 0.48));

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const user = await getIdentity();
    const savedProfilePicture = await getLocal<string | null>(
      PROFILE_PICTURE_KEY,
      null,
    );
    const savedCoverImage = await getLocal<string | null>(
      COVER_IMAGE_KEY,
      null,
    );

    setIdentity(user);
    setProfilePicture(savedProfilePicture);
    setCoverImage(savedCoverImage);
  }

  async function chooseImage(type: 'profile' | 'cover') {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow Hi-Link to access your photos so you can choose an image.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 7],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    const uri = result.assets[0].uri;

    if (type === 'profile') {
      setProfilePicture(uri);
      await setLocal(PROFILE_PICTURE_KEY, uri);
    } else {
      setCoverImage(uri);
      await setLocal(COVER_IMAGE_KEY, uri);
    }
  }

  function displayName() {
    if (identity?.name?.trim()) {
      return identity.name;
    }

    return 'Your Name';
  }

  function username() {
    if (identity?.username?.trim()) {
      return `@${identity.username.replace(/^@/, '')}`;
    }

    return '@yourusername';
  }

  function school() {
    return identity?.schoolName || 'Add your school';
  }

  function classInfo() {
    const parts = [
      identity?.form,
      identity?.stream,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' • ');
    }

    return 'Add your class';
  }

  async function handleLogout() {
    Alert.alert(
      'Log out?',
      'You will need to complete the Hi-Link setup again to use this account on this device.',
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
            await setOnboardingComplete(false);
            router.replace('/onboarding');
          },
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topTitle}>My Profile</Text>
            <Text style={styles.topSubtitle}>
              Your Hi-Link identity
            </Text>
          </View>

          <Pressable
            style={styles.settingsButton}
            onPress={() =>
              Alert.alert(
                'Profile menu',
                'Choose an action',
                [
                  {
                    text: 'Settings',
                    onPress: () =>
                      router.push('/video-settings'),
                  },
                  {
                    text: 'Log out',
                    style: 'destructive',
                    onPress: handleLogout,
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                ],
              )
            }
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={colors.white}
            />
          </Pressable>
        </View>

        <View style={[styles.profileCard, { marginHorizontal: horizontalPadding }]}>
          <View
            style={[
              styles.cover,
              { height: coverHeight },
            ]}
          >
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={styles.coverImage}
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <View style={styles.coverGlowGreen} />
                <View style={styles.coverGlowBlue} />

                <View style={styles.coverIcon}>
                  <Ionicons
                    name="image-outline"
                    size={30}
                    color={colors.exileGreen}
                  />
                </View>

                <Text style={styles.coverPlaceholderText}>
                  Add a cover image
                </Text>
              </View>
            )}

            <Pressable
              style={styles.coverEdit}
              onPress={() => chooseImage('cover')}
            >
              <Ionicons
                name="camera-outline"
                size={19}
                color={colors.white}
              />
            </Pressable>
          </View>

          <View style={styles.profileBody}>
            <View
              style={[
                styles.avatarWrapper,
                {
                  width: avatarSize + 8,
                  height: avatarSize + 8,
                  borderRadius: (avatarSize + 8) / 2,
                  marginTop: -(avatarSize / 2 + 4),
                },
              ]}
            >
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={[
                    styles.avatar,
                    {
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 2,
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    {
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 2,
                    },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={avatarSize * 0.42}
                    color={colors.muted}
                  />
                </View>
              )}

              <Pressable
                style={styles.avatarCamera}
                onPress={() => chooseImage('profile')}
              >
                <Ionicons
                  name="camera"
                  size={15}
                  color={colors.background}
                />
              </Pressable>
            </View>

            <Text style={styles.name}>{displayName()}</Text>
            <Text style={styles.username}>{username()}</Text>

            <View style={styles.schoolRow}>
              <Ionicons
                name="school-outline"
                size={18}
                color={colors.exileGreen}
              />
              <Text style={styles.schoolText}>{school()}</Text>
            </View>

            <View style={styles.details}>
              <Detail
                icon="book-outline"
                label={classInfo()}
              />

              {identity?.house ? (
                <Detail
                  icon="home-outline"
                  label={`House ${identity.house}`}
                />
              ) : null}

              {identity?.boardingStatus &&
              identity.boardingStatus !== 'unknown' ? (
                <Detail
                  icon="bed-outline"
                  label={
                    identity.boardingStatus === 'boarding'
                      ? 'Boarding'
                      : 'Day scholar'
                  }
                />
              ) : null}
            </View>

            <Pressable
              style={styles.editButton}
              onPress={() => router.push('/edit-profile')}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={colors.background}
              />
              <Text style={styles.editButtonText}>
                Edit Profile
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.section, { marginHorizontal: horizontalPadding }]}>
          <Text style={styles.sectionTitle}>Your Hi-Link</Text>

          <ProfileRow
            icon="images-outline"
            title="Posts"
            subtitle="Your photos, videos and posts"
            onPress={() => router.push('/my-posts')}
          />

          <ProfileRow
            icon="bookmark-outline"
            title="Saved resources"
            subtitle="Notes, exams and study materials"
            onPress={() => router.push('/saved')}
          />

          <ProfileRow
            icon="download-outline"
            title="Downloads"
            subtitle="Files available offline"
          />

          <ProfileRow
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            subtitle="Control your safety and visibility"
            onPress={() =>
              router.push('/privacy-security')
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Detail({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.detail}>
      <Ionicons
        name={icon}
        size={16}
        color={colors.muted}
      />
      <Text style={styles.detailText}>{label}</Text>
    </View>
  );
}

function ProfileRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.exileGreen}
        />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingTop: 18,
    paddingBottom: 110,
  },

  topBar: {
    paddingHorizontal: 20,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
  },

  topSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },

  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCard: {
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cover: {
    width: '100%',
    backgroundColor: colors.charcoal2,
    position: 'relative',
  },

  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.charcoal2,
    overflow: 'hidden',
  },

  coverGlowGreen: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.exileGreenDark,
    opacity: 0.28,
    top: -80,
    left: -55,
  },

  coverGlowBlue: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.exileBlueDark,
    opacity: 0.30,
    bottom: -125,
    right: -70,
  },

  coverIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(7,9,8,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(25,230,140,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  coverPlaceholderText: {
    color: colors.whiteMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  coverEdit: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(7,9,8,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileBody: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 22,
  },

  avatarWrapper: {
    backgroundColor: colors.exileGreen,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: colors.exileGreen,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 8,
  },

  avatar: {
    resizeMode: 'cover',
  },

  avatarPlaceholder: {
    backgroundColor: colors.charcoal2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarCamera: {
    position: 'absolute',
    right: -1,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.exileGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.card,
  },

  name: {
    color: colors.white,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },

  username: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 3,
  },

  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(25,230,140,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(25,230,140,0.20)',
    gap: 7,
  },

  schoolText: {
    color: colors.whiteMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  details: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },

  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(47,128,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(47,128,255,0.22)',
  },

  detailText: {
    color: colors.whiteMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  editButton: {
    marginTop: 18,
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.exileGreen,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  editButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },

  section: {
    marginTop: 24,
  },

  sectionTitle: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
  },

  row: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 13,
    marginBottom: 9,
  },

  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(25,230,140,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(25,230,140,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowText: {
    flex: 1,
    marginLeft: 12,
  },

  rowTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  rowSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
});
