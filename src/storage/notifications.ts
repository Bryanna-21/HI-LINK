import type {
  HiLinkNotification,
  NotificationRoute,
  NotificationType,
} from '../models/campus';
import { createCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { generateId, nowIso } from '../utils/ids';

/**
 * The single notification pipeline. Every feature (reactions, comments,
 * follows, communities, announcements, assignments, events, emergency,
 * moderation...) calls `notify`; there is no per-feature notification store.
 *
 * Notifications are addressed by `recipientId` and only ever read through
 * `getMyNotifications`, which filters to the signed-in account. They are
 * created on this device for accounts on this device; remote push delivery
 * needs a backend and is not claimed here.
 */

const store = createCollection<HiLinkNotification>('notifications');

const MAX_PER_RECIPIENT = 300;

export interface NotifyInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  route?: NotificationRoute;
  dedupeKey?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  if (!input.recipientId || input.recipientId === input.actorId) {
    return;
  }

  await store.mutate((items) => {
    const withoutDuplicate = input.dedupeKey
      ? items.filter(
          (item) =>
            !(
              item.recipientId === input.recipientId &&
              item.dedupeKey === input.dedupeKey
            ),
        )
      : items;

    const notification: HiLinkNotification = {
      id: generateId('notif'),
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      route: input.route,
      dedupeKey: input.dedupeKey,
      createdAt: nowIso(),
    };

    const next = [notification, ...withoutDuplicate];
    let kept = 0;

    return next.filter((item) => {
      if (item.recipientId !== input.recipientId) {
        return true;
      }

      kept += 1;

      return kept <= MAX_PER_RECIPIENT;
    });
  });
}

export async function notifyMany(
  recipientIds: string[],
  input: Omit<NotifyInput, 'recipientId'>,
): Promise<void> {
  for (const recipientId of new Set(recipientIds)) {
    await notify({ ...input, recipientId });
  }
}

export async function getMyNotifications(): Promise<HiLinkNotification[]> {
  const userId = await getActiveUserId();

  if (!userId) {
    return [];
  }

  return (await store.list())
    .filter((item) => item.recipientId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUnreadNotificationCount(): Promise<number> {
  return (await getMyNotifications()).filter((item) => !item.readAt).length;
}

export async function markNotificationRead(id: string): Promise<void> {
  const userId = await getActiveUserId();

  await store.mutate((items) =>
    items.map((item) =>
      item.id === id && item.recipientId === userId && !item.readAt
        ? { ...item, readAt: nowIso() }
        : item,
    ),
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getActiveUserId();

  if (!userId) {
    return;
  }

  const now = nowIso();

  await store.mutate((items) =>
    items.map((item) =>
      item.recipientId === userId && !item.readAt
        ? { ...item, readAt: now }
        : item,
    ),
  );
}

export async function deleteNotification(id: string): Promise<void> {
  const userId = await getActiveUserId();

  await store.removeWhere(
    (item) => item.id === id && item.recipientId === userId,
  );
}
