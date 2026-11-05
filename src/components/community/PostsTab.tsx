import { useState } from 'react';
import { Alert, View } from 'react-native';

import {
  getCommunityPosts,
  postToCommunity,
  removeCommunityPost,
} from '../../storage/communities';
import { useLoad } from '../../hooks/useLoad';
import { PostPreview } from '../PostPreview';
import { ReportSheet, ReportTarget } from '../ReportSheet';
import { Button, EmptyState, ErrorState, Field, LoadingState } from '../ui';
import type { TabProps } from './types';

export function PostsTab({ community, userId, isMember, isAdmin, onChanged }: TabProps) {
  const { data, loading, error, reload } = useLoad(() => getCommunityPosts(community.id), [community.id]);
  const [text, setText] = useState('');
  const [asQuestion, setAsQuestion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);

  async function publish() {
    setBusy(true);

    try {
      await postToCommunity(community.id, { type: asQuestion ? 'question' : 'text', text });
      setText('');
      setAsQuestion(false);
      await reload();
      await onChanged();
    } catch (caught) {
      Alert.alert('Could not post', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(postId: string) {
    Alert.alert('Delete post', 'This removes the post, its comments and reactions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeCommunityPost(userId, postId);
            await reload();
          } catch (caught) {
            Alert.alert('Could not delete', caught instanceof Error ? caught.message : 'Try again.');
          }
        },
      },
    ]);
  }

  return (
    <View>
      {isMember ? (
        <View style={{ marginBottom: 8 }}>
          <Field
            label={asQuestion ? 'Ask the community' : 'Share with the community'}
            value={text}
            onChangeText={setText}
            multiline
            placeholder={asQuestion ? 'What do you want to ask?' : "What's on your mind?"}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label={asQuestion ? 'Switch to post' : 'Make it a question'}
              variant="secondary"
              onPress={() => setAsQuestion((value) => !value)}
            />
            <Button label="Post" onPress={publish} loading={busy} disabled={!text.trim()} />
          </View>
        </View>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={isMember || community.privacy === 'open' ? 'No posts yet' : 'Posts are for members'}
          body={
            isMember
              ? 'Start the conversation.'
              : community.privacy === 'open'
                ? 'Join to post in this community.'
                : 'Join this community to see and share posts.'
          }
        />
      ) : (
        (data ?? []).map((post) => (
          <PostPreview
            key={post.id}
            post={post}
            onDelete={post.authorId === userId || isAdmin ? () => confirmDelete(post.id) : undefined}
            onReport={
              post.authorId === userId
                ? undefined
                : () =>
                    setReporting({
                      targetType: 'post',
                      targetId: post.id,
                      targetOwnerId: post.authorId,
                      institutionId: community.institutionId,
                      communityId: community.id,
                      label: 'post',
                    })
            }
          />
        ))
      )}

      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </View>
  );
}
