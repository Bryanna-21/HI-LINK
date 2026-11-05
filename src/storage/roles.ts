import type { GrantedRole, RoleGrant } from '../models/campus';
import { createCollection } from './collection';
import { generateId, nowIso } from '../utils/ids';

/**
 * Role-based permissions.
 *
 * Authority comes ONLY from `RoleGrant` records (and community membership,
 * handled in `communities.ts`). The `role` field on a profile is a
 * self-declared label and is never trusted for access decisions.
 *
 * Every mutating storage function calls `assertCan` itself, so permissions are
 * enforced below the UI: hiding a button is never the only protection.
 */

export type Action =
  | 'announcement.publish'
  | 'event.create'
  | 'assignment.create'
  | 'opportunity.create'
  | 'moderate.institution'
  | 'moderate.system'
  | 'user.verify'
  | 'institution.verify'
  | 'role.grant.teacher'
  | 'role.grant.school_admin'
  | 'role.grant.system_admin'
  | 'role.grant.super_admin'
  | 'emergency.respond'
  | 'emergency.contacts';

export interface PermissionContext {
  institutionId?: string;
}

export class PermissionError extends Error {
  constructor(action: string) {
    super(`You do not have permission to perform this action (${action}).`);
    this.name = 'PermissionError';
  }
}

const grants = createCollection<RoleGrant>('role_grants');

export const getGrants = () => grants.list();

export async function getGrantsFor(userId: string): Promise<RoleGrant[]> {
  return (await grants.list()).filter((grant) => grant.userId === userId);
}

export async function hasRole(
  userId: string | null | undefined,
  role: GrantedRole,
  institutionId?: string,
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  return (await getGrantsFor(userId)).some(
    (grant) =>
      grant.role === role &&
      (institutionId === undefined ||
        grant.institutionId === undefined ||
        grant.institutionId === institutionId),
  );
}

export async function isSuperAdmin(userId: string | null | undefined) {
  return hasRole(userId, 'super_admin');
}

export async function isSystemStaff(userId: string | null | undefined) {
  return (
    (await hasRole(userId, 'super_admin')) ||
    (await hasRole(userId, 'system_admin'))
  );
}

/** True when the user administers (or is system staff over) the institution. */
export async function isInstitutionAdmin(
  userId: string | null | undefined,
  institutionId?: string,
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  if (await isSystemStaff(userId)) {
    return true;
  }

  return institutionId
    ? hasRole(userId, 'school_admin', institutionId)
    : false;
}

export async function can(
  userId: string | null | undefined,
  action: Action,
  context: PermissionContext = {},
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const { institutionId } = context;
  const systemStaff = await isSystemStaff(userId);
  const superAdmin = await isSuperAdmin(userId);

  switch (action) {
    case 'role.grant.super_admin':
    case 'role.grant.system_admin':
      return superAdmin;

    case 'moderate.system':
    case 'institution.verify':
    case 'role.grant.school_admin':
      return systemStaff;

    case 'role.grant.teacher':
    case 'user.verify':
    case 'moderate.institution':
    case 'emergency.contacts':
      return (
        systemStaff ||
        (institutionId !== undefined &&
          (await hasRole(userId, 'school_admin', institutionId)))
      );

    case 'announcement.publish':
    case 'event.create':
    case 'assignment.create':
    case 'opportunity.create':
    case 'emergency.respond':
      return (
        systemStaff ||
        (institutionId !== undefined &&
          ((await hasRole(userId, 'school_admin', institutionId)) ||
            (await hasRole(userId, 'teacher', institutionId))))
      );

    default:
      return false;
  }
}

export async function assertCan(
  userId: string | null | undefined,
  action: Action,
  context: PermissionContext = {},
): Promise<void> {
  if (!(await can(userId, action, context))) {
    throw new PermissionError(action);
  }
}

export async function grantRole(
  actorId: string,
  input: {
    userId: string;
    role: GrantedRole;
    institutionId?: string;
  },
): Promise<RoleGrant> {
  const action = `role.grant.${input.role}` as Action;

  await assertCan(actorId, action, { institutionId: input.institutionId });

  if (
    (input.role === 'teacher' || input.role === 'school_admin') &&
    !input.institutionId
  ) {
    throw new Error('This role must be granted within an institution.');
  }

  const existing = (await grants.list()).find(
    (grant) =>
      grant.userId === input.userId &&
      grant.role === input.role &&
      grant.institutionId === input.institutionId,
  );

  if (existing) {
    return existing;
  }

  return grants.upsert({
    id: generateId('grant'),
    userId: input.userId,
    role: input.role,
    institutionId: input.institutionId,
    grantedBy: actorId,
    createdAt: nowIso(),
  });
}

export async function revokeRole(
  actorId: string,
  grantId: string,
): Promise<void> {
  const grant = await grants.get(grantId);

  if (!grant) {
    return;
  }

  await assertCan(actorId, `role.grant.${grant.role}` as Action, {
    institutionId: grant.institutionId,
  });

  const remainingSuper = (await grants.list()).filter(
    (item) => item.role === 'super_admin' && item.id !== grantId,
  );

  if (grant.role === 'super_admin' && remainingSuper.length === 0) {
    throw new Error('The last super administrator cannot be removed.');
  }

  await grants.remove(grantId);
}

/**
 * Internal grant used only while bootstrapping a fresh device or founding an
 * institution. Not exported through any screen.
 */
export async function grantBootstrapRole(input: {
  userId: string;
  role: GrantedRole;
  institutionId?: string;
  reason: 'device_owner' | 'institution_founder';
}): Promise<void> {
  const existing = (await grants.list()).find(
    (grant) =>
      grant.userId === input.userId &&
      grant.role === input.role &&
      grant.institutionId === input.institutionId,
  );

  if (existing) {
    return;
  }

  await grants.upsert({
    id: generateId('grant'),
    userId: input.userId,
    role: input.role,
    institutionId: input.institutionId,
    grantedBy: input.reason,
    createdAt: nowIso(),
  });
}

export interface StaffScope {
  /** System staff can act in every institution. */
  all: boolean;
  /** Institutions where the user is a teacher or school administrator. */
  institutionIds: string[];
}

/** Where can this user publish announcements / events / assignments? */
export async function getStaffScope(
  userId: string | null | undefined,
): Promise<StaffScope> {
  if (!userId) {
    return { all: false, institutionIds: [] };
  }

  if (await isSystemStaff(userId)) {
    return { all: true, institutionIds: [] };
  }

  const ids = (await getGrantsFor(userId))
    .filter(
      (grant) =>
        (grant.role === 'teacher' || grant.role === 'school_admin') &&
        grant.institutionId,
    )
    .map((grant) => grant.institutionId as string);

  return { all: false, institutionIds: Array.from(new Set(ids)) };
}
