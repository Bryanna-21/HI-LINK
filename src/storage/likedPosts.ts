import { getLocal, setLocal } from './localStore';

const LIKED_POST_IDS_KEY = 'liked_post_ids';
const getLikedKey = (userId: string) =>
  `${LIKED_POST_IDS_KEY}_${userId}`;

export async function getLikedPostIds(
  userId: string,
): Promise<string[]> {
  return getLocal<string[]>(
    getLikedKey(userId),
    [],
  );
}

export async function isPostLiked(
  postId: string,
  userId: string,
): Promise<boolean> {
  const likedIds = await getLikedPostIds(userId);

  return likedIds.includes(postId);
}

export async function likePost(
  postId: string,
  userId: string,
): Promise<void> {
  const likedIds = await getLikedPostIds(userId);

  if (likedIds.includes(postId)) {
    return;
  }

  await setLocal(
    getLikedKey(userId),
    [postId, ...likedIds],
  );
}

export async function unlikePost(
  postId: string,
  userId: string,
): Promise<void> {
  const likedIds = await getLikedPostIds(userId);

  await setLocal(
    getLikedKey(userId),
    likedIds.filter(
      (id) => id !== postId,
    ),
  );
}

export async function toggleLikedPost(
  postId: string,
  userId: string,
): Promise<boolean> {
  const liked = await isPostLiked(
    postId,
    userId,
  );

  if (liked) {
    await unlikePost(
      postId,
      userId,
    );
    return false;
  }

  await likePost(
    postId,
    userId,
  );
  return true;
}
