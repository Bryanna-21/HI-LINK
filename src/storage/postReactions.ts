import { getLocal, setLocal } from './localStore';

export type PostReaction =
  | 'like'
  | 'love'
  | 'laugh'
  | 'wow'
  | 'sad'
  | 'angry';

export interface StoredPostReaction {
  postId: string;
  reaction: PostReaction;
}

const REACTIONS_KEY = 'post_reactions';

export async function getPostReactions(): Promise<
  StoredPostReaction[]
> {
  return getLocal<StoredPostReaction[]>(
    REACTIONS_KEY,
    [],
  );
}

export async function getPostReaction(
  postId: string,
): Promise<PostReaction | null> {
  const reactions =
    await getPostReactions();

  const existing = reactions.find(
    (item) => item.postId === postId,
  );

  return existing?.reaction ?? null;
}

export async function setPostReaction(
  postId: string,
  reaction: PostReaction,
): Promise<void> {
  const reactions =
    await getPostReactions();

  const filtered = reactions.filter(
    (item) => item.postId !== postId,
  );

  await setLocal(
    REACTIONS_KEY,
    [
      ...filtered,
      {
        postId,
        reaction,
      },
    ],
  );
}

export async function removePostReaction(
  postId: string,
): Promise<void> {
  const reactions =
    await getPostReactions();

  await setLocal(
    REACTIONS_KEY,
    reactions.filter(
      (item) => item.postId !== postId,
    ),
  );
}

export async function togglePostReaction(
  postId: string,
  reaction: PostReaction,
): Promise<PostReaction | null> {
  const current =
    await getPostReaction(postId);

  if (current === reaction) {
    await removePostReaction(postId);
    return null;
  }

  await setPostReaction(
    postId,
    reaction,
  );

  return reaction;
}
