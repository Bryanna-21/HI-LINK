import type {
  Report,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from '../models/campus';
import { createCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { getGrants, isSystemStaff } from './roles';
import { canManageCommunity, getMembers } from './communities';
import { notifyMany } from './notifications';
import { deletePost, getPost } from './posts';
import { deleteComment, getComments } from './comments';
import { removeReactionsForPost } from './reactions';
import { generateId, nowIso } from '../utils/ids';

/**
 * One reporting system for posts, comments, messages, accounts, communities
 * and media. Legacy post/user report writers mirror into this store.
 */

const reports = createCollection<Report>('reports');

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'academic_misconduct', label: 'Academic misconduct' },
  { value: 'other', label: 'Something else' },
];

export interface SubmitReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  targetOwnerId?: string;
  institutionId?: string;
  communityId?: string;
}

export async function submitReport(
  reporterId: string,
  input: SubmitReportInput,
): Promise<{ report: Report; duplicate: boolean }> {
  if (input.targetOwnerId && input.targetOwnerId === reporterId) {
    throw new Error('You cannot report your own content.');
  }

  const existing = (await reports.list()).find(
    (item) =>
      item.reporterId === reporterId &&
      item.targetType === input.targetType &&
      item.targetId === input.targetId &&
      item.status !== 'dismissed',
  );

  if (existing) {
    return { report: existing, duplicate: true };
  }

  const now = nowIso();

  const report: Report = {
    id: generateId('report'),
    reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    targetOwnerId: input.targetOwnerId,
    institutionId: input.institutionId,
    communityId: input.communityId,
    reason: input.reason,
    description: input.description?.trim() || undefined,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await reports.upsert(report);
  await notifyModerators(report);

  return { report, duplicate: false };
}

async function moderatorIds(report: Report): Promise<string[]> {
  const ids = new Set<string>();

  for (const grant of await getGrants()) {
    if (grant.role === 'super_admin' || grant.role === 'system_admin') {
      ids.add(grant.userId);
    }

    if (
      grant.role === 'school_admin' &&
      report.institutionId &&
      grant.institutionId === report.institutionId
    ) {
      ids.add(grant.userId);
    }
  }

  if (report.communityId) {
    for (const member of await getMembers(report.communityId)) {
      if (member.state === 'active' && (member.role === 'owner' || member.role === 'admin')) {
        ids.add(member.userId);
      }
    }
  }

  ids.delete(report.reporterId);

  return Array.from(ids);
}

async function notifyModerators(report: Report): Promise<void> {
  await notifyMany(await moderatorIds(report), {
    type: 'report',
    title: 'New report to review',
    body: `${report.targetType} reported for ${report.reason.replace('_', ' ')}`,
    entityType: 'report',
    entityId: report.id,
    route: { pathname: '/moderation' },
  });
}

/** Can this user act on this report? Scope-based, enforced in storage. */
export async function canModerateReport(
  actorId: string | null | undefined,
  report: Report,
): Promise<boolean> {
  if (!actorId) {
    return false;
  }

  if (await isSystemStaff(actorId)) {
    return true;
  }

  if (report.communityId && (await canManageCommunity(report.communityId, actorId))) {
    return true;
  }

  if (report.institutionId) {
    return (await getGrants()).some(
      (grant) =>
        grant.userId === actorId &&
        grant.role === 'school_admin' &&
        grant.institutionId === report.institutionId,
    );
  }

  return false;
}

/** Reports the signed-in user is allowed to review. */
export async function getReportsForReview(): Promise<Report[]> {
  const actorId = await getActiveUserId();
  const all = await reports.list();
  const allowed: Report[] = [];

  for (const report of all) {
    if (await canModerateReport(actorId, report)) {
      allowed.push(report);
    }
  }

  return allowed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMyReports(): Promise<Report[]> {
  const actorId = await getActiveUserId();

  return actorId
    ? (await reports.list()).filter((item) => item.reporterId === actorId)
    : [];
}

export async function hasReported(
  targetType: ReportTargetType,
  targetId: string,
): Promise<boolean> {
  return (await getMyReports()).some(
    (item) =>
      item.targetType === targetType &&
      item.targetId === targetId &&
      item.status !== 'dismissed',
  );
}

export async function setReportStatus(
  actorId: string,
  reportId: string,
  status: ReportStatus,
  resolutionNote?: string,
): Promise<void> {
  const report = await reports.get(reportId);

  if (!report || !(await canModerateReport(actorId, report))) {
    throw new Error('You cannot review this report.');
  }

  await reports.update(reportId, {
    status,
    reviewerId: actorId,
    resolutionNote: resolutionNote?.trim() || report.resolutionNote,
    updatedAt: nowIso(),
  });

  await notifyMany([report.reporterId], {
    type: 'report',
    title:
      status === 'resolved'
        ? 'Your report was resolved'
        : status === 'dismissed'
          ? 'Your report was reviewed'
          : 'Your report is being reviewed',
    actorId,
    entityType: 'report',
    entityId: reportId,
  });
}

/**
 * Removes the reported content (post or comment) and resolves the report.
 * Permission is re-checked here, not trusted from the screen.
 */
export async function removeReportedContent(
  actorId: string,
  reportId: string,
  note?: string,
): Promise<void> {
  const report = await reports.get(reportId);

  if (!report || !(await canModerateReport(actorId, report))) {
    throw new Error('You cannot remove this content.');
  }

  if (report.targetType === 'post' || report.targetType === 'media') {
    const post = await getPost(report.targetId);

    if (post) {
      await deletePost(post.id);
      await removeReactionsForPost(post.id);
    }
  } else if (report.targetType === 'comment') {
    const comment = (await getComments()).find((item) => item.id === report.targetId);

    if (comment) {
      await deleteComment(comment.id);
    }
  } else {
    throw new Error('This kind of report cannot be actioned by removing content.');
  }

  await setReportStatus(actorId, reportId, 'resolved', note ?? 'Content removed.');
}
