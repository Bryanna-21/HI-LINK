import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../src/theme/colors';
import { Post } from '../src/models/post';
import { getIdentity } from '../src/storage/identity';
import { getPostsByAuthor } from '../src/storage/posts';

export default function MyPostsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    const identity = await getIdentity();

    if (!identity) {
      router.replace('/onboarding');
      return;
    }

    const userPosts = await getPostsByAuthor(identity.id);

    setPosts(userPosts);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts]),
  );

  async function refresh() {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }

  function renderPost({ item }: { item: Post }) {
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Ionicons
              name="person"
              size={20}
              color={colors.exileGreen}
            />
          </View>

          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>
              {item.authorName}
            </Text>

            <Text style={styles.authorUsername}>
              @{item.authorUsername}
            </Text>
          </View>
        </View>

        {item.text ? (
          <Text style={styles.postText}>
            {item.text}
          </Text>
        ) : null}

        <View style={styles.postMeta}>
          <Text style={styles.postType}>
            {formatPostType(item.type)}
          </Text>

          <Text style={styles.postDate}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        <View style={styles.stats}>
          <Text style={styles.stat}>
            ❤️ {item.likes}
          </Text>

          <Text style={styles.stat}>
            💬 {item.comments}
          </Text>

          <Text style={styles.stat}>
            ↗ {item.shares}
          </Text>

          <Text style={styles.stat}>
            🔖 {item.saves}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.exileGreen}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.white}
          onPress={() => router.back()}
        />

        <Text style={styles.headerTitle}>
          My Posts
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={[
          styles.list,
          posts.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.exileGreen}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="images-outline"
                size={34}
                color={colors.exileGreen}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No posts yet
            </Text>

            <Text style={styles.emptyText}>
              Your photos, videos, thoughts,
              questions and study resources
              will appear here.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function formatPostType(type: Post['type']) {
  switch (type) {
    case 'photo':
      return 'Photo';
    case 'video':
      return 'Video';
    case 'document':
      return 'Document';
    case 'question':
      return 'Question';
    case 'study_resource':
      return 'Study Resource';
    case 'event':
      return 'Event';
    default:
      return 'Post';
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
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

  header: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerTitle: {
    flex: 1,
    marginLeft: 16,
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },

  headerSpacer: {
    width: 24,
  },

  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },

  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.charcoal,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },

  emptyTitle: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 8,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  postCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.charcoal2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  authorInfo: {
    marginLeft: 11,
  },

  authorName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  authorUsername: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },

  postText: {
    color: colors.whiteMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 14,
  },

  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },

  postType: {
    color: colors.exileGreen,
    fontSize: 12,
    fontWeight: '800',
  },

  postDate: {
    color: colors.muted,
    fontSize: 12,
  },

  stats: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  stat: {
    color: colors.muted,
    fontSize: 12,
  },
});
