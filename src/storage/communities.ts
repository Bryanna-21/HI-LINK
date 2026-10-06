import type {
  Community,
  CommunityKind,
  CommunityMembership,
  CommunityPrivacy,
  MembershipRole,
  Poll,
} from '../models/campus';
import type { Post, PostType } from '../models/post';
import { addPost, deletePost, getPosts } from './posts';
import { deleteCommentsForPost } from './comments';
import { removeReactionsForPost } from './reactions';
import { getIdentity } from './identity';
import { createCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { isInstitutionAdmin } from './roles';
import { notify, notifyMany } from './notifications';
import { generateId, nowIso } from '../utils/ids';

/**
 * Communities are first-class entities with their own membership records.
 * Posts, announcements, events and polls attach to a community by id; a
 * community is never just a filter over unrelated posts.
 */

export const COMMUNITY_KINDS: { value: CommunityKind; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'class', label: 'Class' },
  { value: 'course', label: 'Course' },
  { value: 'department', label: 'Department' },
  { value: 'club', label: 'Club' },
  { value: 'academic', label: 'Academic group' },
  { value: 'study_group', label: 'Study group' },
  { value: 'interest', label: 'Interest' },
  { value: 'student_org', label: 'Student organization' },
];

const communities = createCollection<Community>('communities');
const memberships = createCollection<CommunityMembership>('community_members');
const polls = createCollection<Poll>('community_polls');

export const getCommunities = async (): Promise<Community[]> =>
  (await communities.list()).filter((item) => !item.archived);

export const getCommunity = (id: string) => communities.get(id);

export const getAllMemberships = () => memberships.list();

export async function getMembers(
  communityId: string,
): Promise<CommunityMembership[]> {
  return (await memberships.list()).filter(
    (item) => item.communityId === communityId,
  );
}

export async function getActiveMemberIds(
  communityId: string,
): Promise<string[]> {
  return (await getMembers(communityId))
    .filter((item) => item.state === 'active')
    .map((item) => item.userId);
}

export async function getMembership(
  communityId: string,
  userId: string,
): Promise<CommunityMembership | null> {
  return (
    (await memberships.list()).find(
      (item) => item.communityId === communityId && item.userId === userId,
    ) ?? null
  );
}

export async function getMyMemberships(): Promise<CommunityMembership[]> {
  const userId = await getActiveUserId();

  if (!userId) {
    return [];
  }

  return (await memberships.list()).filter(
    (item) => item.userId === userId && item.state === 'active',
  );
}

export async function isActiveMember(
  communityId: string,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  return (await getMembership(communityId, userId))?.state === 'active';
}

/** Owner/admin of this community, or an admin of its institution. */
export async function canManageCommunity(
  communityId: string,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const membership = await getMembership(communityId, userId);

  if (
    membership?.state === 'active' &&
    (membership.role === 'owner' || membership.role === 'admin')
  ) {
    return true;
  }

  const community = await communities.get(communityId);

  return community?.institutionId
    ? isInstitutionAdmin(userId, community.institutionId)
    : isInstitutionAdmin(userId);
}

async function assertManage(communityId: string, actorId: string) {
  if (!(await canManageCommunity(communityId, actorId))) {
    throw new Error('Only community administrators can do this.');
  }
}

export interface CreateCommunityInput {
  name: string;
  description: string;
  kind: CommunityKind;
  privacy: CommunityPrivacy;
  institutionId?: string;
  iconUri?: string;
  guidelines?: string;
}

export async function createCommunity(
  creatorId: string,
  input: CreateCommunityInput,
): Promise<Community> {
  const name = input.name.trim();

  if (name.length < 3) {
    throw new Error('Give the community a name of at least 3 characters.');
  }

  const duplicate = (await communities.list()).some(
    (item) =>
      !item.archived &&
      item.institutionId === input.institutionId &&
      item.name.toLowerCase() === name.toLowerCase(),
  );

  if (duplicate) {
    throw new Error('A community with this name already exists here.');
  }

  const now = nowIso();

  const community: Community = {
    id: generateId('community'),
    name,
    description: input.description.trim(),
    kind: input.kind,
    privacy: input.privacy,
    institutionId: input.institutionId,
    iconUri: input.iconUri,
    guidelines: input.guidelines?.trim() || undefined,
    creatorId,
    createdAt: now,
    updatedAt: now,
  };

  await communities.upsert(community);

  await memberships.upsert({
    id: generateId('member'),
    communityId: community.id,
    userId: creatorId,
    role: 'owner',
    state: 'active',
    joinedAt: now,
    updatedAt: now,
  });

  return community;
}

export async function updateCommunity(
  actorId: string,
  communityId: string,
  patch: Partial<
    Pick<
      Community,
      'name' | 'description' | 'iconUri' | 'privacy' | 'guidelines' | 'kind'
    >
  >,
): Promise<void> {
  await assertManage(communityId, actorId);

  await communities.update(communityId, { ...patch, updatedAt: nowIso() });
}

export async function archiveCommunity(
  actorId: string,
  communityId: string,
): Promise<void> {
  const membership = await getMembership(communityId, actorId);

  if (
    membership?.role !== 'owner' &&
    !(await isInstitutionAdmin(actorId))
  ) {
    throw new Error('Only the community owner can archive it.');
  }

  await communities.update(communityId, {
    archived: true,
    updatedAt: nowIso(),
  });
}

export type JoinResult = 'joined' | 'requested' | 'already_member' | 'denied';

export async function joinCommunity(
  userId: string,
  communityId: string,
): Promise<JoinResult> {
  const community = await communities.get(communityId);

  if (!community || community.archived) {
    return 'denied';
  }

  const existing = await getMembership(communityId, userId);

  if (existing?.state === 'banned') {
    return 'denied';
  }

  if (existing?.state === 'active') {
    return 'already_member';
  }

  const now = nowIso();

  // An admin invitation can always be accepted, whatever the join rule.
  const state: CommunityMembership['state'] | null =
    existing?.state === 'invited' || community.privacy === 'open'
      ? 'active'
      : community.privacy === 'request'
        ? 'pending'
        : null;

  if (state === null) {
    return 'denied';
  }

  await memberships.upsert({
    id: existing?.id ?? generateId('member'),
    communityId,
    userId,
    role: existing?.role ?? 'member',
    state,
    joinedAt: existing?.joinedAt ?? now,
    updatedAt: now,
  });

  if (state === 'pending') {
    const admins = (await getMembers(communityId))
      .filter(
        (item) =>
          item.state === 'active' &&
          (item.role === 'owner' || item.role === 'admin'),
      )
      .map((item) => item.userId);

    await notifyMany(admins, {
      type: 'community',
      title: `Join request: ${community.name}`,
      body: 'A student asked to join your community.',
      actorId: userId,
      entityType: 'community',
      entityId: communityId,
      dedupeKey: `join-request:${communityId}:${userId}`,
      route: { pathname: '/communities/[id]', params: { id: communityId } },
    });
  }

  return state === 'active' ? 'joined' : 'requested';
}

export async function leaveCommunity(
  userId: string,
  communityId: string,
): Promise<void> {
  const membership = await getMembership(communityId, userId);

  if (!membership) {
    return;
  }

  if (membership.role === 'owner') {
    const otherAdmins = (await getMembers(communityId)).filter(
      (item) =>
        item.userId !== userId &&
        item.state === 'active' &&
        item.role === 'admin',
    );

    if (otherAdmins.length === 0) {
      throw new Error(
        'You own this community. Make another member an administrator before leaving.',
      );
    }

    await memberships.update(otherAdmins[0].id, {
      role: 'owner',
      updatedAt: nowIso(),
    });
  }

  await memberships.remove(membership.id);
}

export async function resolveJoinRequest(
  actorId: string,
  communityId: string,
  userId: string,
  approve: boolean,
): Promise<void> {
  await assertManage(communityId, actorId);

  const membership = await getMembership(communityId, userId);

  if (!membership || membership.state !== 'pending') {
    return;
  }

  const community = await communities.get(communityId);

  if (approve) {
    await memberships.update(membership.id, {
      state: 'active',
      updatedAt: nowIso(),
    });
  } else {
    await memberships.remove(membership.id);
  }

  await notify({
    recipientId: userId,
    type: 'community',
    title: approve
      ? `You joined ${community?.name ?? 'a community'}`
      : `Request declined: ${community?.name ?? 'community'}`,
    actorId,
    entityType: 'community',
    entityId: communityId,
    route: { pathname: '/communities/[id]', params: { id: communityId } },
  });
}

export async function inviteToCommunity(
  actorId: string,
  communityId: string,
  userId: string,
): Promise<void> {
  await assertManage(communityId, actorId);

  const existing = await getMembership(communityId, userId);

  if (existing) {
    return;
  }

  const now = nowIso();
  const community = await communities.get(communityId);

  await memberships.upsert({
    id: generateId('member'),
    communityId,
    userId,
    role: 'member',
    state: 'invited',
    joinedAt: now,
    updatedAt: now,
  });

  await notify({
    recipientId: userId,
    type: 'community',
    title: `Invitation: ${community?.name ?? 'community'}`,
    body: 'You have been invited to join.',
    actorId,
    entityType: 'community',
    entityId: communityId,
    route: { pathname: '/communities/[id]', params: { id: communityId } },
  });
}

export async function setMemberRole(
  actorId: string,
  communityId: string,
  userId: string,
  role: Exclude<MembershipRole, 'owner'>,
): Promise<void> {
  await assertManage(communityId, actorId);

  const membership = await getMembership(communityId, userId);

  if (!membership || membership.role === 'owner') {
    return;
  }

  await memberships.update(membership.id, { role, updatedAt: nowIso() });
}

export async function removeMember(
  actorId: string,
  communityId: string,
  userId: string,
  ban = false,
): Promise<void> {
  await assertManage(communityId, actorId);

  const membership = await getMembership(communityId, userId);

  if (!membership || membership.role === 'owner') {
    return;
  }

  if (ban) {
    await memberships.update(membership.id, {
      state: 'banned',
      role: 'member',
      updatedAt: nowIso(),
    });
  } else {
    await memberships.remove(membership.id);
  }
}

/* --------------------------------- Polls ---------------------------------- */

export async function getPolls(communityId: string): Promise<Poll[]> {
  return (await polls.list())
    .filter((poll) => poll.communityId === communityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createPoll(
  actorId: string,
  input: { communityId: string; question: string; options: string[]; closesAt?: string },
): Promise<Poll> {
  await assertManage(input.communityId, actorId);

  const options = input.options.map((text) => text.trim()).filter(Boolean);

  if (input.question.trim().length < 3 || options.length < 2) {
    throw new Error('A poll needs a question and at least two options.');
  }

  const poll: Poll = {
    id: generateId('poll'),
    communityId: input.communityId,
    authorId: actorId,
    question: input.question.trim(),
    options: options.map((text) => ({ id: generateId('opt'), text })),
    votes: {},
    closesAt: input.closesAt,
    createdAt: nowIso(),
  };

  await polls.upsert(poll);

  const community = await communities.get(input.communityId);

  await notifyMany(await getActiveMemberIds(input.communityId), {
    type: 'community',
    title: `New poll in ${community?.name ?? 'your community'}`,
    body: poll.question,
    actorId,
    entityType: 'poll',
    entityId: poll.id,
    route: { pathname: '/communities/[id]', params: { id: input.communityId } },
  });

  return poll;
}

export async function votePoll(
  userId: string,
  pollId: string,
  optionId: string,
): Promise<void> {
  const poll = await polls.get(pollId);

  if (!poll) {
    throw new Error('This poll no longer exists.');
  }

  if (!(await isActiveMember(poll.communityId, userId))) {
    throw new Error('Join the community to vote.');
  }

  if (poll.closesAt && new Date(poll.closesAt).getTime() < Date.now()) {
    throw new Error('This poll has closed.');
  }

  if (!poll.options.some((option) => option.id === optionId)) {
    throw new Error('That option does not exist.');
  }

  await polls.update(pollId, {
    votes: { ...poll.votes, [userId]: optionId },
  });
}

export async function deletePoll(
  actorId: string,
  pollId: string,
): Promise<void> {
  const poll = await polls.get(pollId);

  if (!poll) {
    return;
  }

  await assertManage(poll.communityId, actorId);
  await polls.remove(pollId);
}

/* ----------------------------- Community posts ---------------------------- */

export async function getCommunityPosts(communityId: string): Promise<Post[]> {
  const userId = await getActiveUserId();
  const community = await communities.get(communityId);

  if (!community) {
    return [];
  }

  // Private communities do not leak their posts to non-members.
  if (community.privacy !== 'open' && !(await isActiveMember(communityId, userId))) {
    return [];
  }

  return (await getPosts())
    .filter((post) => post.communityId === communityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function postToCommunity(
  communityId: string,
  input: { type: Extract<PostType, 'text' | 'question'>; text: string },
): Promise<Post> {
  const author = await getIdentity();

  if (!author || !(await isActiveMember(communityId, author.id))) {
    throw new Error('Join the community to post here.');
  }

  const text = input.text.trim();

  if (!text) {
    throw new Error('Write something before posting.');
  }

  const now = nowIso();

  const post: Post = {
    id: generateId('post'),
    authorId: author.id,
    authorName: author.name,
    authorUsername: author.username,
    authorAvatarUri: author.avatarUri,
    type: input.type,
    text,
    communityId,
    schoolId: author.schoolId,
    schoolName: author.schoolName,
    visibility: 'my_group',
    likes: 0,
    comments: 0,
    shares: 0,
    reshares: 0,
    saves: 0,
    commentsAllowed: true,
    createdAt: now,
    updatedAt: now,
  };

  await addPost(post);

  return post;
}

/** Community administrators remove inappropriate posts in their community. */
export async function removeCommunityPost(actorId: string, postId: string): Promise<void> {
  const post = (await getPosts()).find((item) => item.id === postId);

  if (!post || !post.communityId) {
    return;
  }

  if (post.authorId !== actorId) {
    await assertManage(post.communityId, actorId);
  }

  await deleteCommentsForPost(postId);
  await removeReactionsForPost(postId);
  await deletePost(postId);
}
