import { getLocal, setLocal } from './localStore';
import { getUsers } from './users';
import { getIdentity } from './identity';
import { isBlockedBy } from './blockedUsers';
import { getScopedLocal } from './accountScope';
import { notify } from './notifications';
import { generateId, nowIso } from '../utils/ids';

/**
 * Connections between students.
 *
 * States: none → (pending →) accepted. A record without `status` is a legacy
 * follow and counts as accepted. Blocking is a separate per-account list
 * (`blockedUsers.ts`) and always wins over any follow.
 */

export type FollowStatus = 'pending' | 'accepted';

export interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  status?: FollowStatus;
  createdAt: string;
}

export type ConnectionState =
  | 'none'
  | 'following'
  | 'requested'
  | 'follows_you'
  | 'request_received'
  | 'blocked'
  | 'unavailable';

const FOLLOWS_KEY = 'follows';

const isAccepted = (record: FollowRecord) => record.status !== 'pending';

export async function getFollows(): Promise<FollowRecord[]> {
  return getLocal<FollowRecord[]>(FOLLOWS_KEY, []);
}

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const follows = await getFollows();

  return follows.some(
    (record) =>
      record.followerId === followerId &&
      record.followingId === followingId &&
      isAccepted(record),
  );
}

export async function hasPendingRequest(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const follows = await getFollows();

  return follows.some(
    (record) =>
      record.followerId === followerId &&
      record.followingId === followingId &&
      record.status === 'pending',
  );
}

export async function getConnectionState(
  viewerId: string,
  targetId: string,
): Promise<ConnectionState> {
  const viewerBlocks = await getScopedLocal<string[]>('blocked_user_ids', [], viewerId);

  if (viewerBlocks.includes(targetId)) {
    return 'blocked';
  }

  if (await isBlockedBy(targetId, viewerId)) {
    return 'unavailable';
  }

  if (await isFollowing(viewerId, targetId)) {
    return 'following';
  }

  if (await hasPendingRequest(viewerId, targetId)) {
    return 'requested';
  }

  if (await hasPendingRequest(targetId, viewerId)) {
    return 'request_received';
  }

  return (await isFollowing(targetId, viewerId)) ? 'follows_you' : 'none';
}

/**
 * Follow (or request to follow a private account). Returns the resulting
 * status, or null when it was not possible (self, blocked).
 */
export async function followUser(
  followerId: string,
  followingId: string,
): Promise<FollowStatus | null> {
  if (!followerId || !followingId || followerId === followingId) {
    return null;
  }

  if (
    (await isBlockedBy(followingId, followerId)) ||
    (await getScopedLocal<string[]>('blocked_user_ids', [], followerId)).includes(followingId)
  ) {
    return null;
  }

  const follows = await getFollows();

  const existing = follows.find(
    (record) => record.followerId === followerId && record.followingId === followingId,
  );

  if (existing) {
    return existing.status ?? 'accepted';
  }

  const target = (await getUsers()).find((user) => user.id === followingId);
  const status: FollowStatus = target?.isPrivate ? 'pending' : 'accepted';

  await setLocal(FOLLOWS_KEY, [
    {
      id: generateId('follow'),
      followerId,
      followingId,
      status,
      createdAt: nowIso(),
    } satisfies FollowRecord,
    ...follows,
  ]);

  const actor = (await getUsers()).find((user) => user.id === followerId) ?? (await getIdentity());

  await notify({
    recipientId: followingId,
    type: status === 'pending' ? 'follow_request' : 'follow',
    title:
      status === 'pending'
        ? `${actor?.name ?? 'Someone'} wants to follow you`
        : `${actor?.name ?? 'Someone'} followed you`,
    actorId: followerId,
    entityType: 'user',
    entityId: followerId,
    dedupeKey: `follow:${followerId}`,
    route: { pathname: '/profile/[id]', params: { id: followerId } },
  });

  return status;
}

export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const follows = await getFollows();

  const next = follows.filter(
    (record) =>
      !(record.followerId === followerId && record.followingId === followingId),
  );

  if (next.length === follows.length) {
    return false;
  }

  await setLocal(FOLLOWS_KEY, next);

  return true;
}

/** Toggles follow. Returns true when the viewer now follows or has requested. */
export async function toggleFollow(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const follows = await getFollows();

  const existing = follows.some(
    (record) => record.followerId === followerId && record.followingId === followingId,
  );

  if (existing) {
    await unfollowUser(followerId, followingId);

    return false;
  }

  return (await followUser(followerId, followingId)) !== null;
}

export async function getPendingRequests(userId: string): Promise<FollowRecord[]> {
  return (await getFollows()).filter(
    (record) => record.followingId === userId && record.status === 'pending',
  );
}

export async function resolveFollowRequest(
  targetId: string,
  followerId: string,
  accept: boolean,
): Promise<void> {
  const follows = await getFollows();

  await setLocal(
    FOLLOWS_KEY,
    accept
      ? follows.map((record) =>
          record.followerId === followerId &&
          record.followingId === targetId &&
          record.status === 'pending'
            ? { ...record, status: 'accepted' as const }
            : record,
        )
      : follows.filter(
          (record) =>
            !(
              record.followerId === followerId &&
              record.followingId === targetId &&
              record.status === 'pending'
            ),
        ),
  );

  if (accept) {
    const target = (await getUsers()).find((user) => user.id === targetId);

    await notify({
      recipientId: followerId,
      type: 'follow',
      title: `${target?.name ?? 'Someone'} accepted your follow request`,
      actorId: targetId,
      entityType: 'user',
      entityId: targetId,
      route: { pathname: '/profile/[id]', params: { id: targetId } },
    });
  }
}

/** Drops follow edges in both directions when either side blocks. */
export async function removeFollowsBetween(a: string, b: string): Promise<void> {
  const follows = await getFollows();

  await setLocal(
    FOLLOWS_KEY,
    follows.filter(
      (record) =>
        !(
          (record.followerId === a && record.followingId === b) ||
          (record.followerId === b && record.followingId === a)
        ),
    ),
  );
}

export async function getFollowingCount(userId: string): Promise<number> {
  return (await getFollows()).filter(
    (record) => record.followerId === userId && isAccepted(record),
  ).length;
}

export async function getFollowerCount(userId: string): Promise<number> {
  return (await getFollows()).filter(
    (record) => record.followingId === userId && isAccepted(record),
  ).length;
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  return (await getFollows())
    .filter((record) => record.followerId === userId && isAccepted(record))
    .map((record) => record.followingId);
}

export async function getFollowerIds(userId: string): Promise<string[]> {
  return (await getFollows())
    .filter((record) => record.followingId === userId && isAccepted(record))
    .map((record) => record.followerId);
}
