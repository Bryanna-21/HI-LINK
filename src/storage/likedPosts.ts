import { getLocal, setLocal } from './localStore';

const LIKED_POST_IDS_KEY = 'liked_post_ids';

export async function getLikedPostIds(): Promise<string[]> {
  return getLocal<string[]>(
    LIKED_POST_IDS_KEY,
    [],
  );
}

export async function isPostLiked(
  postId: string,
): Promise<boolean> {
  const likedIds = await getLikedPostIds();

  return likedIds.includes(postId);
}

export async function likePost(
  postId: string,
): Promise<void> {
  const likedIds = await getLikedPostIds();

  if (likedIds.includes(postId)) {
    return;
  }

  await setLocal(
    LIKED_POST_IDS_KEY,
    [postId, ...likedIds],
  );
}

export async function unlikePost(
  postId: string,
): Promise<void> {
  const likedIds = await getLikedPostIds();

  await setLocal(
    LIKED_POST_IDS_KEY,
    likedIds.filter(
      (id) => id !== postId,
    ),
  );
}

export async function toggleLikedPost(
  postId: string,
): Promise<boolean> {
  const liked = await isPostLiked(postId);

  if (liked) {
    await unlikePost(postId);
    return false;
  }

  await likePost(postId);
  return true;
}
