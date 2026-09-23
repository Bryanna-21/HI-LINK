import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
import { PostComment } from '../../src/models/comment';
import { getIdentity } from '../../src/storage/identity';
import {
  addComment,
  deleteComment,
  getCommentsByPost,
} from '../../src/storage/comments';
import {
  getPosts,
  updatePost,
} from '../../src/storage/posts';

export default function CommentsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { postId } =
    useLocalSearchParams<{ postId: string }>();

  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!postId) {
      return;
    }

    const identity = await getIdentity();

    if (!identity) {
      router.replace('/onboarding');
      return;
    }

    setCurrentUserId(identity.id);

    const result = await getCommentsByPost(postId);

    setComments(result);
    setLoading(false);
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      loadComments();
    }, [loadComments]),
  );

  async function handleAddComment() {
    const trimmed = text.trim();

    if (!trimmed || !postId || posting) {
      return;
    }

    const identity = await getIdentity();

    if (!identity) {
      router.replace('/onboarding');
      return;
    }

    setPosting(true);

    const now = new Date().toISOString();

    const comment: PostComment = {
      id: `comment-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      postId,

      authorId: identity.id,
      authorName: identity.name,
      authorUsername: identity.username,
      authorAvatarUri: identity.avatarUri,

      text: trimmed,

      createdAt: now,
      updatedAt: now,
    };

    await addComment(comment);

    setComments((current) => [
      ...current,
      comment,
    ]);

    const posts = await getPosts();
    const post = posts.find(
      (item) => item.id === postId,
    );

    if (post) {
      await updatePost({
        ...post,
        comments: post.comments + 1,
        updatedAt: new Date().toISOString(),
      });
    }

    setText('');
    setPosting(false);
  }

  function handleDeleteComment(comment: PostComment) {
    if (comment.authorId !== currentUserId) {
      return;
    }

    Alert.alert(
      'Delete comment?',
      'This comment will be removed from this post.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteComment(comment.id);

            setComments((current) =>
              current.filter(
                (item) => item.id !== comment.id,
              ),
            );

            const posts = await getPosts();
            const post = posts.find(
              (item) => item.id === postId,
            );

            if (post) {
              await updatePost({
                ...post,
                comments: Math.max(
                  0,
                  post.comments - 1,
                ),
                updatedAt: new Date().toISOString(),
              });
            }
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Comments
          </Text>

          <Text style={styles.headerCount}>
            {comments.length}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={colors.accent}
          />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            comments.length === 0 &&
              styles.emptyList,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CommentRow
              comment={item}
              isMine={
                item.authorId === currentUserId
              }
              onDelete={() =>
                handleDeleteComment(item)
              }
              colors={colors}
              styles={styles}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="chatbubble-outline"
                  size={30}
                  color={colors.accent}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No comments yet
              </Text>

              <Text style={styles.emptyText}>
                Be the first to join the
                conversation.
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.composer}>
        <View style={styles.inputWrapper}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a comment..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={1000}
            style={styles.input}
          />
        </View>

        <Pressable
          style={[
            styles.sendButton,
            (!text.trim() || posting) &&
              styles.sendButtonDisabled,
          ]}
          disabled={!text.trim() || posting}
          onPress={handleAddComment}
        >
          {posting ? (
            <ActivityIndicator
              size="small"
              color={colors.background}
            />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={colors.background}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentRow({
  comment,
  isMine,
  onDelete,
  colors,
  styles,
}: {
  comment: PostComment;
  isMine: boolean;
  onDelete: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      style={styles.comment}
      onLongPress={
        isMine ? onDelete : undefined
      }
      delayLongPress={450}
    >
      {comment.authorAvatarUri ? (
        <Image
          source={{
            uri: comment.authorAvatarUri,
          }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarEmpty}>
          <Ionicons
            name="person"
            size={17}
            color={colors.accent}
          />
        </View>
      )}

      <View style={styles.commentBody}>
        <View style={styles.nameRow}>
          <Text
            style={styles.authorName}
            numberOfLines={1}
          >
            {comment.authorName}
          </Text>

          <Text
            style={styles.username}
            numberOfLines={1}
          >
            @{comment.authorUsername}
          </Text>
        </View>

        <Text style={styles.commentText}>
          {comment.text}
        </Text>

        {isMine ? (
          <Text style={styles.deleteHint}>
            Hold to delete
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  headerCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: colors.cardRaised,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
  },

  headerSpacer: {
    width: 42,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: {
    padding: 16,
    paddingBottom: 20,
  },

  emptyList: {
    flexGrow: 1,
  },

  comment: {
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 12,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    resizeMode: 'cover',
  },

  avatarEmpty: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  commentBody: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  authorName: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  username: {
    flexShrink: 1,
    color: colors.muted,
    fontSize: 12,
  },

  commentText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },

  deleteHint: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 7,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 13,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.cardRaised,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  inputWrapper: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },

  input: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxHeight: 115,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonDisabled: {
    opacity: 0.35,
  },
});
