import {
  getActiveUserId,
  getScopedLocal,
  setScopedLocal,
} from './accountScope';

const BLOCKED_USER_IDS_KEY = 'blocked_user_ids';

export async function getBlockedUserIds(): Promise<string[]> {
  return getScopedLocal<string[]>(
    BLOCKED_USER_IDS_KEY,
    [],
  );
}

export async function isUserBlocked(
  userId: string,
): Promise<boolean> {
  const blockedIds = await getBlockedUserIds();

  return blockedIds.includes(userId);
}

export async function blockUser(
  userId: string,
): Promise<void> {
  const blockedIds = await getBlockedUserIds();

  if (blockedIds.includes(userId)) {
    return;
  }

  await setScopedLocal(
    BLOCKED_USER_IDS_KEY,
    [userId, ...blockedIds],
  );

  // Blocking severs the connection in both directions. Imported lazily
  // because follows.ts depends on this module.
  const activeId = await getActiveUserId();

  if (activeId) {
    const { removeFollowsBetween } = await import('./follows');

    await removeFollowsBetween(activeId, userId);
  }
}

export async function unblockUser(
  userId: string,
): Promise<void> {
  const blockedIds = await getBlockedUserIds();

  await setScopedLocal(
    BLOCKED_USER_IDS_KEY,
    blockedIds.filter(
      (id) => id !== userId,
    ),
  );
}

export async function toggleBlockedUser(
  userId: string,
): Promise<boolean> {
  const blocked = await isUserBlocked(userId);

  if (blocked) {
    await unblockUser(userId);
    return false;
  }

  await blockUser(userId);
  return true;
}

/**
 * True when `blockerId` has blocked the signed-in student. Reads only that
 * single boolean from the other account's list; the list itself is never
 * exposed.
 */
export async function isBlockedBy(
  blockerId: string,
  userId?: string | null,
): Promise<boolean> {
  const target = userId === undefined ? await getActiveUserId() : userId;

  if (!target) {
    return false;
  }

  const theirList = await getScopedLocal<string[]>(
    BLOCKED_USER_IDS_KEY,
    [],
    blockerId,
  );

  return theirList.includes(target);
}
