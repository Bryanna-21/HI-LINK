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
import { getPosts } from '../src/storage/posts';
import {
  getSavedPostIds,
  unsavePost,
} from '../src/storage/savedPosts';

export default function SavedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSavedPosts = useCallback(async () => {
    const [allPosts, savedIds] = await Promise.all([
      getPosts(),
      getSavedPostIds(),
    ]);

    const savedSet = new Set(savedIds);

    setPosts(
      allPosts.filter((post) =>
        savedSet.has(post.id),
      ),
    );

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedPosts();
    }, [loadSavedPosts]),
  );

  async function refresh() {
    setRefreshing(true);
    await loadSavedPosts();
    setRefreshing(false);
  }

  async function removeSavedPost(postId: string) {
    await unsavePost(postId);

    setPosts((current) =>
      current.filter(
        (post) => post.id !== postId,
      ),
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
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
        <View style={styles.headerLeft}>
          <Ionicons
            name="bookmark"
            size={24}
            color={colors.exileGreen}
          />

          <Text style={styles.title}>
            Saved Resources
          </Text>
        </View>

        <Text style={styles.count}>
          {posts.length}
        </Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.exileGreen}
          />
        }
        contentContainerStyle={
          posts.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Ionicons
                  name={
                    item.type === 'photo'
                      ? 'image-outline'
                      : item.type === 'video'
                        ? 'videocam-outline'
                        : item.type === 'document' ||
                            item.type ===
                              'study_resource'
                          ? 'document-text-outline'
                          : 'chatbubble-outline'
                  }
                  size={22}
                  color={colors.exileGreen}
                />
              </View>

              <View style={styles.cardInfo}>
                <Text
                  style={styles.author}
                  numberOfLines={1}
                >
                  {item.authorName}
                </Text>

                <Text style={styles.type}>
                  {item.type.replace('_', ' ')}
                </Text>
              </View>

              <Ionicons
                name="bookmark"
                size={20}
                color={colors.exileGreen}
              />
            </View>

            {!!item.text && (
              <Text
                style={styles.text}
                numberOfLines={4}
              >
                {item.text}
              </Text>
            )}

            <View style={styles.actions}>
              <Text style={styles.stats}>
                {item.likes} likes · {item.comments}{' '}
                comments
              </Text>

              <Text
                style={styles.remove}
                onPress={() =>
                  removeSavedPost(item.id)
                }
              >
                Remove
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="bookmark-outline"
                size={36}
                color={colors.exileGreen}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Nothing saved yet
            </Text>

            <Text style={styles.emptyText}>
              Save posts, notes, exams and other
              useful resources and they will appear
              here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    minHeight: 64,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },

  count: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },

  listContent: {
    padding: 16,
    gap: 12,
  },

  emptyContent: {
    flexGrow: 1,
    padding: 24,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#123B2A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardInfo: {
    flex: 1,
    marginHorizontal: 12,
  },

  author: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  type: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
    textTransform: 'capitalize',
  },

  text: {
    color: colors.whiteMuted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 14,
  },

  actions: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stats: {
    color: colors.muted,
    fontSize: 12,
  },

  remove: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '700',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#123B2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },

  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 320,
  },
});
