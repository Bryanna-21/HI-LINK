import type {
  Opportunity,
  OpportunityCategory,
  OpportunityInterest,
} from '../models/campus';
import { createCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { getIdentity } from './identity';
import { assertCan } from './roles';
import { generateId, nowIso } from '../utils/ids';

const opportunities = createCollection<Opportunity>('opportunities');
const interests = createCollection<OpportunityInterest>('opportunity_interests');

export const OPPORTUNITY_CATEGORIES: { value: OpportunityCategory; label: string }[] = [
  { value: 'internship', label: 'Internships' },
  { value: 'job', label: 'Jobs' },
  { value: 'scholarship', label: 'Scholarships' },
  { value: 'competition', label: 'Competitions' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'training', label: 'Training' },
  { value: 'program', label: 'Student programs' },
];

export type CreateOpportunityInput = Omit<
  Opportunity,
  'id' | 'postedBy' | 'createdAt' | 'updatedAt'
>;

export async function createOpportunity(
  actorId: string,
  input: CreateOpportunityInput,
): Promise<Opportunity> {
  await assertCan(actorId, 'opportunity.create', {
    institutionId: input.institutionId,
  });

  if (!input.title.trim() || !input.organization.trim()) {
    throw new Error('An opportunity needs a title and an organization.');
  }

  if (input.applyUrl && !/^https?:\/\//i.test(input.applyUrl.trim())) {
    throw new Error('The application link must start with http:// or https://');
  }

  if (input.deadline && Number.isNaN(new Date(input.deadline).getTime())) {
    throw new Error('Enter the deadline as YYYY-MM-DD.');
  }

  const now = nowIso();

  const opportunity: Opportunity = {
    ...input,
    id: generateId('opportunity'),
    title: input.title.trim(),
    organization: input.organization.trim(),
    applyUrl: input.applyUrl?.trim() || undefined,
    postedBy: actorId,
    createdAt: now,
    updatedAt: now,
  };

  return opportunities.upsert(opportunity);
}

export const getOpportunity = (id: string) => opportunities.get(id);

export function isClosed(opportunity: Opportunity, now = new Date()): boolean {
  return Boolean(opportunity.deadline) &&
    new Date(`${opportunity.deadline}T23:59:59`).getTime() < now.getTime();
}

/** Open opportunities available to this student (global or their school). */
export async function getMyOpportunities(): Promise<Opportunity[]> {
  const user = await getIdentity();

  if (!user) {
    return [];
  }

  return (await opportunities.list())
    .filter(
      (item) =>
        item.postedBy === user.id ||
        !item.institutionId ||
        item.institutionId === user.schoolId,
    )
    .sort((a, b) => {
      const closedA = isClosed(a) ? 1 : 0;
      const closedB = isClosed(b) ? 1 : 0;

      return (
        closedA - closedB ||
        (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999')
      );
    });
}

export async function deleteOpportunity(
  actorId: string,
  opportunityId: string,
): Promise<void> {
  const item = await opportunities.get(opportunityId);

  if (!item) {
    return;
  }

  if (item.postedBy !== actorId) {
    await assertCan(actorId, 'opportunity.create', { institutionId: item.institutionId });
  }

  await opportunities.remove(opportunityId);
  await interests.removeWhere((entry) => entry.opportunityId === opportunityId);
}

export async function expressInterest(
  opportunityId: string,
  note?: string,
): Promise<OpportunityInterest> {
  const userId = await getActiveUserId();
  const item = await opportunities.get(opportunityId);

  if (!userId || !item) {
    throw new Error('This opportunity is no longer available.');
  }

  if (isClosed(item)) {
    throw new Error('Applications for this opportunity have closed.');
  }

  const existing = (await interests.list()).find(
    (entry) => entry.opportunityId === opportunityId && entry.userId === userId,
  );

  if (existing) {
    return existing;
  }

  return interests.upsert({
    id: generateId('interest'),
    opportunityId,
    userId,
    note: note?.trim() || undefined,
    createdAt: nowIso(),
  });
}

export async function hasExpressedInterest(opportunityId: string): Promise<boolean> {
  const userId = await getActiveUserId();

  return (await interests.list()).some(
    (entry) => entry.opportunityId === opportunityId && entry.userId === userId,
  );
}

/** Only the poster sees who is interested. */
export async function getInterestsFor(
  actorId: string,
  opportunityId: string,
): Promise<OpportunityInterest[]> {
  const item = await opportunities.get(opportunityId);

  if (!item || item.postedBy !== actorId) {
    return [];
  }

  return (await interests.list()).filter((entry) => entry.opportunityId === opportunityId);
}
