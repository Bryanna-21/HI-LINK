import type { VerificationRecord, VerificationStatus } from '../models/campus';
import { createCollection } from './collection';
import { assertCan, can, isSystemStaff } from './roles';
import { getUsers } from './users';
import { notify } from './notifications';
import { getGrants } from './roles';
import { generateId, nowIso } from '../utils/ids';

/**
 * Student/school identity verification. A student asks to be verified for
 * their institution; a school administrator (or system staff) reviews it.
 * "Verified" therefore means a named reviewer approved it, never a
 * self-assigned flag.
 */

const records = createCollection<VerificationRecord>('verifications');

export const getVerificationRecords = () => records.list();

export async function getVerificationStatus(userId: string): Promise<VerificationStatus> {
  const mine = (await records.list())
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  return mine[0]?.status ?? 'unverified';
}

export async function isVerified(userId: string): Promise<boolean> {
  return (await getVerificationStatus(userId)) === 'verified';
}

export async function requestVerification(
  userId: string,
  institutionId?: string,
): Promise<VerificationRecord> {
  const status = await getVerificationStatus(userId);

  if (status === 'pending' || status === 'verified') {
    const current = (await records.list()).find(
      (item) => item.userId === userId && item.status === status,
    );

    if (current) {
      return current;
    }
  }

  const record: VerificationRecord = {
    id: generateId('verify'),
    userId,
    institutionId,
    status: 'pending',
    requestedAt: nowIso(),
  };

  await records.upsert(record);

  const reviewers = (await getGrants())
    .filter(
      (grant) =>
        grant.role === 'super_admin' ||
        grant.role === 'system_admin' ||
        (grant.role === 'school_admin' && grant.institutionId === institutionId),
    )
    .map((grant) => grant.userId)
    .filter((id) => id !== userId);

  const requester = (await getUsers()).find((user) => user.id === userId);

  for (const reviewerId of new Set(reviewers)) {
    await notify({
      recipientId: reviewerId,
      type: 'admin',
      title: 'Verification request',
      body: `${requester?.name ?? 'A student'} asked to be verified.`,
      actorId: userId,
      entityType: 'verification',
      entityId: record.id,
      dedupeKey: `verify:${userId}`,
      route: { pathname: '/admin' },
    });
  }

  return record;
}

export async function getPendingVerifications(actorId: string): Promise<VerificationRecord[]> {
  const pending = (await records.list()).filter((item) => item.status === 'pending');

  if (await isSystemStaff(actorId)) {
    return pending;
  }

  const scoped: VerificationRecord[] = [];

  for (const record of pending) {
    if (await can(actorId, 'user.verify', { institutionId: record.institutionId })) {
      scoped.push(record);
    }
  }

  return scoped;
}

export async function reviewVerification(
  actorId: string,
  recordId: string,
  approve: boolean,
  note?: string,
): Promise<void> {
  const record = await records.get(recordId);

  if (!record || record.status !== 'pending') {
    return;
  }

  await assertCan(actorId, 'user.verify', { institutionId: record.institutionId });

  if (record.userId === actorId) {
    throw new Error('You cannot verify yourself.');
  }

  await records.update(recordId, {
    status: approve ? 'verified' : 'rejected',
    reviewedBy: actorId,
    reviewedAt: nowIso(),
    note: note?.trim() || undefined,
  });

  await notify({
    recipientId: record.userId,
    type: 'admin',
    title: approve ? 'You are verified' : 'Verification not approved',
    body: note,
    actorId,
    entityType: 'verification',
    entityId: recordId,
    route: { pathname: '/(tabs)/me' },
  });
}
