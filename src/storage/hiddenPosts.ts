import { getLocal, setLocal } from './localStore';

const HIDDEN_POST_IDS_KEY = 'hidden_post_ids';
const getHiddenKey = (userId: string) =>
  `${HIDDEN_POST_IDS_KEY}_${userId}`;

export async function getHiddenPostIds(
  userId: string,
): Promise<string[]> {
  return getLocal<string[]>(
    getHiddenKey(userId),
    [],
  );
}

export async function isPostHidden(
  postId: string,
  userId: string,
): Promise<boolean> {
  const hiddenIds = await getHiddenPostIds(
    userId,
  );

  return hiddenIds.includes(postId);
}

export async function hidePost(
  postId: string,
  userId: string,
): Promise<void> {
  const hiddenIds = await getHiddenPostIds(userId);

  if (hiddenIds.includes(postId)) {
    return;
  }

  await setLocal(
    getHiddenKey(userId),
    [postId, ...hiddenIds],
  );
}

export async function unhidePost(
  postId: string,
  userId: string,
): Promise<void> {
  const hiddenIds = await getHiddenPostIds(userId);

  await setLocal(
    getHiddenKey(userId),
    hiddenIds.filter(
      (id) => id !== postId,
    ),
  );
}
