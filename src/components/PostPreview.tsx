import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { Post } from '../models/post';
import { getActiveUserId } from '../storage/accountScope';
import { getReactionSummary, getUserReaction, setUserReaction } from '../storage/reactions';
import { ThemeColors, useTheme } from '../theme/ThemeProvider';
import { Avatar } from './ui';

/**
 * Compact post card used by community and profile-like lists. Reactions go
 * through the same ledger as the main feed, so counts always agree.
 */
export function PostPreview({
  post,
  onDelete,
  onReport,
}: {
  post: Post;
  onDelete?: () => void;
  onReport?: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(post.likes);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [mine, summary] = await Promise.all([getUserReaction(post.id), getReactionSummary(post.id)]);

      if (!cancelled) {
        setLiked(mine !== null);
        setCount(summary.total);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post.id]);

  const toggleLike = useCallback(async () => {
    const userId = await getActiveUserId();

    if (!userId) {
      return;
    }

    const result = await setUserReaction(post.id, userId, liked ? null : 'like');

    setLiked(result.reaction !== null);
    setCount(result.summary.total);
  }, [liked, post.id]);

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.author}
        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: post.authorId } })}
        accessibilityRole="button"
        accessibilityLabel={`Open ${post.authorName}'s profile`}
      >
        <Avatar uri={post.authorAvatarUri} name={post.authorName} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{post.authorName}</Text>
          <Text style={styles.meta}>
            @{post.authorUsername} · {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>
        {post.type === 'question' ? <Text style={styles.tag}>Question</Text> : null}
      </Pressable>

      {post.text ? <Text style={styles.text}>{post.text}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={toggleLike}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Remove reaction' : 'Like'}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.danger : colors.muted} />
          <Text style={styles.count}>{count}</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push({ pathname: '/comments/[postId]', params: { postId: post.id } })}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel="Open comments"
        >
          <Ionicons name="chatbubble-outline" size={19} color={colors.muted} />
          <Text style={styles.count}>{post.comments}</Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        {onReport ? (
          <Pressable onPress={onReport} hitSlop={8} accessibilityRole="button" accessibilityLabel="Report post">
            <Ionicons name="flag-outline" size={18} color={colors.muted} />
          </Pressable>
        ) : null}

        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete post">
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    author: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { color: colors.text, fontWeight: '800', fontSize: 14 },
    meta: { color: colors.muted, fontSize: 11, marginTop: 1 },
    tag: { color: colors.blue, fontSize: 11, fontWeight: '800' },
    text: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 10 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    count: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  });
