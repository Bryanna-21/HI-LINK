import type { HiLinkUser } from '../models/user';
import { getUsers } from './users';
import { ensureInstitution } from './institutions';
import { getGrants, grantBootstrapRole } from './roles';
import { syncAssignmentReminders } from './assignments';
import { syncEventReminders } from './events';
import { syncTimetableReminders } from './timetable';

/**
 * Local campus bootstrap.
 *
 * With no backend there is no central authority to appoint administrators, so
 * two documented local rules apply until a server takes over:
 *  1. The first account on a device becomes its `super_admin` (device owner).
 *  2. The account that first registers an institution becomes its
 *     `school_admin`. The institution stays unverified (no badge) until
 *     system staff verify it.
 * Everyone else is a student; teacher and further admin roles are granted by
 * an authorised administrator through `grantRole`.
 */

export async function registerUserInCampus(user: HiLinkUser): Promise<void> {
  if (user.schoolName?.trim()) {
    const { created, institution } = await ensureInstitution(
      user.schoolName,
      user.id,
      'secondary',
      user.schoolId,
    );

    if (created) {
      await grantBootstrapRole({
        userId: user.id,
        role: 'school_admin',
        institutionId: institution.id,
        reason: 'institution_founder',
      });
    }
  }

  const grants = await getGrants();

  if (!grants.some((grant) => grant.role === 'super_admin')) {
    await grantBootstrapRole({ userId: user.id, role: 'super_admin', reason: 'device_owner' });
  }
}

/** Idempotent: safe to run on every launch. Oldest accounts register first. */
export async function bootstrapCampus(): Promise<void> {
  const users = (await getUsers()).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

  for (const user of users) {
    await registerUserInCampus(user);
  }
}

/** Surfaces due reminders for the signed-in student; call on app focus. */
export async function syncReminders(): Promise<void> {
  await Promise.all([
    syncEventReminders(),
    syncTimetableReminders(),
    syncAssignmentReminders(),
  ]);
}
