import type {
  Announcement,
  AnnouncementAttachment,
  AnnouncementAudience,
  AnnouncementPriority,
} from '../models/campus';
import type { HiLinkUser } from '../models/user';
import { createCollection } from './collection';
import { createScopedCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { getIdentity } from './identity';
import { getUsers } from './users';
import { assertCan, isInstitutionAdmin } from './roles';
import {
  canManageCommunity,
  getActiveMemberIds,
  getCommunity,
  isActiveMember,
} from './communities';
import { notifyMany } from './notifications';
import { generateId, nowIso } from '../utils/ids';

const announcements = createCollection<Announcement>('announcements');
const reads = createScopedCollection<{ id: string }>('announcement_reads');

export function audienceMatches(
  audience: AnnouncementAudience,
  user: HiLinkUser,
  communityIds: ReadonlySet<string>,
): boolean {
  switch (audience.kind) {
    case 'institution':
      return user.schoolId === audience.institutionId;

    case 'community':
      return communityIds.has(audience.communityId);

    case 'class':
      return (
        user.schoolId === audience.institutionId &&
        user.form === audience.form &&
        (!audience.stream || user.stream === audience.stream)
      );

    default:
      return false;
  }
}

async function assertCanPublish(
  actorId: string,
  audience: AnnouncementAudience,
): Promise<void> {
  if (audience.kind === 'community') {
    if (await canManageCommunity(audience.communityId, actorId)) {
      return;
    }

    throw new Error('Only community administrators can publish here.');
  }

  await assertCan(actorId, 'announcement.publish', {
    institutionId: audience.institutionId,
  });
}

export interface PublishAnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  attachments?: AnnouncementAttachment[];
}

export async function publishAnnouncement(
  actorId: string,
  input: PublishAnnouncementInput,
): Promise<Announcement> {
  await assertCanPublish(actorId, input.audience);

  if (!input.title.trim() || !input.body.trim()) {
    throw new Error('An announcement needs a title and a message.');
  }

  const now = nowIso();

  const announcement: Announcement = {
    id: generateId('announce'),
    title: input.title.trim(),
    body: input.body.trim(),
    authorId: actorId,
    audience: input.audience,
    priority: input.priority,
    attachments: input.attachments ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await announcements.upsert(announcement);

  const recipients = await audienceUserIds(input.audience);

  await notifyMany(recipients, {
    type: 'announcement',
    title:
      input.priority === 'urgent'
        ? `Urgent: ${announcement.title}`
        : announcement.title,
    body: announcement.body.slice(0, 140),
    actorId,
    entityType: 'announcement',
    entityId: announcement.id,
    route: { pathname: '/announcements', params: { focus: announcement.id } },
  });

  return announcement;
}

async function audienceUserIds(
  audience: AnnouncementAudience,
): Promise<string[]> {
  if (audience.kind === 'community') {
    return getActiveMemberIds(audience.communityId);
  }

  const users = await getUsers();

  return users
    .filter((user) =>
      audience.kind === 'institution'
        ? user.schoolId === audience.institutionId
        : audienceMatches(audience, user, new Set()),
    )
    .map((user) => user.id);
}

/**
 * Announcements the signed-in student is entitled to see. Audience is checked
 * here, in storage, so private community or class announcements are never
 * returned to people outside the audience.
 */
export async function getMyAnnouncements(): Promise<Announcement[]> {
  const user = await getIdentity();

  if (!user) {
    return [];
  }

  const all = await announcements.list();
  const visible: Announcement[] = [];

  for (const item of all) {
    if (item.authorId === user.id) {
      visible.push(item);
      continue;
    }

    if (item.audience.kind === 'community') {
      if (await isActiveMember(item.audience.communityId, user.id)) {
        visible.push(item);
      }

      continue;
    }

    if (
      audienceMatches(item.audience, user, new Set()) ||
      (await isInstitutionAdmin(user.id, item.audience.institutionId))
    ) {
      visible.push(item);
    }
  }

  return visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCommunityAnnouncements(
  communityId: string,
): Promise<Announcement[]> {
  const userId = await getActiveUserId();
  const community = await getCommunity(communityId);

  if (!community) {
    return [];
  }

  const allowed =
    (await isActiveMember(communityId, userId)) ||
    (community.privacy !== 'invite_only' && community.privacy !== 'request');

  if (!allowed) {
    return [];
  }

  return (await announcements.list())
    .filter(
      (item) =>
        item.audience.kind === 'community' &&
        item.audience.communityId === communityId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteAnnouncement(
  actorId: string,
  announcementId: string,
): Promise<void> {
  const item = await announcements.get(announcementId);

  if (!item) {
    return;
  }

  if (item.authorId !== actorId) {
    await assertCanPublish(actorId, item.audience);
  }

  await announcements.remove(announcementId);
}

export async function getReadAnnouncementIds(): Promise<Set<string>> {
  return new Set((await reads.list()).map((item) => item.id));
}

export async function markAnnouncementRead(id: string): Promise<void> {
  await reads.upsert({ id });
}
