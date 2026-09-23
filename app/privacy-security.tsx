import {
  useCallback,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemeColors, useTheme } from '../src/theme/ThemeProvider';
import { getPosts } from '../src/storage/posts';
import { getBlockedUserIds, unblockUser } from '../src/storage/blockedUsers';
import { getHiddenPostIds, unhidePost } from '../src/storage/hiddenPosts';

type BlockedEntry = {
  id: string;
  name: string;
  username: string;
};

export default function PrivacySecurityScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [blockedUsers, setBlockedUsers] =
    useState<BlockedEntry[]>([]);
  const [hiddenPosts, setHiddenPosts] =
    useState<
      {
        id: string;
        title: string;
        author: string;
      }[]
    >([]);
  const [refreshing, setRefreshing] =
    useState(false);

  const load = useCallback(async () => {
    const [blockedIds, hiddenIds, posts] =
      await Promise.all([
        getBlockedUserIds(),
        getHiddenPostIds(),
        getPosts(),
      ]);

    const blockedEntries: BlockedEntry[] =
      blockedIds.map((id) => {
        const post = posts.find(
          (item) => item.authorId === id,
        );

        return {
          id,
          name:
            post?.authorName ||
            'Hi-Link user',
          username:
            post?.authorUsername ||
            'unknown',
        };
      });

    const hiddenEntries = hiddenIds
      .map((id) => {
        const post = posts.find(
          (item) => item.id === id,
        );

        if (!post) {
          return null;
        }

        return {
          id: post.id,
          title:
            post.text?.trim() ||
            `${post.type} post`,
          author: post.authorName,
        };
      })
      .filter(
        (
          item,
        ): item is {
          id: string;
          title: string;
          author: string;
        } => item !== null,
      );

    setBlockedUsers(blockedEntries);
    setHiddenPosts(hiddenEntries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  function confirmUnblock(
    user: BlockedEntry,
  ) {
    Alert.alert(
      'Unblock user?',
      `Posts from @${user.username} can appear in your feed again.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unblock',
          onPress: async () => {
            await unblockUser(user.id);
            await load();
          },
        },
      ],
    );
  }

  function confirmUnhide(
    postId: string,
  ) {
    Alert.alert(
      'Show post again?',
      'This post can appear in your feed again.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Show post',
          onPress: async () => {
            await unhidePost(postId);
            await load();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Privacy & Security
            </Text>
            <Text style={styles.subtitle}>
              Control your safety and visibility
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
            />
          }
        >
          <View style={styles.infoCard}>
            <Ionicons
              name="shield-checkmark"
              size={25}
              color={colors.accent}
            />

            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>
                Your controls
              </Text>

              <Text style={styles.infoBody}>
                Blocks and hidden posts are stored
                locally on this device.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Blocked Users
          </Text>

          {blockedUsers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="person-remove-outline"
                size={28}
                color={colors.muted}
              />

              <Text style={styles.emptyTitle}>
                No blocked users
              </Text>

              <Text style={styles.emptyBody}>
                Users you block will appear here.
              </Text>
            </View>
          ) : (
            blockedUsers.map((user) => (
              <View
                key={user.id}
                style={styles.row}
              >
                <View
                  style={styles.avatar}
                >
                  <Ionicons
                    name="person"
                    size={19}
                    color={colors.accent}
                  />
                </View>

                <View
                  style={styles.rowText}
                >
                  <Text
                    style={styles.rowTitle}
                  >
                    {user.name}
                  </Text>

                  <Text
                    style={styles.rowSubtitle}
                  >
                    @{user.username}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    confirmUnblock(user)
                  }
                  style={styles.actionButton}
                >
                  <Text
                    style={styles.actionText}
                  >
                    Unblock
                  </Text>
                </Pressable>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>
            Hidden Posts
          </Text>

          {hiddenPosts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="eye-off-outline"
                size={28}
                color={colors.muted}
              />

              <Text style={styles.emptyTitle}>
                No hidden posts
              </Text>

              <Text style={styles.emptyBody}>
                Posts you hide from your feed will
                appear here.
              </Text>
            </View>
          ) : (
            hiddenPosts.map((post) => (
              <View
                key={post.id}
                style={styles.row}
              >
                <View
                  style={styles.postIcon}
                >
                  <Ionicons
                    name="eye-off-outline"
                    size={20}
                    color={colors.blue}
                  />
                </View>

                <View
                  style={styles.rowText}
                >
                  <Text
                    style={styles.rowTitle}
                    numberOfLines={2}
                  >
                    {post.title}
                  </Text>

                  <Text
                    style={styles.rowSubtitle}
                  >
                    By {post.author}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    confirmUnhide(post.id)
                  }
                  style={styles.actionButton}
                >
                  <Text
                    style={styles.actionText}
                  >
                    Show
                  </Text>
                </Pressable>
              </View>
            ))
          )}

          <View style={styles.futureCard}>
            <Ionicons
              name="lock-closed-outline"
              size={21}
              color={colors.blue}
            />

            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>
                More privacy controls coming
              </Text>

              <Text style={styles.infoBody}>
                Profile visibility, messaging
                permissions, school visibility and
                account safety controls will live here.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },

  futureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 28,
  },

  infoText: {
    flex: 1,
    marginLeft: 12,
  },

  infoTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  infoBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 9,
  },

  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowText: {
    flex: 1,
    marginHorizontal: 12,
  },

  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  rowSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },

  actionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  actionText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});
