import {
  getUserReaction,
  getUserReactions,
  setUserReaction,
} from './reactions';

/**
 * "Liked" is the heart shortcut over the reaction ledger: a post counts as
 * liked when the user has any reaction on it. Tapping the heart on an
 * unreacted post records a `like`; tapping it again clears the reaction.
 */

export async function getLikedPostIds(userId: string): Promise<string[]> {
  const records = await getUserReactions(userId);

  return records.map((record) => record.postId);
}

export async function isPostLiked(
  postId: string,
  userId: string,
): Promise<boolean> {
  return (await getUserReaction(postId, userId)) !== null;
}

export async function likePost(
  postId: string,
  userId: string,
): Promise<void> {
  if ((await getUserReaction(postId, userId)) !== null) {
    return;
  }

  await setUserReaction(postId, userId, 'like');
}

export async function unlikePost(
  postId: string,
  userId: string,
): Promise<void> {
  await setUserReaction(postId, userId, null);
}

export async function toggleLikedPost(
  postId: string,
  userId: string,
): Promise<boolean> {
  if (await isPostLiked(postId, userId)) {
    await unlikePost(postId, userId);

    return false;
  }

  await likePost(postId, userId);

  return true;
}
