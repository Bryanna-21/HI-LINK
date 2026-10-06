import { getLocal, removeLocal, setLocal } from './localStore';
import { getActiveUserId } from './accountScope';
import { patchPost } from './posts';

/**
 * Single reaction system for posts and videos.
 *
 * One record per (post, user). Reaction counts and "my reaction" are always
 * derived from this ledger, so the heart, the reaction picker, the reactions
 * tab and the video feed can never disagree. `Post.likes` is a denormalised
 * total that is rewritten from the ledger on every change.
 */

export type PostReaction =
  | 'like'
  | 'love'
  | 'laugh'
  | 'wow'
  | 'sad'
  | 'angry';

export const POST_REACTIONS: PostReaction[] = [
  'like',
  'love',
  'laugh',
  'wow',
  'sad',
  'angry',
];

export interface ReactionRecord {
  postId: string;
  userId: string;
  reaction: PostReaction;
  createdAt: string;
  updatedAt: string;
}

export interface ReactionSummary {
  total: number;
  counts: Record<PostReaction, number>;
}

const LEDGER_KEY = 'reaction_ledger';
const MIGRATION_KEY = 'reaction_ledger_migrated_v1';
const LEGACY_REACTIONS_KEY = 'post_reactions';
const LEGACY_LIKED_PREFIX = 'liked_post_ids_';

const emptyCounts = (): Record<PostReaction, number> => ({
  like: 0,
  love: 0,
  laugh: 0,
  wow: 0,
  sad: 0,
  angry: 0,
});

/**
 * One-time import of the two legacy stores (global `post_reactions` and
 * per-user `liked_post_ids_<id>`). Legacy global reactions had no owner, so
 * they are claimed by the account that is active when migration runs.
 */
async function migrateLegacy(ledger: ReactionRecord[]): Promise<ReactionRecord[]> {
  const done = await getLocal<boolean>(MIGRATION_KEY, false);

  if (done) {
    return ledger;
  }

  const activeUserId = await getActiveUserId();
  const next = [...ledger];
  const now = new Date().toISOString();

  const legacy = await getLocal<{ postId: string; reaction: PostReaction }[]>(
    LEGACY_REACTIONS_KEY,
    [],
  );

  if (activeUserId) {
    for (const item of legacy) {
      if (!next.some((r) => r.postId === item.postId && r.userId === activeUserId)) {
        next.push({
          postId: item.postId,
          userId: activeUserId,
          reaction: item.reaction,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  // Per-user liked ids are discovered through the known user list.
  const users = await getLocal<{ id: string }[]>('users', []);

  for (const user of users) {
    const likedIds = await getLocal<string[]>(`${LEGACY_LIKED_PREFIX}${user.id}`, []);

    for (const postId of likedIds) {
      if (!next.some((r) => r.postId === postId && r.userId === user.id)) {
        next.push({
          postId,
          userId: user.id,
          reaction: 'like',
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  await setLocal(LEDGER_KEY, next);
  await setLocal(MIGRATION_KEY, true);
  await removeLocal(LEGACY_REACTIONS_KEY);

  return next;
}

export async function getReactionRecords(): Promise<ReactionRecord[]> {
  const ledger = await getLocal<ReactionRecord[]>(LEDGER_KEY, []);

  return migrateLegacy(ledger);
}

export function summarize(records: ReactionRecord[], postId: string): ReactionSummary {
  const counts = emptyCounts();
  let total = 0;

  for (const record of records) {
    if (record.postId === postId) {
      counts[record.reaction] += 1;
      total += 1;
    }
  }

  return { total, counts };
}

export async function getReactionSummary(postId: string): Promise<ReactionSummary> {
  return summarize(await getReactionRecords(), postId);
}

export async function getUserReaction(
  postId: string,
  userId?: string | null,
): Promise<PostReaction | null> {
  const owner = userId === undefined ? await getActiveUserId() : userId;

  if (!owner) {
    return null;
  }

  const records = await getReactionRecords();

  return records.find((r) => r.postId === postId && r.userId === owner)?.reaction ?? null;
}

export async function getUserReactions(userId?: string | null): Promise<ReactionRecord[]> {
  const owner = userId === undefined ? await getActiveUserId() : userId;

  if (!owner) {
    return [];
  }

  const records = await getReactionRecords();

  return records
    .filter((r) => r.userId === owner)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Set (or clear with `null`) a user's reaction on a post and refresh the
 * post's denormalised total. Returns the resulting state.
 */
export async function setUserReaction(
  postId: string,
  userId: string,
  reaction: PostReaction | null,
): Promise<{ reaction: PostReaction | null; summary: ReactionSummary }> {
  const records = await getReactionRecords();
  const now = new Date().toISOString();
  const existing = records.find((r) => r.postId === postId && r.userId === userId);

  let next = records.filter((r) => !(r.postId === postId && r.userId === userId));

  if (reaction) {
    next = [
      ...next,
      {
        postId,
        userId,
        reaction,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      },
    ];
  }

  await setLocal(LEDGER_KEY, next);

  const summary = summarize(next, postId);

  await patchPost(postId, () => ({ likes: summary.total }));

  return { reaction, summary };
}

export async function removeReactionsForPost(postId: string): Promise<void> {
  const records = await getReactionRecords();

  await setLocal(
    LEDGER_KEY,
    records.filter((r) => r.postId !== postId),
  );
}

export async function removeReactionsForUser(userId: string): Promise<void> {
  const records = await getReactionRecords();

  await setLocal(
    LEDGER_KEY,
    records.filter((r) => r.userId !== userId),
  );
}
