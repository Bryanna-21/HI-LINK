import { useCallback, useEffect, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';

import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
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
import { getPostsByAuthor } from '../../src/storage/posts';
import { Post } from '../../src/models/post';

const PROFILE_PICTURE_KEY = 'profile_picture_uri';
const COVER_IMAGE_KEY = 'cover_image_uri';

export default function MeScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();

  const [identity, setIdentity] = useState<HiLinkUser | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'profile'>('posts');

  const horizontalPadding = Math.max(16, Math.min(24, width * 0.05));
  const avatarSize = Math.min(76, width * 0.20);
  const coverHeight = Math.min(190, Math.max(160, width * 0.48));

  useEffect(() => {
    loadProfile();
  }, []);

  const refreshProfile = useCallback(() => {
    loadProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile]),
  );

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
    setProfilePicture(
      user?.avatarUri ?? savedProfilePicture,
    );
    setCoverImage(
      user?.coverUri ?? savedCoverImage,
    );

    if (user) {
      const posts = await getPostsByAuthor(user.id);
      setUserPosts(posts);
    } else {
      setUserPosts([]);
    }
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
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    const uri = result.assets[0].uri;

    if (type === 'profile') {
      setProfilePicture(uri);
      await setLocal(PROFILE_PICTURE_KEY, uri);

      if (identity) {
        const updatedIdentity: HiLinkUser = {
          ...identity,
          avatarUri: uri,
          updatedAt: new Date().toISOString(),
        };

        await setLocal(PROFILE_PICTURE_KEY, uri);
        await setLocal(COVER_IMAGE_KEY, coverImage);
        setIdentity(updatedIdentity);

        const { saveIdentity } =
          await import('../../src/storage/identity');

        await saveIdentity(updatedIdentity);
      }
    } else {
      setCoverImage(uri);
      await setLocal(COVER_IMAGE_KEY, uri);

      if (identity) {
        const updatedIdentity: HiLinkUser = {
          ...identity,
          coverUri: uri,
          updatedAt: new Date().toISOString(),
        };

        setIdentity(updatedIdentity);

        const { saveIdentity } =
          await import('../../src/storage/identity');

        await saveIdentity(updatedIdentity);
      }
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
              color={colors.text}
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
                    color={colors.accent}
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
                color={colors.text}
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

            {identity?.bio?.trim() ? (
              <Text style={styles.bioText}>
                {identity.bio}
              </Text>
            ) : (
              <Text style={styles.bioPlaceholder}>
                Add a bio from Edit Profile
              </Text>
            )}

            <View style={styles.schoolRow}>
              <Ionicons
                name="school-outline"
                size={18}
                color={colors.accent}
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

            <View style={styles.profileStats}>
              <Pressable
                style={styles.profileStat}
                onPress={() => setActiveTab('posts')}
              >
                <Text style={styles.profileStatValue}>
                  {userPosts.length}
                </Text>
                <Text style={styles.profileStatLabel}>
                  Posts
                </Text>
              </Pressable>

              <View style={styles.profileStatDivider} />

              <Pressable
                style={styles.profileStat}
                onPress={() =>
                  Alert.alert(
                    'Followers',
                    'Follower management will be available when the follow system is connected.',
                  )
                }
              >
                <Text style={styles.profileStatValue}>
                  {identity?.followersCount ?? 0}
                </Text>
                <Text style={styles.profileStatLabel}>
                  Followers
                </Text>
              </Pressable>

              <View style={styles.profileStatDivider} />

              <Pressable
                style={styles.profileStat}
                onPress={() =>
                  Alert.alert(
                    'Following',
                    'Following management will be available when the follow system is connected.',
                  )
                }
              >
                <Text style={styles.profileStatValue}>
                  {identity?.followingCount ?? 0}
                </Text>
                <Text style={styles.profileStatLabel}>
                  Following
                </Text>
              </Pressable>
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

        <View
          style={[
            styles.section,
            { marginHorizontal: horizontalPadding },
          ]}
        >
          <View style={styles.profileTabs}>
            <Pressable
              style={[
                styles.profileTab,
                activeTab === 'posts' && styles.profileTabActive,
              ]}
              onPress={() => setActiveTab('posts')}
            >
              <Text
                style={[
                  styles.profileTabText,
                  activeTab === 'posts' &&
                    styles.profileTabTextActive,
                ]}
              >
                POSTS
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.profileTab,
                activeTab === 'profile' && styles.profileTabActive,
              ]}
              onPress={() => setActiveTab('profile')}
            >
              <Text
                style={[
                  styles.profileTabText,
                  activeTab === 'profile' &&
                    styles.profileTabTextActive,
                ]}
              >
                PROFILE
              </Text>
            </Pressable>
          </View>

          {activeTab === 'posts' ? (
            <View style={styles.profileSection}>
              <View style={styles.postsTitleRow}>
                <Text style={styles.sectionTitle}>
                  Posts
                </Text>

                <Pressable
                  onPress={() => router.push('/my-posts')}
                >
                  <Text style={styles.viewAllText}>
                    View all
                  </Text>
                </Pressable>
              </View>

              {userPosts.length > 0 ? (
                <>
                  <Text style={styles.postsCountLabel}>
                    {userPosts.length}{' '}
                    {userPosts.length === 1 ? 'post' : 'posts'}
                  </Text>

                  {userPosts.slice(0, 3).map((post) => (
                    <Pressable
                      key={post.id}
                      style={styles.postPreviewCard}
                      onPress={() => router.push('/my-posts')}
                    >
                      <View style={styles.postPreviewIconWrap}>
                        <Ionicons
                          name={getPostPreviewIcon(post) as any}
                          size={22}
                          color={colors.accent}
                        />
                      </View>

                      <View style={styles.postPreviewBody}>
                        <View style={styles.postPreviewTopRow}>
                          <Text style={styles.postPreviewLabel}>
                            {getPostPreviewLabel(post)}
                          </Text>

                          <Text style={styles.postPreviewDate}>
                            {new Date(
                              post.createdAt,
                            ).toLocaleDateString()}
                          </Text>
                        </View>

                        <Text
                          style={styles.postPreviewText}
                          numberOfLines={2}
                        >
                          {getPostPreviewText(post)}
                        </Text>

                        <Text style={styles.postPreviewMeta}>
                          {post.visibility.replace('_', ' ')}
                          {post.editedAt ? ' • Edited' : ''}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </>
              ) : (
                <View style={styles.postPreview}>
                  <Ionicons
                    name="create-outline"
                    size={30}
                    color={colors.muted}
                  />

                  <Text style={styles.postPreviewTitle}>
                    No posts yet
                  </Text>

                  <Text style={styles.postPreviewText}>
                    Your photos, videos, resources and updates will appear here.
                  </Text>

                  <Pressable
                    style={styles.createPostButton}
                    onPress={() => router.push('/create')}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={colors.text}
                    />
                    <Text style={styles.createPostButtonText}>
                      Create Post
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.profileSection}>
                <View style={styles.profileSectionHeader}>
                  <Text style={styles.sectionTitle}>
                    School profile
                  </Text>

                  <Pressable
                    onPress={() => router.push('/edit-profile')}
                  >
                    <Ionicons
                      name="create-outline"
                      size={19}
                      color={colors.accent}
                    />
                  </Pressable>
                </View>

                {identity?.schoolName ? (
                  <Detail
                    icon="school-outline"
                    label={identity.schoolName}
                  />
                ) : null}

                {identity?.form ? (
                  <Detail
                    icon="book-outline"
                    label={identity.form}
                  />
                ) : null}

                {identity?.stream ? (
                  <Detail
                    icon="people-outline"
                    label={identity.stream}
                  />
                ) : null}

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

              {(identity?.faculty ||
                identity?.course ||
                identity?.yearOfStudy) ? (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>
                    Academic profile
                  </Text>

                  {identity.faculty ? (
                    <ProfileInfo
                      icon="business-outline"
                      label="Faculty"
                      value={identity.faculty}
                    />
                  ) : null}

                  {identity.course ? (
                    <ProfileInfo
                      icon="school-outline"
                      label="Course"
                      value={identity.course}
                    />
                  ) : null}

                  {identity.yearOfStudy ? (
                    <ProfileInfo
                      icon="calendar-outline"
                      label="Year of study"
                      value={identity.yearOfStudy}
                    />
                  ) : null}
                </View>
              ) : null}

              {(identity?.clubs?.length ||
                identity?.societies?.length) ? (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>
                    Clubs & societies
                  </Text>

                  <View style={styles.tagList}>
                    {[
                      ...(identity.clubs ?? []),
                      ...(identity.societies ?? []),
                    ].map((item, index) => (
                      <View
                        key={`${item}-${index}`}
                        style={styles.profileTag}
                      >
                        <Ionicons
                          name="people-outline"
                          size={14}
                          color={colors.accent}
                        />
                        <Text style={styles.profileTagText}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {identity?.interests?.length ? (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>
                    Interests
                  </Text>

                  <View style={styles.tagList}>
                    {identity.interests.map((interest) => (
                      <View
                        key={interest}
                        style={styles.profileTag}
                      >
                        <Ionicons
                          name="sparkles-outline"
                          size={14}
                          color={colors.blue}
                        />
                        <Text style={styles.profileTagText}>
                          {interest}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>
                  Your Hi-Link
                </Text>

                <ProfileRow
                  icon="repeat-outline"
                  title="Reshared"
                  subtitle="Posts you have reshared"
                  onPress={() => {
                    if (identity) {
                      router.push({
                        pathname: '/profile/[id]/reshared',
                        params: { id: identity.id },
                      });
                    }
                  }}
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

                <ProfileRow
                  icon="settings-outline"
                  title="Settings"
                  subtitle="App preferences and video settings"
                  onPress={() =>
                    router.push('/video-settings')
                  }
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function getPostPreviewIcon(post: Post) {
  switch (post.type) {
    case 'photo':
      return 'image-outline';
    case 'video':
      return 'videocam-outline';
    case 'document':
      return 'document-text-outline';
    case 'study_resource':
      return 'school-outline';
    case 'question':
      return 'help-circle-outline';
    case 'event':
      return 'calendar-outline';
    default:
      return 'chatbubble-ellipses-outline';
  }
}

function getPostPreviewLabel(post: Post) {
  switch (post.type) {
    case 'photo':
      return 'Photo';
    case 'video':
      return 'Video';
    case 'document':
      return 'Document';
    case 'study_resource':
      return 'Study resource';
    case 'question':
      return 'Question';
    case 'event':
      return 'Event';
    default:
      return 'Post';
  }
}

function getPostPreviewText(post: Post) {
  if (post.text?.trim()) {
    return post.text.trim();
  }

  if (post.attachment?.name) {
    return post.attachment.name;
  }

  return getPostPreviewLabel(post);
}

function Detail({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

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

function ProfileInfo({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.profileInfo}>
      <Ionicons
        name={icon}
        size={18}
        color={colors.accent}
      />

      <View style={styles.profileInfoText}>
        <Text style={styles.profileInfoLabel}>
          {label}
        </Text>

        <Text style={styles.profileInfoValue}>
          {value}
        </Text>
      </View>
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
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.accent}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    color: colors.text,
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
    backgroundColor: colors.cardRaised,
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
    backgroundColor: colors.cardRaised,
    overflow: 'hidden',
  },

  coverGlowGreen: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.accentDark,
    opacity: 0.28,
    top: -80,
    left: -55,
  },

  coverGlowBlue: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.blueDark,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: colors.accent,
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
    backgroundColor: colors.cardRaised,
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
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.card,
  },

  name: {
    color: colors.text,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  editButton: {
    marginTop: 18,
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.accent,
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
    color: colors.text,
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
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  rowSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },

  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },

  profileStat: {
    alignItems: 'center',
    minWidth: 80,
  },

  profileStatValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  profileStatLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },

  profileStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  profileActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },

  profileActionPrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  profileActionPrimaryText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
  },

  profileActionSecondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  profileActionSecondaryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },

  profileSection: {
    marginTop: 22,
  },
  profileTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },

  profileTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  profileTabActive: {
    borderBottomColor: colors.accent,
  },

  profileTabText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.muted,
  },

  profileTabTextActive: {
    color: colors.accent,
  },

  bioText: {
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 18,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  bioPlaceholder: {
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 18,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  profileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },


  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 12,
  },

  profileInfoText: {
    flex: 1,
  },

  profileInfoLabel: {
    color: colors.muted,
    fontSize: 11,
  },

  profileInfoValue: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },

  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  profileTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  profileTagText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  postsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  viewAllText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
  },

  postsCountLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },

  postPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  postPreviewIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginRight: 10,
  },

  postPreviewBody: {
    flex: 1,
  },

  postPreviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },

  postPreviewLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  postPreviewDate: {
    color: colors.muted,
    fontSize: 10,
  },

  postPreview: {
    minHeight: 145,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  postPreviewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 9,
  },

  postPreviewMeta: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 5,
    textTransform: 'capitalize',
  },

  createPostButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
  },

  createPostButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  postPreviewText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
  },
});
}
