import { HiLinkUser } from '../models/user';
import { getLocal, setLocal } from './localStore';
import { getIdentity } from './identity';
import { getPosts } from './posts';

const USERS_KEY = 'users';

export async function getUsers(): Promise<HiLinkUser[]> {
  return getLocal<HiLinkUser[]>(USERS_KEY, []);
}

export async function saveUsers(
  users: HiLinkUser[],
): Promise<void> {
  await setLocal(USERS_KEY, users);
}

export async function upsertUser(
  user: HiLinkUser,
): Promise<void> {
  const users = await getUsers();

  const next = [
    user,
    ...users.filter(
      (existing) => existing.id !== user.id,
    ),
  ];

  await saveUsers(next);
}

export async function getUserById(
  userId: string,
): Promise<HiLinkUser | null> {
  const identity = await getIdentity();

  if (identity?.id === userId) {
    return identity;
  }

  const users = await getUsers();

  const stored = users.find(
    (user) => user.id === userId,
  );

  if (stored) {
    return stored;
  }

  const posts = await getPosts();

  const authorPosts = posts.filter(
    (post) => post.authorId === userId,
  );

  if (authorPosts.length === 0) {
    return null;
  }

  const latest = authorPosts[0];

  const now = new Date().toISOString();

  const derivedUser: HiLinkUser = {
    id: userId,
    hilinkId: userId,
    name: latest.authorName || 'HI-LINK user',
    username: latest.authorUsername || '',
    role: 'student',
    schoolId: latest.schoolId,
    schoolName: latest.schoolName,
    form: latest.form,
    stream: latest.stream,
    avatarUri: latest.authorAvatarUri,
    createdAt: now,
    updatedAt: now,
  };

  await upsertUser(derivedUser);

  return derivedUser;
}

export async function getKnownUsers(): Promise<HiLinkUser[]> {
  const identity = await getIdentity();
  const storedUsers = await getUsers();
  const posts = await getPosts();

  const users = new Map<string, HiLinkUser>();

  for (const user of storedUsers) {
    users.set(user.id, user);
  }

  if (identity) {
    users.set(identity.id, identity);
  }

  for (const post of posts) {
    if (!post.authorId) {
      continue;
    }

    const existing = users.get(post.authorId);

    const derived: HiLinkUser = {
      id: post.authorId,
      hilinkId: existing?.hilinkId ?? post.authorId,
      name:
        existing?.name ||
        post.authorName ||
        'HI-LINK user',
      username:
        existing?.username ||
        post.authorUsername ||
        '',
      bio: existing?.bio,
      role: existing?.role ?? 'student',
      schoolId:
        existing?.schoolId ??
        post.schoolId,
      schoolName:
        existing?.schoolName ??
        post.schoolName,
      clubs: existing?.clubs,
      societies: existing?.societies,
      interests: existing?.interests,
      followersCount:
        existing?.followersCount,
      followingCount:
        existing?.followingCount,
      admissionNumber:
        existing?.admissionNumber,
      studentId:
        existing?.studentId,
      staffNumber:
        existing?.staffNumber,
      form:
        existing?.form ??
        post.form,
      stream:
        existing?.stream ??
        post.stream,
      className: existing?.className,
      boardingStatus:
        existing?.boardingStatus,
      house: existing?.house,
      avatarUri:
        existing?.avatarUri ??
        post.authorAvatarUri,
      coverUri: existing?.coverUri,
      createdAt:
        existing?.createdAt ??
        post.createdAt,
      updatedAt:
        existing?.updatedAt ??
        post.updatedAt,
    };

    users.set(post.authorId, derived);
  }

  return Array.from(users.values()).sort(
    (a, b) =>
      a.name.localeCompare(b.name),
  );
}
