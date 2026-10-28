import type {
  EmergencyCategory,
  EmergencyContact,
  EmergencyRequest,
  EmergencyStatus,
} from '../models/campus';
import { createCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { getIdentity } from './identity';
import { getGrants, assertCan, can, isSystemStaff } from './roles';
import { notifyMany } from './notifications';
import { generateId, nowIso } from '../utils/ids';

/**
 * Emergency workflow. Honesty rules enforced here:
 *  - location is only what the student typed (no GPS in this build);
 *  - ETA is only what a responder entered;
 *  - "notified" counts only accounts on this device that received an
 *    in-app alert. No external service (phone, SMS, ambulance, police) is
 *    ever contacted by the app.
 */

const requests = createCollection<EmergencyRequest>('emergency_requests');
const contacts = createCollection<EmergencyContact>('emergency_contacts');

export const EMERGENCY_CATEGORIES: { value: EmergencyCategory; label: string }[] = [
  { value: 'medical', label: 'Medical' },
  { value: 'security', label: 'Security' },
  { value: 'fire', label: 'Fire' },
  { value: 'accident', label: 'Accident' },
  { value: 'harassment', label: 'Harassment / assault' },
  { value: 'other', label: 'Other emergency' },
];

export const EMERGENCY_STATUS_LABELS: Record<EmergencyStatus, string> = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  responder_assigned: 'Responder assigned',
  responding: 'Responding',
  arrived: 'Responder arrived',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

/** Allowed next statuses for a responder. */
const RESPONDER_FLOW: Record<EmergencyStatus, EmergencyStatus[]> = {
  reported: ['acknowledged', 'responder_assigned', 'responding'],
  acknowledged: ['responder_assigned', 'responding', 'resolved'],
  responder_assigned: ['responding', 'arrived', 'resolved'],
  responding: ['arrived', 'resolved'],
  arrived: ['resolved'],
  resolved: [],
  cancelled: [],
};

export const nextResponderStatuses = (status: EmergencyStatus): EmergencyStatus[] =>
  RESPONDER_FLOW[status];

export const isOpen = (request: EmergencyRequest): boolean =>
  request.status !== 'resolved' && request.status !== 'cancelled';

export async function getResponderIds(institutionId?: string): Promise<string[]> {
  const ids = new Set<string>();

  for (const grant of await getGrants()) {
    if (grant.role === 'super_admin' || grant.role === 'system_admin') {
      ids.add(grant.userId);
    } else if (
      institutionId &&
      grant.institutionId === institutionId &&
      (grant.role === 'school_admin' || grant.role === 'teacher')
    ) {
      ids.add(grant.userId);
    }
  }

  return Array.from(ids);
}

export interface RaiseEmergencyResult {
  request: EmergencyRequest;
  /** Accounts on this device that received an in-app alert. */
  notifiedCount: number;
}

export async function raiseEmergency(input: {
  category: EmergencyCategory;
  description?: string;
  locationText?: string;
}): Promise<RaiseEmergencyResult> {
  const user = await getIdentity();

  if (!user) {
    throw new Error('Sign in to raise an emergency request.');
  }

  const openOwn = (await requests.list()).find(
    (item) => item.requesterId === user.id && isOpen(item),
  );

  if (openOwn) {
    throw new Error('You already have an open emergency request.');
  }

  const now = nowIso();

  const request: EmergencyRequest = {
    id: generateId('emergency'),
    requesterId: user.id,
    institutionId: user.schoolId,
    category: input.category,
    description: input.description?.trim() || undefined,
    locationText: input.locationText?.trim() || undefined,
    status: 'reported',
    history: [{ status: 'reported', at: now, byUserId: user.id }],
    createdAt: now,
    updatedAt: now,
  };

  await requests.upsert(request);

  const responders = (await getResponderIds(user.schoolId)).filter((id) => id !== user.id);

  await notifyMany(responders, {
    type: 'emergency',
    title: `EMERGENCY: ${request.category}`,
    body: `${user.name}${request.locationText ? ` — ${request.locationText}` : ''}`,
    actorId: user.id,
    entityType: 'emergency',
    entityId: request.id,
    route: { pathname: '/emergency', params: { focus: request.id } },
  });

  return { request, notifiedCount: responders.length };
}

export async function getMyEmergencies(): Promise<EmergencyRequest[]> {
  const userId = await getActiveUserId();

  return userId
    ? (await requests.list())
        .filter((item) => item.requesterId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
}

/** Open and recent requests the signed-in responder is authorised to see. */
export async function getEmergenciesForResponder(): Promise<EmergencyRequest[]> {
  const userId = await getActiveUserId();

  if (!userId) {
    return [];
  }

  const staff = await isSystemStaff(userId);
  const visible: EmergencyRequest[] = [];

  for (const item of await requests.list()) {
    if (
      staff ||
      (item.institutionId &&
        (await can(userId, 'emergency.respond', { institutionId: item.institutionId })))
    ) {
      visible.push(item);
    }
  }

  return visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function canRespond(institutionId?: string): Promise<boolean> {
  const userId = await getActiveUserId();

  return (await isSystemStaff(userId)) ||
    (institutionId !== undefined &&
      (await can(userId, 'emergency.respond', { institutionId })));
}

export async function cancelEmergency(requestId: string, note?: string): Promise<void> {
  const userId = await getActiveUserId();
  const request = await requests.get(requestId);

  if (!request || request.requesterId !== userId) {
    throw new Error('Only the person who raised this request can cancel it.');
  }

  if (!isOpen(request)) {
    return;
  }

  await applyStatus(request, 'cancelled', userId as string, note);
}

export async function respondToEmergency(
  requestId: string,
  status: EmergencyStatus,
  input: { note?: string; etaMinutes?: number } = {},
): Promise<void> {
  const userId = await getActiveUserId();
  const request = await requests.get(requestId);

  if (!userId || !request) {
    throw new Error('This request is no longer available.');
  }

  if (!(await canRespond(request.institutionId))) {
    throw new Error('You are not authorised to respond to this request.');
  }

  if (!RESPONDER_FLOW[request.status].includes(status)) {
    throw new Error(
      `A request that is "${EMERGENCY_STATUS_LABELS[request.status]}" cannot move to "${EMERGENCY_STATUS_LABELS[status]}".`,
    );
  }

  if (input.etaMinutes !== undefined && (input.etaMinutes < 0 || input.etaMinutes > 24 * 60)) {
    throw new Error('Enter an ETA between 0 and 1440 minutes.');
  }

  await applyStatus(request, status, userId, input.note, input.etaMinutes);
}

async function applyStatus(
  request: EmergencyRequest,
  status: EmergencyStatus,
  actorId: string,
  note?: string,
  etaMinutes?: number,
): Promise<void> {
  const now = nowIso();
  const assigns = status === 'responder_assigned' || status === 'responding';

  await requests.update(request.id, {
    status,
    responderId: assigns ? actorId : request.responderId,
    etaMinutes: etaMinutes ?? request.etaMinutes,
    history: [...request.history, { status, at: now, byUserId: actorId, note: note?.trim() || undefined }],
    updatedAt: now,
  });

  if (actorId !== request.requesterId) {
    await notifyMany([request.requesterId], {
      type: 'emergency',
      title: `Your emergency request: ${EMERGENCY_STATUS_LABELS[status]}`,
      body: etaMinutes !== undefined ? `Responder reports ETA ${etaMinutes} min` : note,
      actorId,
      entityType: 'emergency',
      entityId: request.id,
      route: { pathname: '/emergency' },
    });
  }
}

/* -------------------------------- Contacts -------------------------------- */

export async function getEmergencyContacts(institutionId?: string): Promise<EmergencyContact[]> {
  return (await contacts.list()).filter((item) => item.institutionId === institutionId);
}

export async function addEmergencyContact(
  actorId: string,
  input: Omit<EmergencyContact, 'id' | 'createdBy' | 'createdAt'>,
): Promise<EmergencyContact> {
  await assertCan(actorId, 'emergency.contacts', { institutionId: input.institutionId });

  const phone = input.phone.replace(/[^\d+]/g, '');

  if (!input.label.trim() || phone.length < 3) {
    throw new Error('Enter a label and a valid phone number.');
  }

  return contacts.upsert({
    ...input,
    label: input.label.trim(),
    phone,
    id: generateId('econtact'),
    createdBy: actorId,
    createdAt: nowIso(),
  });
}

export async function removeEmergencyContact(actorId: string, contactId: string): Promise<void> {
  const contact = await contacts.get(contactId);

  if (!contact) {
    return;
  }

  await assertCan(actorId, 'emergency.contacts', { institutionId: contact.institutionId });
  await contacts.remove(contactId);
}
