import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
import { HiLinkUser } from '../../src/models/user';
import { Post } from '../../src/models/post';
import { getIdentity } from '../../src/storage/identity';
import {
  addConversation,
  getConversations,
} from '../../src/storage/chats';
import { Conversation } from '../../src/models/chat';
import { getPostsByAuthor } from '../../src/storage/posts';
import {
  getFollowerCount,
  getFollowingCount,
  isFollowing,
  toggleFollow,
} from '../../src/storage/follows';
import { getUserById } from '../../src/storage/users';
import HiLinkVideoPlayer from '../../src/components/HiLinkVideoPlayer';

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

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<HiLinkUser | null>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [identityId, setIdentityId] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const identity = await getIdentity();

    if (!identity) {
      router.replace('/onboarding');
      return;
    }

    setIdentityId(identity.id);

    const resolvedUser =
      await getUserById(id);

    if (!resolvedUser) {
      setUser(null);
      setProfilePosts([]);
      setPostCount(0);
      setFollowing(false);
      setFollowerCount(0);
      setFollowingCount(0);
      setLoading(false);
      return;
    }

    if (resolvedUser.id === identity.id) {
      const { getLocal } = await import(
        '../../src/storage/localStore'
      );

      const savedProfilePicture =
        await getLocal<string | null>(
          'profile_picture_uri',
          null,
        );

      const savedCoverImage =
        await getLocal<string | null>(
          'cover_image_uri',
          null,
        );

      setUser({
        ...resolvedUser,
        avatarUri:
          resolvedUser.avatarUri ??
          savedProfilePicture ??
          undefined,
        coverUri:
          resolvedUser.coverUri ??
          savedCoverImage ??
          undefined,
      });
    } else {
      setUser(resolvedUser);
    }

    const posts = await getPostsByAuthor(
      resolvedUser.id,
    );

    setProfilePosts(posts);
    setPostCount(posts.length);

    const [
      followers,
      followingCountValue,
      isUserFollowing,
    ] = await Promise.all([
      getFollowerCount(resolvedUser.id),
      getFollowingCount(resolvedUser.id),
      identity.id === resolvedUser.id
        ? Promise.resolve(false)
        : isFollowing(
            identity.id,
            resolvedUser.id,
          ),
    ]);

    setFollowerCount(followers);
    setFollowingCount(followingCountValue);
    setFollowing(isUserFollowing);

    setLoading(false);
  }, [id]);

  async function handleFollowToggle() {
    if (
      !identityId ||
      !user ||
      identityId === user.id ||
      followBusy
    ) {
      return;
    }

    setFollowBusy(true);

    try {
      const nextFollowing = await toggleFollow(
        identityId,
        user.id,
      );

      setFollowing(nextFollowing);

      const [followers, followingCountValue] =
        await Promise.all([
          getFollowerCount(user.id),
          getFollowingCount(user.id),
        ]);

      setFollowerCount(followers);
      setFollowingCount(followingCountValue);
    } catch (error) {
      console.error(
        'Toggle profile follow failed:',
        error,
      );
    } finally {
      setFollowBusy(false);
    }
  }

  async function messageUser() {
    if (!user || messaging) {
      return;
    }

    const identity = await getIdentity();

    if (!identity) {
      router.replace('/onboarding');
      return;
    }

    if (identity.id === user.id) {
      router.push('/edit-profile');
      return;
    }

    setMessaging(true);

    try {
      const conversations =
        await getConversations();

      const existing =
        conversations.find(
          (conversation) =>
            conversation.type === 'direct' &&
            conversation.participants.some(
              (participant) =>
                participant.id === identity.id,
            ) &&
            conversation.participants.some(
              (participant) =>
                participant.id === user.id,
            ),
        );

      if (existing) {
        router.push({
          pathname: '/chat/[id]',
          params: { id: existing.id },
        });
        return;
      }

      const now =
        new Date().toISOString();

      const conversation: Conversation = {
        id: `chat-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        type: 'direct',
        category: 'normal',
        participants: [
          {
            id: identity.id,
            name: identity.name,
            username: identity.username,
            avatarUri: identity.avatarUri,
          },
          {
            id: user.id,
            name: user.name,
            username: user.username,
            avatarUri: user.avatarUri,
          },
        ],
        unreadCount: 0,
        pinned: false,
        muted: false,
        createdAt: now,
        updatedAt: now,
      };

      await addConversation(conversation);

      router.push({
        pathname: '/chat/[id]',
        params: { id: conversation.id },
      });
    } catch (error) {
      console.error(
        'Create profile conversation failed:',
        error,
      );
    } finally {
      setMessaging(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.text}
            />
          </Pressable>

          <Text style={styles.headerTitle}>
            Profile
          </Text>
        </View>

        <View style={styles.notFound}>
          <View style={styles.notFoundIcon}>
            <Ionicons
              name="person-outline"
              size={34}
              color={colors.accent}
            />
          </View>

          <Text style={styles.notFoundTitle}>
            Profile unavailable
          </Text>

          <Text style={styles.notFoundText}>
            This profile isn't available in your
            current local Hi-Link data.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerOverlay}>
          <Pressable
            style={styles.headerButton}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={colors.text}
            />
          </Pressable>

          <Pressable
            style={styles.headerButton}
            hitSlop={8}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={23}
              color={colors.text}
            />
          </Pressable>
        </View>

        <View style={styles.cover}>
          {user.coverUri ? (
            <Image
              source={{ uri: user.coverUri }}
              style={styles.coverImage}
            />
          ) : (
            <View style={styles.coverEmpty}>
              <View style={styles.coverGlowGreen} />
              <View style={styles.coverGlowBlue} />

              <Ionicons
                name="sparkles-outline"
                size={34}
                color={colors.accent}
              />

              <Text style={styles.coverEmptyText}>
                Hi-Link
              </Text>
            </View>
          )}
        </View>

        <View style={styles.profileBody}>
          <View style={styles.avatarOuter}>
            {user.avatarUri ? (
              <Image
                source={{ uri: user.avatarUri }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarEmpty}>
                <Ionicons
                  name="person"
                  size={38}
                  color={colors.accent}
                />
              </View>
            )}
          </View>

          <Text style={styles.name}>
            {user.name}
          </Text>

          <Text style={styles.username}>
            @{user.username}
          </Text>

          {user.bio ? (
            <Text style={styles.bio}>
              {user.bio}
            </Text>
          ) : null}

          <View style={styles.schoolRow}>
            <Ionicons
              name="school-outline"
              size={17}
              color={colors.accent}
            />

            <Text style={styles.schoolText}>
              {user.schoolName ?? 'School not set'}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.resharedButton}
              onPress={() => {
                router.push({
                  pathname: '/profile/[id]/reshared',
                  params: { id: user.id },
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="View reshared dispatches"
            >
              <Ionicons
                name="repeat-outline"
                size={18}
                color={colors.accent}
              />

              <Text style={styles.resharedButtonText}>
                Reshared
              </Text>
            </Pressable>

            {user.id !==
            identityId ? (
              <Pressable
                style={[
                  styles.primaryButton,
                  following &&
                    styles.primaryButtonFollowing,
                ]}
                onPress={handleFollowToggle}
                disabled={followBusy}
              >
                {followBusy ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.background}
                  />
                ) : (
                  <Ionicons
                    name={
                      following
                        ? 'checkmark-outline'
                        : 'person-add-outline'
                    }
                    size={18}
                    color={colors.background}
                  />
                )}

                <Text style={styles.primaryButtonText}>
                  {following
                    ? 'Following'
                    : 'Follow'}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.secondaryButton}
              onPress={messageUser}
              disabled={messaging}
            >
              {messaging ? (
                <ActivityIndicator
                  size="small"
                  color={colors.text}
                />
              ) : (
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={colors.text}
                />
              )}

              <Text style={styles.secondaryButtonText}>
                Message
              </Text>
            </Pressable>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{postCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {followerCount}
              </Text>
              <Text style={styles.statLabel}>
                Followers
              </Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {followingCount}
              </Text>
              <Text style={styles.statLabel}>
                Following
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              School profile
            </Text>

            {user.form ? (
              <InfoRow
                icon="book-outline"
                label="Form / Grade"
                value={user.form}
              />
            ) : null}

            {user.stream ? (
              <InfoRow
                icon="people-outline"
                label="Stream / Class"
                value={user.stream}
              />
            ) : null}

            {user.house ? (
              <InfoRow
                icon="home-outline"
                label="House"
                value={user.house}
              />
            ) : null}

            {user.boardingStatus &&
            user.boardingStatus !== 'unknown' ? (
              <InfoRow
                icon="bed-outline"
                label="Student type"
                value={
                  user.boardingStatus === 'boarding'
                    ? 'Boarding'
                    : 'Day scholar'
                }
              />
            ) : null}
          </View>

          {(user.schoolName ||
            user.form ||
            user.stream) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Academic profile
              </Text>

              {user.schoolName ? (
                <InfoRow
                  icon="business-outline"
                  label="School"
                  value={user.schoolName}
                />
              ) : null}

              {user.form ? (
                <InfoRow
                  icon="school-outline"
                  label="Form"
                  value={user.form}
                />
              ) : null}

              {user.stream ? (
                <InfoRow
                  icon="people-outline"
                  label="Stream"
                  value={user.stream}
                />
              ) : null}
            </View>
          ) : null}

          {(user.clubs?.length ||
            user.societies?.length) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Clubs & societies
              </Text>

              <View style={styles.tagList}>
                {[
                  ...(user.clubs ?? []),
                  ...(user.societies ?? []),
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

          {user.interests?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Interests
              </Text>

              <View style={styles.tagList}>
                {user.interests.map((interest) => (
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

          {profilePosts.some(
            (post) =>
              post.type === 'video' &&
              post.attachment?.uri,
          ) ? (
            <View style={styles.section}>
              <View style={styles.postsHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Videos
                  </Text>

                  <Text style={styles.postsCountText}>
                    {profilePosts.filter(
                      (post) =>
                        post.type === 'video' &&
                        post.attachment?.uri,
                    ).length}{' '}
                    videos
                  </Text>
                </View>
              </View>

              <View style={styles.profileVideosList}>
                {profilePosts
                  .filter(
                    (post) =>
                      post.type === 'video' &&
                      post.attachment?.uri,
                  )
                  .slice(0, 6)
                  .map((post) => (
                    <View
                      key={post.id}
                      style={styles.profileVideoCard}
                    >
                      <HiLinkVideoPlayer
                        uri={post.attachment!.uri}
                        postId={post.id}
                        width={
                          post.attachment!.width
                        }
                        height={
                          post.attachment!.height
                        }
                        onFullscreen={() =>
                          router.push({
                            pathname:
                              '/video/[id]',
                            params: {
                              id: post.id,
                            },
                          })
                        }
                      />

                      {post.text ? (
                        <Text
                          style={
                            styles.profileVideoCaption
                          }
                          numberOfLines={2}
                        >
                          {post.text}
                        </Text>
                      ) : null}

                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname:
                              '/video/[id]',
                            params: {
                              id: post.id,
                            },
                          })
                        }
                        style={
                          styles.profileVideoOpen
                        }
                      >
                        <Ionicons
                          name="play-circle-outline"
                          size={17}
                          color={
                            colors.accent
                          }
                        />

                        <Text
                          style={
                            styles.profileVideoOpenText
                          }
                        >
                          Open video
                        </Text>
                      </Pressable>
                    </View>
                  ))}
              </View>
            </View>
          ) : null}

          <View style={styles.postsHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Posts
              </Text>

              <Text style={styles.postsCountText}>
                {profilePosts.length}{' '}
                {profilePosts.length === 1 ? 'post' : 'posts'}
              </Text>
            </View>
          </View>

          {profilePosts.length > 0 ? (
            <View style={styles.profilePostsList}>
              {profilePosts.slice(0, 5).map((post) => (
                <Pressable
                  key={post.id}
                  style={styles.profilePostCard}
                  onPress={() => {
                    if (post.authorId === identityId) {
                      router.push('/my-posts');
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${getPostPreviewLabel(post)}`}
                >
                  <View style={styles.profilePostIconWrap}>
                    <Ionicons
                      name={getPostPreviewIcon(post) as any}
                      size={22}
                      color={colors.accent}
                    />
                  </View>

                  <View style={styles.profilePostBody}>
                    <View style={styles.profilePostTopRow}>
                      <Text style={styles.profilePostLabel}>
                        {getPostPreviewLabel(post)}
                      </Text>

                      <Text style={styles.profilePostDate}>
                        {new Date(
                          post.createdAt,
                        ).toLocaleDateString()}
                      </Text>
                    </View>

                    <Text
                      style={styles.profilePostText}
                      numberOfLines={2}
                    >
                      {getPostPreviewText(post)}
                    </Text>

                    <Text style={styles.profilePostMeta}>
                      {post.visibility.replace('_', ' ')}
                      {post.editedAt ? ' • Edited' : ''}
                    </Text>
                  </View>
                </Pressable>
              ))}

              {profilePosts.length > 5 ? (
                <Pressable
                  style={styles.viewAllPostsButton}
                  onPress={() => {
                    if (user.id === identityId) {
                      router.push('/my-posts');
                    }
                  }}
                >
                  <Text style={styles.viewAllPostsText}>
                    View all {profilePosts.length} posts
                  </Text>

                  <Ionicons
                    name="arrow-forward-outline"
                    size={17}
                    color={colors.accent}
                  />
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyPosts}>
              <Ionicons
                name="images-outline"
                size={30}
                color={colors.muted}
              />

              <Text style={styles.emptyPostsTitle}>
                No posts yet
              </Text>

              <Text style={styles.emptyPostsText}>
                Posts from this profile will appear
                here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
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
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={19}
        color={colors.accent}
      />

      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingBottom: 40,
  },

  headerOverlay: {
    position: 'absolute',
    zIndex: 10,
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(7,9,8,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerTitle: {
    marginLeft: 16,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  cover: {
    width: '100%',
    height: 190,
    backgroundColor: colors.cardRaised,
  },

  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  coverEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  coverGlowGreen: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.accentDark,
    opacity: 0.28,
    top: -90,
    left: -50,
  },

  coverGlowBlue: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.blueDark,
    opacity: 0.3,
    bottom: -130,
    right: -70,
  },

  coverEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
  },

  profileBody: {
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  avatarOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginTop: -44,
    padding: 4,
    backgroundColor: colors.accent,
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    resizeMode: 'cover',
  },

  avatarEmpty: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
  },

  username: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 3,
  },

  bio: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 520,
  },

  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 7,
  },

  schoolText: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  resharedButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.background,
  },

  resharedButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },

  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  primaryButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },

  primaryButtonFollowing: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  stats: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },

  stat: {
    alignItems: 'center',
  },

  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },

  section: {
    width: '100%',
    marginTop: 22,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },

  infoText: {
    flex: 1,
  },

  infoLabel: {
    color: colors.muted,
    fontSize: 11,
  },

  infoValue: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },

  tagList: {
    width: '100%',
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

  postsHeader: {
    width: '100%',
    marginTop: 22,
  },

  postsCountText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  profilePostsList: {
    gap: 10,
  },

  profileVideosList: {
    gap: 12,
  },

  profileVideoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  profileVideoCaption: {
    paddingHorizontal: 12,
    paddingTop: 10,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  profileVideoOpen: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 12,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },

  profileVideoOpenText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },

  profilePostCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 13,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  profilePostIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  profilePostBody: {
    flex: 1,
    minWidth: 0,
  },

  profilePostTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  profilePostLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  profilePostDate: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },

  profilePostText: {
    marginTop: 6,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  profilePostMeta: {
    marginTop: 7,
    color: colors.muted,
    fontSize: 11,
    textTransform: 'capitalize',
  },

  viewAllPostsButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  viewAllPostsText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },

  emptyPosts: {
    width: '100%',
    minHeight: 150,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  emptyPostsTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 9,
  },

  emptyPostsText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  notFoundIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  notFoundTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  notFoundText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});
}
