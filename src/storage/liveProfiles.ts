import { HiLinkUser } from '../models/user';
import { getLocal } from './localStore';

/**
 * Live profile resolution.
 *
 * Posts, comments and chat participants store the author's stable `id` plus
 * a name/avatar snapshot taken when the record was written. Snapshots go
 * stale as soon as a student edits their profile, so every read path resolves
 * the CURRENT profile by id and only falls back to the snapshot when the
 * profile is unknown on this device (e.g. a record received from elsewhere).
 *
 * This module reads the raw stores directly (not through `users.ts`) so
 * `posts.ts`/`comments.ts` can use it without an import cycle.
 */

export type ProfileMap = Map<string, HiLinkUser>;

export async function getProfileMap(): Promise<ProfileMap> {
  const [users, identity] = await Promise.all([
    getLocal<HiLinkUser[]>('users', []),
    getLocal<HiLinkUser | null>('identity', null),
  ]);

  const map: ProfileMap = new Map();

  for (const user of users) {
    map.set(user.id, user);
  }

  // The signed-in identity is the freshest copy of its own profile.
  if (identity) {
    map.set(identity.id, identity);
  }

  return map;
}

export interface AuthorSnapshot {
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUri?: string;
}

export function withLiveAuthor<T extends AuthorSnapshot>(
  record: T,
  profiles: ProfileMap,
): T {
  const profile = profiles.get(record.authorId);

  if (!profile) {
    return record;
  }

  if (
    record.authorName === profile.name &&
    record.authorUsername === profile.username &&
    record.authorAvatarUri === profile.avatarUri
  ) {
    return record;
  }

  return {
    ...record,
    authorName: profile.name,
    authorUsername: profile.username,
    authorAvatarUri: profile.avatarUri,
  };
}
