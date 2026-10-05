import { getLocal, setLocal } from './localStore';

const BLOCKED_USER_IDS_KEY = 'blocked_user_ids';

export async function getBlockedUserIds(): Promise<string[]> {
  return getLocal<string[]>(
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

  await setLocal(
    BLOCKED_USER_IDS_KEY,
    [userId, ...blockedIds],
  );
}

export async function unblockUser(
  userId: string,
): Promise<void> {
  const blockedIds = await getBlockedUserIds();

  await setLocal(
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
