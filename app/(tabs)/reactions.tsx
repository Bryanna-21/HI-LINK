import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getPostReactions,
  PostReaction,
  StoredPostReaction,
} from '../../src/storage/postReactions';
import { getPosts } from '../../src/storage/posts';
import { Post } from '../../src/models/post';
import {
  ThemeColors,
  useTheme,
} from '../../src/theme/ThemeProvider';

const REACTION_META: Record<
  PostReaction,
  {
    emoji: string;
    label: string;
  }
> = {
  like: {
    emoji: '❤️',
    label: 'Like',
  },
  love: {
    emoji: '💕',
    label: 'Love',
  },
  laugh: {
    emoji: '😂',
    label: 'Laugh',
  },
  wow: {
    emoji: '😮',
    label: 'Wow',
  },
  sad: {
    emoji: '😢',
    label: 'Sad',
  },
  angry: {
    emoji: '😡',
    label: 'Angry',
  },
};

type ReactionPost = {
  post: Post;
  reaction: PostReaction;
};

const FILTERS: Array<PostReaction | 'all'> = [
  'all',
  'like',
  'love',
  'laugh',
  'wow',
  'sad',
  'angry',
];

export default function ReactionsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [items, setItems] = useState<
    ReactionPost[]
  >([]);
  const [filter, setFilter] = useState<
    PostReaction | 'all'
  >('all');
  const [loading, setLoading] = useState(true);

  const loadReactions = useCallback(async () => {
    try {
      setLoading(true);

      const [storedReactions, posts] =
        await Promise.all([
          getPostReactions(),
          getPosts(),
        ]);

      const postMap = new Map(
        posts.map((post) => [post.id, post]),
      );

      const joined: ReactionPost[] =
        storedReactions
          .map((stored: StoredPostReaction) => {
            const post = postMap.get(
              stored.postId,
            );

            if (!post) {
              return null;
            }

            return {
              post,
              reaction: stored.reaction,
            };
          })
          .filter(
            (
              item,
            ): item is ReactionPost =>
              item !== null,
          );

      setItems(joined);
    } catch (error) {
      console.error(
        'Failed to load reactions:',
        error,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReactions();
  }, [loadReactions]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') {
      return items;
    }

    return items.filter(
      (item) => item.reaction === filter,
    );
  }, [items, filter]);

  function renderFilter(
    value: PostReaction | 'all',
  ) {
    const selected = filter === value;

    if (value === 'all') {
      return (
        <Pressable
          key={value}
          onPress={() => setFilter(value)}
          style={[
            styles.filterButton,
            selected &&
              styles.filterButtonSelected,
          ]}
        >
          <Ionicons
            name="heart-outline"
            size={16}
            color={
              selected
                ? colors.background
                : colors.text
            }
          />

          <Text
            style={[
              styles.filterText,
              selected &&
                styles.filterTextSelected,
            ]}
          >
            All
          </Text>
        </Pressable>
      );
    }

    const meta = REACTION_META[value];

    return (
      <Pressable
        key={value}
        onPress={() => setFilter(value)}
        style={[
          styles.filterButton,
          selected &&
            styles.filterButtonSelected,
        ]}
      >
        <Text style={styles.filterEmoji}>
          {meta.emoji}
        </Text>

        <Text
          style={[
            styles.filterText,
            selected &&
              styles.filterTextSelected,
          ]}
        >
          {meta.label}
        </Text>
      </Pressable>
    );
  }

  function renderItem({
    item,
  }: {
    item: ReactionPost;
  }) {
    const meta =
      REACTION_META[item.reaction];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.post.authorName
                ?.charAt(0)
                .toUpperCase() || '?'}
            </Text>
          </View>

          <View style={styles.authorInfo}>
            <Text
              style={styles.authorName}
              numberOfLines={1}
            >
              {item.post.authorName}
            </Text>

            <Text
              style={styles.username}
              numberOfLines={1}
            >
              @{item.post.authorUsername}
            </Text>
          </View>

          <View style={styles.reactionBadge}>
            <Text style={styles.badgeEmoji}>
              {meta.emoji}
            </Text>

            <Text style={styles.badgeText}>
              {meta.label}
            </Text>
          </View>
        </View>

        {!!item.post.text && (
          <Text
            style={styles.postText}
            numberOfLines={6}
          >
            {item.post.text}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            {item.post.likes} reactions
          </Text>

          <Text style={styles.footerText}>
            {item.post.comments} comments
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Reactions
          </Text>

          <Text style={styles.subtitle}>
            Posts you reacted to
          </Text>
        </View>

        <Pressable
          onPress={() => void loadReactions()}
          style={styles.refreshButton}
          accessibilityLabel="Refresh reactions"
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={colors.text}
          />
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item}
        renderItem={({ item }) =>
          renderFilter(item)
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          styles.filtersContent
        }
        style={styles.filters}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="small"
            color={colors.accent}
          />

          <Text style={styles.emptyText}>
            Loading reactions...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) =>
            `${item.post.id}-${item.reaction}`
          }
          renderItem={renderItem}
          contentContainerStyle={
            filteredItems.length === 0
              ? styles.emptyContent
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          onRefresh={loadReactions}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="heart-outline"
                size={48}
                color={colors.muted}
              />

              <Text style={styles.emptyTitle}>
                No reactions yet
              </Text>

              <Text style={styles.emptyText}>
                Posts you react to will appear
                here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 82,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 13,
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },

  filters: {
    maxHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },

  filterButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  filterButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  filterEmoji: {
    fontSize: 16,
  },

  filterText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  filterTextSelected: {
    color: colors.background,
  },

  listContent: {
    padding: 12,
    paddingBottom: 100,
    gap: 12,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '800',
  },

  authorInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  authorName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  username: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },

  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.cardRaised,
  },

  badgeEmoji: {
    fontSize: 15,
  },

  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  postText: {
    marginTop: 13,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },

  cardFooter: {
    marginTop: 13,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 18,
  },

  footerText: {
    color: colors.muted,
    fontSize: 12,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  emptyContent: {
    flexGrow: 1,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  emptyTitle: {
    marginTop: 14,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
