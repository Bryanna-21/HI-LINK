import type {
  Assignment,
  AssignmentAttachment,
  Submission,
  SubmissionState,
} from '../models/campus';
import type { HiLinkUser } from '../models/user';
import { createCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { getIdentity } from './identity';
import { assertCan } from './roles';
import {
  canManageCommunity,
  getActiveMemberIds,
  getMyMemberships,
} from './communities';
import { getUsers } from './users';
import { notify, notifyMany } from './notifications';
import { generateId, nowIso } from '../utils/ids';

/**
 * Teacher-assigned work and student submissions. Student-owned planning
 * (personal CATs, projects) stays in the academic store; this is the shared
 * side that needs more than one account.
 */

const assignments = createCollection<Assignment>('assignments');
const submissions = createCollection<Submission>('submissions');

export type CreateAssignmentInput = Omit<
  Assignment,
  'id' | 'teacherId' | 'createdAt' | 'updatedAt' | 'attachments'
> & { attachments?: AssignmentAttachment[] };

function targets(assignment: Assignment, user: HiLinkUser, communityIds: ReadonlySet<string>) {
  if (assignment.teacherId === user.id) {
    return true;
  }

  if (assignment.communityId && communityIds.has(assignment.communityId)) {
    return true;
  }

  if (assignment.institutionId && assignment.form) {
    return (
      user.schoolId === assignment.institutionId &&
      user.form === assignment.form &&
      (!assignment.stream || user.stream === assignment.stream)
    );
  }

  return false;
}

export async function createAssignment(
  teacherId: string,
  input: CreateAssignmentInput,
): Promise<Assignment> {
  if (input.communityId) {
    if (!(await canManageCommunity(input.communityId, teacherId))) {
      throw new Error('Only community administrators can set work here.');
    }
  } else {
    await assertCan(teacherId, 'assignment.create', {
      institutionId: input.institutionId,
    });
  }

  if (!input.title.trim() || !input.subjectName.trim()) {
    throw new Error('An assignment needs a title and a subject.');
  }

  if (!input.communityId && !(input.institutionId && input.form)) {
    throw new Error('Choose a class (institution and form) or a community.');
  }

  const now = nowIso();

  const assignment: Assignment = {
    ...input,
    id: generateId('assignment'),
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    subjectName: input.subjectName.trim(),
    teacherId,
    attachments: input.attachments ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await assignments.upsert(assignment);

  const recipients = assignment.communityId
    ? await getActiveMemberIds(assignment.communityId)
    : (await getUsers())
        .filter((user) => targets(assignment, user, new Set()))
        .map((user) => user.id);

  await notifyMany(recipients, {
    type: 'assignment',
    title: `New assignment: ${assignment.title}`,
    body: assignment.dueAt
      ? `Due ${new Date(assignment.dueAt).toLocaleString()}`
      : assignment.subjectName,
    actorId: teacherId,
    entityType: 'assignment',
    entityId: assignment.id,
    route: { pathname: '/assignments/[id]', params: { id: assignment.id } },
  });

  return assignment;
}

export const getAssignment = (id: string) => assignments.get(id);

/** Assignments addressed to the signed-in student (or set by them). */
export async function getMyAssignments(): Promise<Assignment[]> {
  const [user, memberships] = await Promise.all([
    getIdentity(),
    getMyMemberships(),
  ]);

  if (!user) {
    return [];
  }

  const communityIds = new Set(memberships.map((item) => item.communityId));

  return (await assignments.list())
    .filter((assignment) => targets(assignment, user, communityIds))
    .sort((a, b) =>
      (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'),
    );
}

export async function getMySubmission(
  assignmentId: string,
): Promise<Submission | null> {
  const userId = await getActiveUserId();

  if (!userId) {
    return null;
  }

  return (
    (await submissions.list()).find(
      (item) => item.assignmentId === assignmentId && item.studentId === userId,
    ) ?? null
  );
}

export async function getMySubmissions(): Promise<Submission[]> {
  const userId = await getActiveUserId();

  return userId
    ? (await submissions.list()).filter((item) => item.studentId === userId)
    : [];
}

/** Teacher view: only the assignment's own teacher (or community admin). */
export async function getSubmissionsForAssignment(
  actorId: string,
  assignmentId: string,
): Promise<Submission[]> {
  const assignment = await assignments.get(assignmentId);

  if (!assignment || !(await canReview(actorId, assignment))) {
    return [];
  }

  return (await submissions.list()).filter(
    (item) => item.assignmentId === assignmentId && item.state !== 'not_started',
  );
}

async function canReview(actorId: string, assignment: Assignment) {
  if (assignment.teacherId === actorId) {
    return true;
  }

  return assignment.communityId
    ? canManageCommunity(assignment.communityId, actorId)
    : false;
}

export function isOverdue(assignment: Assignment, now = new Date()): boolean {
  return Boolean(assignment.dueAt) && new Date(assignment.dueAt as string).getTime() < now.getTime();
}

/** The explicit state shown to the student. */
export function displayState(
  submission: Submission | null,
): SubmissionState {
  if (!submission) {
    return 'not_started';
  }

  if (submission.state === 'submitted' && submission.late) {
    return 'late';
  }

  return submission.state;
}

export async function saveDraft(
  assignmentId: string,
  input: { text?: string; attachments?: AssignmentAttachment[] },
): Promise<Submission> {
  const studentId = await getActiveUserId();

  if (!studentId) {
    throw new Error('Sign in to work on an assignment.');
  }

  const existing = await getMySubmission(assignmentId);

  if (existing && existing.state !== 'in_progress' && existing.state !== 'not_started') {
    throw new Error('This work has already been handed in.');
  }

  const now = nowIso();

  return submissions.upsert({
    id: existing?.id ?? generateId('submission'),
    assignmentId,
    studentId,
    state: 'in_progress',
    text: input.text,
    attachments: input.attachments ?? existing?.attachments ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

/**
 * Hands work in. The promise resolves only after the submission is written
 * to storage, so callers can truthfully say "saved". It is stored on this
 * device and queued for the teacher; it is not claimed as received remotely.
 */
export async function submitAssignment(
  assignmentId: string,
  input: { text?: string; attachments?: AssignmentAttachment[] },
): Promise<Submission> {
  const studentId = await getActiveUserId();
  const assignment = await assignments.get(assignmentId);

  if (!studentId || !assignment) {
    throw new Error('This assignment is no longer available.');
  }

  const text = input.text?.trim();
  const attachments = input.attachments ?? [];

  if (!text && attachments.length === 0) {
    throw new Error('Add your answer or an attachment before handing in.');
  }

  const existing = await getMySubmission(assignmentId);

  if (existing && ['submitted', 'completed', 'late'].includes(existing.state)) {
    throw new Error('You have already handed this in.');
  }

  const now = nowIso();

  const saved = await submissions.upsert({
    id: existing?.id ?? generateId('submission'),
    assignmentId,
    studentId,
    state: 'submitted',
    text,
    attachments,
    submittedAt: now,
    late: isOverdue(assignment, new Date(now)),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  const student = await getIdentity();

  await notify({
    recipientId: assignment.teacherId,
    type: 'assignment',
    title: `${student?.name ?? 'A student'} handed in ${assignment.title}`,
    actorId: studentId,
    entityType: 'assignment',
    entityId: assignmentId,
    route: { pathname: '/assignments/[id]', params: { id: assignmentId } },
  });

  return saved;
}

export async function returnSubmission(
  actorId: string,
  submissionId: string,
  input: { feedback?: string; score?: number; complete?: boolean },
): Promise<void> {
  const submission = await submissions.get(submissionId);

  if (!submission) {
    return;
  }

  const assignment = await assignments.get(submission.assignmentId);

  if (!assignment || !(await canReview(actorId, assignment))) {
    throw new Error('Only the teacher who set this work can return it.');
  }

  if (
    input.score !== undefined &&
    (input.score < 0 || (assignment.maxScore !== undefined && input.score > assignment.maxScore))
  ) {
    throw new Error('Enter a score within the allowed range.');
  }

  const now = nowIso();

  await submissions.update(submissionId, {
    state: input.complete ? 'completed' : 'returned',
    feedback: input.feedback?.trim() || undefined,
    score: input.score,
    returnedAt: now,
    returnedBy: actorId,
    updatedAt: now,
  });

  await notify({
    recipientId: submission.studentId,
    type: 'assignment',
    title: `Feedback on ${assignment.title}`,
    body: input.feedback?.slice(0, 120),
    actorId,
    entityType: 'assignment',
    entityId: assignment.id,
    route: { pathname: '/assignments/[id]', params: { id: assignment.id } },
  });
}

/** Creates "due soon" notifications for the signed-in student's open work. */
export async function syncAssignmentReminders(now = new Date()): Promise<void> {
  const userId = await getActiveUserId();

  if (!userId) {
    return;
  }

  const [mine, done] = await Promise.all([getMyAssignments(), getMySubmissions()]);
  const handedIn = new Set(
    done
      .filter((item) => !['not_started', 'in_progress'].includes(item.state))
      .map((item) => item.assignmentId),
  );

  for (const assignment of mine) {
    if (assignment.teacherId === userId || handedIn.has(assignment.id) || !assignment.dueAt) {
      continue;
    }

    const hoursLeft = (new Date(assignment.dueAt).getTime() - now.getTime()) / 3_600_000;

    if (hoursLeft > 0 && hoursLeft <= 24) {
      await notify({
        recipientId: userId,
        type: 'assignment',
        title: `Due soon: ${assignment.title}`,
        body: assignment.subjectName,
        entityType: 'assignment',
        entityId: assignment.id,
        dedupeKey: `assignment-due:${assignment.id}`,
        route: { pathname: '/assignments/[id]', params: { id: assignment.id } },
      });
    }
  }
}
