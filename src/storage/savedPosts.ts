import { getLocal, setLocal } from './localStore';

const SAVED_POST_IDS_KEY = 'saved_post_ids';

export async function getSavedPostIds(): Promise<string[]> {
  return getLocal<string[]>(
    SAVED_POST_IDS_KEY,
    [],
  );
}

export async function isPostSaved(
  postId: string,
): Promise<boolean> {
  const savedIds = await getSavedPostIds();

  return savedIds.includes(postId);
}

export async function savePost(
  postId: string,
): Promise<void> {
  const savedIds = await getSavedPostIds();

  if (savedIds.includes(postId)) {
    return;
  }

  await setLocal(
    SAVED_POST_IDS_KEY,
    [postId, ...savedIds],
  );
}

export async function unsavePost(
  postId: string,
): Promise<void> {
  const savedIds = await getSavedPostIds();

  await setLocal(
    SAVED_POST_IDS_KEY,
    savedIds.filter(
      (id) => id !== postId,
    ),
  );
}

export async function toggleSavedPost(
  postId: string,
): Promise<boolean> {
  const saved = await isPostSaved(postId);

  if (saved) {
    await unsavePost(postId);
    return false;
  }

  await savePost(postId);
  return true;
}
