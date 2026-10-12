import type {
  Institution,
  InstitutionType,
  OrgUnit,
  OrgUnitKind,
} from '../models/campus';
import { createCollection } from './collection';
import { generateId, nowIso } from '../utils/ids';

const institutions = createCollection<Institution>('institutions');
const orgUnits = createCollection<OrgUnit>('org_units');

/**
 * Institution ids keep the `school-<slug>` shape that onboarding already
 * writes to `HiLinkUser.schoolId`, so existing profiles resolve to an
 * institution without rewriting any user records.
 */
export const institutionIdFromName = (name: string): string =>
  `school-${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

export const getInstitutions = () => institutions.list();

export const getInstitution = (id: string) => institutions.get(id);

export async function findInstitutionByName(
  name: string,
): Promise<Institution | null> {
  return institutions.get(institutionIdFromName(name));
}

/**
 * Returns the institution for a name, creating it when it does not exist.
 * `created` tells the caller whether it just founded it (and so should be
 * made its first administrator).
 */
export async function ensureInstitution(
  name: string,
  createdBy: string,
  type: InstitutionType = 'secondary',
  preferredId?: string,
): Promise<{ institution: Institution; created: boolean }> {
  const id = preferredId || institutionIdFromName(name);
  const existing = await institutions.get(id);

  if (existing) {
    return { institution: existing, created: false };
  }

  const now = nowIso();

  const institution: Institution = {
    id,
    name: name.trim(),
    type,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await institutions.upsert(institution);

  return { institution, created: true };
}

export async function markInstitutionVerified(
  institutionId: string,
  verifierId: string,
): Promise<void> {
  const now = nowIso();

  await institutions.update(institutionId, {
    verifiedBy: verifierId,
    verifiedAt: now,
    updatedAt: now,
  });
}

export async function getOrgUnits(institutionId: string): Promise<OrgUnit[]> {
  return (await orgUnits.list()).filter(
    (unit) => unit.institutionId === institutionId,
  );
}

export async function addOrgUnit(input: {
  institutionId: string;
  kind: OrgUnitKind;
  name: string;
  parentId?: string;
  code?: string;
}): Promise<OrgUnit> {
  const unit: OrgUnit = {
    id: generateId('unit'),
    institutionId: input.institutionId,
    parentId: input.parentId,
    kind: input.kind,
    name: input.name.trim(),
    code: input.code?.trim() || undefined,
    createdAt: nowIso(),
  };

  return orgUnits.upsert(unit);
}
