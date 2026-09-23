import { getLocal, setLocal } from './localStore';

export interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

const FOLLOWS_KEY = 'follows';

export async function getFollows(): Promise<FollowRecord[]> {
  return getLocal<FollowRecord[]>(
    FOLLOWS_KEY,
    [],
  );
}

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const follows = await getFollows();

  return follows.some(
    (record) =>
      record.followerId === followerId &&
      record.followingId === followingId,
  );
}

export async function followUser(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  if (
    !followerId ||
    !followingId ||
    followerId === followingId
  ) {
    return false;
  }

  const follows = await getFollows();

  const exists = follows.some(
    (record) =>
      record.followerId === followerId &&
      record.followingId === followingId,
  );

  if (exists) {
    return false;
  }

  const record: FollowRecord = {
    id: `follow-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    followerId,
    followingId,
    createdAt: new Date().toISOString(),
  };

  await setLocal(FOLLOWS_KEY, [
    record,
    ...follows,
  ]);

  return true;
}

export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const follows = await getFollows();

  const next = follows.filter(
    (record) =>
      !(
        record.followerId === followerId &&
        record.followingId === followingId
      ),
  );

  if (next.length === follows.length) {
    return false;
  }

  await setLocal(FOLLOWS_KEY, next);

  return true;
}

export async function toggleFollow(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const following = await isFollowing(
    followerId,
    followingId,
  );

  if (following) {
    await unfollowUser(
      followerId,
      followingId,
    );

    return false;
  }

  await followUser(
    followerId,
    followingId,
  );

  return true;
}

export async function getFollowingCount(
  userId: string,
): Promise<number> {
  const follows = await getFollows();

  return follows.filter(
    (record) => record.followerId === userId,
  ).length;
}

export async function getFollowerCount(
  userId: string,
): Promise<number> {
  const follows = await getFollows();

  return follows.filter(
    (record) => record.followingId === userId,
  ).length;
}

export async function getFollowingIds(
  userId: string,
): Promise<string[]> {
  const follows = await getFollows();

  return follows
    .filter(
      (record) => record.followerId === userId,
    )
    .map((record) => record.followingId);
}

export async function getFollowerIds(
  userId: string,
): Promise<string[]> {
  const follows = await getFollows();

  return follows
    .filter(
      (record) => record.followingId === userId,
    )
    .map((record) => record.followerId);
}
