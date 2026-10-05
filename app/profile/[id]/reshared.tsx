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
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemeColors, useTheme } from '../../../src/theme/ThemeProvider';
import { Post } from '../../../src/models/post';
import { HiLinkUser } from '../../../src/models/user';
import { getIdentity } from '../../../src/storage/identity';
import { getPosts } from '../../../src/storage/posts';
import { getReshares } from '../../../src/storage/reshares';

export default function ResharedDispatchesScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const userId = Array.isArray(id) ? id[0] : id;

  const [user, setUser] =
    useState<HiLinkUser | null>(null);

  const [posts, setPosts] =
    useState<Post[]>([]);

  const [loading, setLoading] =
    useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const identity = await getIdentity();

      if (!identity) {
        router.replace('/onboarding');
        return;
      }

      if (identity.id !== userId) {
        setUser(null);
        setPosts([]);
        return;
      }

      setUser(identity);

      const records = await getReshares();
      const allPosts = await getPosts();

      const userRecords = records.filter(
        (record) => record.userId === userId,
      );

      const resharedPosts = userRecords
        .map((record) =>
          allPosts.find(
            (post) =>
              post.id === record.resharedPostId,
          ),
        )
        .filter(
          (post): post is Post =>
            Boolean(post),
        );

      setPosts(resharedPosts);
    } catch (error) {
      console.error(
        'Load reshared dispatches failed:',
        error,
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={8}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            Reshared Dispatches
          </Text>

          {user ? (
            <Text style={styles.headerSubtitle}>
              @{user.username}
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={colors.accent}
          />
        </View>
      ) : !user ? (
        <View style={styles.center}>
          <Ionicons
            name="person-outline"
            size={42}
            color={colors.muted}
          />

          <Text style={styles.emptyTitle}>
            Profile unavailable
          </Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="repeat-outline"
              size={32}
              color={colors.accent}
            />
          </View>

          <Text style={styles.emptyTitle}>
            No reshared dispatches
          </Text>

          <Text style={styles.emptyText}>
            Dispatches reshared by this Emissary
            will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {posts.map((post) => (
            <DispatchCard
              key={post.id}
              post={post}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function DispatchCard({
  post,
}: {
  post: Post;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        {post.authorAvatarUri ? (
          <Image
            source={{
              uri: post.authorAvatarUri,
            }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarEmpty}>
            <Ionicons
              name="person"
              size={18}
              color={colors.accent}
            />
          </View>
        )}

        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>
            {post.authorName}
          </Text>

          <Text style={styles.authorUsername}>
            @{post.authorUsername}
          </Text>
        </View>

        <View style={styles.resharedBadge}>
          <Ionicons
            name="repeat-outline"
            size={15}
            color={colors.accent}
          />

          <Text style={styles.resharedBadgeText}>
            Reshared
          </Text>
        </View>
      </View>

      {post.text ? (
        <Text style={styles.postText}>
          {post.text}
        </Text>
      ) : null}

      {post.attachment?.uri ? (
        <View style={styles.attachment}>
          {post.type === 'photo' ? (
            <Image
              source={{
                uri: post.attachment.uri,
              }}
              style={styles.media}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.filePreview}>
              <Ionicons
                name={
                  post.type === 'video'
                    ? 'videocam-outline'
                    : 'document-outline'
                }
                size={30}
                color={colors.accent}
              />

              <Text
                style={styles.fileName}
                numberOfLines={2}
              >
                {post.attachment.name ??
                  'Attached file'}
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitleWrap: {
    marginLeft: 8,
  },

  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  headerSubtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    marginBottom: 16,
  },

  emptyTitle: {
    marginTop: 14,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  card: {
    marginBottom: 14,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  avatarEmpty: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  authorInfo: {
    flex: 1,
    marginLeft: 10,
  },

  authorName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  authorUsername: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },

  resharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  resharedBadgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },

  postText: {
    marginTop: 13,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },

  attachment: {
    marginTop: 13,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.background,
  },

  media: {
    width: '100%',
    height: 230,
  },

  filePreview: {
    minHeight: 100,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fileName: {
    marginTop: 9,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
}
