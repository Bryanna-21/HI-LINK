import { getLocal, setLocal } from './localStore';

const HIDDEN_POST_IDS_KEY = 'hidden_post_ids';

export async function getHiddenPostIds(): Promise<string[]> {
  return getLocal<string[]>(
    HIDDEN_POST_IDS_KEY,
    [],
  );
}

export async function isPostHidden(
  postId: string,
): Promise<boolean> {
  const hiddenIds = await getHiddenPostIds();

  return hiddenIds.includes(postId);
}

export async function hidePost(
  postId: string,
): Promise<void> {
  const hiddenIds = await getHiddenPostIds();

  if (hiddenIds.includes(postId)) {
    return;
  }

  await setLocal(
    HIDDEN_POST_IDS_KEY,
    [postId, ...hiddenIds],
  );
}

export async function unhidePost(
  postId: string,
): Promise<void> {
  const hiddenIds = await getHiddenPostIds();

  await setLocal(
    HIDDEN_POST_IDS_KEY,
    hiddenIds.filter(
      (id) => id !== postId,
    ),
  );
}
