import { getIdentity } from './identity';
import { getLocal, removeLocal, setLocal } from './localStore';

/**
 * Per-account storage scoping.
 *
 * Data that belongs to one student (saved posts, reactions, blocks, watch
 * history, academic records, notifications ...) must never be visible to
 * another account that signs in on the same device. Keys are suffixed with
 * the account id, and reads return the fallback when nobody is signed in so
 * a logged-out device exposes nothing.
 *
 * Legacy migration: before this module existed these values lived under a
 * single global key. The first account that reads a scoped value claims the
 * legacy global value (and the legacy key is removed so no other account can
 * claim it as well).
 */

export async function getActiveUserId(): Promise<string | null> {
  const identity = await getIdentity();

  return identity?.id ?? null;
}

export const scopedKey = (base: string, userId: string): string =>
  `${base}@${userId}`;

export async function getScopedLocal<T>(
  base: string,
  fallback: T,
  userId?: string | null,
): Promise<T> {
  const owner = userId === undefined ? await getActiveUserId() : userId;

  if (!owner) {
    return fallback;
  }

  const key = scopedKey(base, owner);
  const sentinel = Symbol('missing');
  const scoped = await getLocal<T | typeof sentinel>(key, sentinel);

  if (scoped !== sentinel) {
    return scoped as T;
  }

  // Legacy claim: only possible for the account that is currently active.
  const legacy = await getLocal<T | typeof sentinel>(base, sentinel);

  if (legacy !== sentinel) {
    await setLocal(key, legacy);
    await removeLocal(base);

    return legacy as T;
  }

  return fallback;
}

export async function setScopedLocal<T>(
  base: string,
  value: T,
  userId?: string | null,
): Promise<boolean> {
  const owner = userId === undefined ? await getActiveUserId() : userId;

  if (!owner) {
    return false;
  }

  await setLocal(scopedKey(base, owner), value);

  return true;
}

export async function removeScopedLocal(
  base: string,
  userId?: string | null,
): Promise<void> {
  const owner = userId === undefined ? await getActiveUserId() : userId;

  if (!owner) {
    return;
  }

  await removeLocal(scopedKey(base, owner));
}
