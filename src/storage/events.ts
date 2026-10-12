import type {
  CampusEvent,
  EventCategory,
  EventRsvp,
  RsvpStatus,
} from '../models/campus';
import type { PostVisibility } from '../models/post';
import { createCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { getIdentity } from './identity';
import { assertCan } from './roles';
import {
  canManageCommunity,
  getActiveMemberIds,
  getMyMemberships,
} from './communities';
import { notify, notifyMany } from './notifications';
import { generateId, nowIso } from '../utils/ids';

const events = createCollection<CampusEvent>('events');
const rsvps = createCollection<EventRsvp>('event_rsvps');

export const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'social', label: 'Social' },
  { value: 'club', label: 'Club' },
  { value: 'career', label: 'Career' },
  { value: 'technology', label: 'Technology' },
  { value: 'leadership', label: 'Student leadership' },
  { value: 'other', label: 'Other' },
];

export interface CreateEventInput {
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  imageUri?: string;
  category: EventCategory;
  institutionId?: string;
  communityId?: string;
  visibility?: PostVisibility;
}

export async function createEvent(
  organizerId: string,
  input: CreateEventInput,
): Promise<CampusEvent> {
  if (input.communityId) {
    if (!(await canManageCommunity(input.communityId, organizerId))) {
      throw new Error('Only community administrators can add community events.');
    }
  } else {
    await assertCan(organizerId, 'event.create', {
      institutionId: input.institutionId,
    });
  }

  const title = input.title.trim();
  const start = new Date(input.startsAt).getTime();

  if (title.length < 3) {
    throw new Error('Give the event a title.');
  }

  if (Number.isNaN(start)) {
    throw new Error('Choose a valid start date and time.');
  }

  if (input.endsAt && new Date(input.endsAt).getTime() <= start) {
    throw new Error('The event must end after it starts.');
  }

  const now = nowIso();

  const event: CampusEvent = {
    id: generateId('event'),
    title,
    description: input.description.trim(),
    organizerId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    location: input.location?.trim() || undefined,
    imageUri: input.imageUri,
    category: input.category,
    institutionId: input.institutionId,
    communityId: input.communityId,
    visibility: input.communityId
      ? 'my_group'
      : input.visibility ?? (input.institutionId ? 'my_school' : 'everyone'),
    createdAt: now,
    updatedAt: now,
  };

  await events.upsert(event);

  if (event.communityId) {
    await notifyMany(await getActiveMemberIds(event.communityId), {
      type: 'event',
      title: `New event: ${event.title}`,
      body: event.location,
      actorId: organizerId,
      entityType: 'event',
      entityId: event.id,
      route: { pathname: '/events/[id]', params: { id: event.id } },
    });
  }

  return event;
}

export async function cancelEvent(
  actorId: string,
  eventId: string,
): Promise<void> {
  const event = await events.get(eventId);

  if (!event) {
    return;
  }

  if (event.organizerId !== actorId) {
    if (event.communityId) {
      if (!(await canManageCommunity(event.communityId, actorId))) {
        throw new Error('You cannot cancel this event.');
      }
    } else {
      await assertCan(actorId, 'event.create', { institutionId: event.institutionId });
    }
  }

  await events.update(eventId, { cancelled: true, updatedAt: nowIso() });

  const attendees = (await rsvps.list())
    .filter((item) => item.eventId === eventId && item.status !== 'not_going')
    .map((item) => item.userId);

  await notifyMany(attendees, {
    type: 'event',
    title: `Cancelled: ${event.title}`,
    actorId,
    entityType: 'event',
    entityId: eventId,
    route: { pathname: '/events/[id]', params: { id: eventId } },
  });
}

export const getEvent = (id: string) => events.get(id);

/** Events the signed-in student may see, soonest first. */
export async function getMyEvents(): Promise<CampusEvent[]> {
  const [user, memberships] = await Promise.all([
    getIdentity(),
    getMyMemberships(),
  ]);

  if (!user) {
    return [];
  }

  const communityIds = new Set(memberships.map((item) => item.communityId));

  return (await events.list())
    .filter((event) => {
      if (event.organizerId === user.id) {
        return true;
      }

      if (event.communityId) {
        return communityIds.has(event.communityId);
      }

      if (event.visibility === 'my_school') {
        return Boolean(user.schoolId) && user.schoolId === event.institutionId;
      }

      return event.visibility === 'everyone';
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getCommunityEvents(
  communityId: string,
): Promise<CampusEvent[]> {
  return (await events.list())
    .filter((event) => event.communityId === communityId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getMyRsvp(eventId: string): Promise<EventRsvp | null> {
  const userId = await getActiveUserId();

  if (!userId) {
    return null;
  }

  return (
    (await rsvps.list()).find(
      (item) => item.eventId === eventId && item.userId === userId,
    ) ?? null
  );
}

export async function getEventAttendeeCount(eventId: string): Promise<number> {
  return (await rsvps.list()).filter(
    (item) => item.eventId === eventId && item.status === 'going',
  ).length;
}

export async function setRsvp(
  userId: string,
  eventId: string,
  status: RsvpStatus,
  reminderMinutes?: number,
): Promise<EventRsvp> {
  const event = await events.get(eventId);

  if (!event || event.cancelled) {
    throw new Error('This event is no longer available.');
  }

  const existing = (await rsvps.list()).find(
    (item) => item.eventId === eventId && item.userId === userId,
  );

  return rsvps.upsert({
    id: existing?.id ?? generateId('rsvp'),
    eventId,
    userId,
    status,
    reminderMinutes:
      status === 'not_going' ? undefined : reminderMinutes ?? existing?.reminderMinutes,
    updatedAt: nowIso(),
  });
}

/**
 * Turns due event reminders into notifications. Called whenever the app
 * comes to the foreground: without a background service the app cannot wake
 * itself, so reminders surface the next time the student opens Hi-Link.
 */
export async function syncEventReminders(now = new Date()): Promise<void> {
  const userId = await getActiveUserId();

  if (!userId) {
    return;
  }

  const mine = (await rsvps.list()).filter(
    (item) =>
      item.userId === userId &&
      item.status !== 'not_going' &&
      item.reminderMinutes !== undefined,
  );

  for (const rsvp of mine) {
    const event = await events.get(rsvp.eventId);

    if (!event || event.cancelled) {
      continue;
    }

    const start = new Date(event.startsAt).getTime();
    const remindAt = start - (rsvp.reminderMinutes as number) * 60_000;

    if (now.getTime() >= remindAt && now.getTime() < start) {
      await notify({
        recipientId: userId,
        type: 'event',
        title: `Starting soon: ${event.title}`,
        body: event.location,
        entityType: 'event',
        entityId: event.id,
        dedupeKey: `event-reminder:${event.id}`,
        route: { pathname: '/events/[id]', params: { id: event.id } },
      });
    }
  }
}
