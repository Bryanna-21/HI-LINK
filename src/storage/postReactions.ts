import {
  getActiveUserId,
} from './accountScope';
import {
  getUserReaction,
  getUserReactions,
  PostReaction,
  setUserReaction,
} from './reactions';

/**
 * Compatibility facade over the single reaction ledger (`reactions.ts`).
 *
 * Screens written against the old per-device store keep working, but every
 * call now reads/writes the account-scoped ledger so counts and "my
 * reaction" can never disagree between the feed, reels and reactions tab.
 */

export type { PostReaction } from './reactions';

export interface StoredPostReaction {
  postId: string;
  reaction: PostReaction;
}

export async function getPostReactions(): Promise<StoredPostReaction[]> {
  const records = await getUserReactions();

  return records.map((record) => ({
    postId: record.postId,
    reaction: record.reaction,
  }));
}

export async function getPostReaction(
  postId: string,
): Promise<PostReaction | null> {
  return getUserReaction(postId);
}

export async function setPostReaction(
  postId: string,
  reaction: PostReaction,
): Promise<void> {
  const userId = await getActiveUserId();

  if (!userId) {
    return;
  }

  await setUserReaction(postId, userId, reaction);
}

export async function removePostReaction(postId: string): Promise<void> {
  const userId = await getActiveUserId();

  if (!userId) {
    return;
  }

  await setUserReaction(postId, userId, null);
}

export async function togglePostReaction(
  postId: string,
  reaction: PostReaction,
): Promise<PostReaction | null> {
  const current = await getPostReaction(postId);

  if (current === reaction) {
    await removePostReaction(postId);

    return null;
  }

  await setPostReaction(postId, reaction);

  return reaction;
}
