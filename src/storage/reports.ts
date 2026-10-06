import { PostReport } from '../models/report';
import { getLocal, setLocal } from './localStore';
import { submitReport } from './moderation';
import { getPost } from './posts';

const REPORTS_KEY = 'post_reports';

export async function getReports(): Promise<PostReport[]> {
  return getLocal<PostReport[]>(
    REPORTS_KEY,
    [],
  );
}

export async function saveReports(
  reports: PostReport[],
): Promise<void> {
  await setLocal(
    REPORTS_KEY,
    reports,
  );
}

export async function addReport(
  report: PostReport,
): Promise<void> {
  const reports = await getReports();

  await saveReports([
    ...reports,
    report,
  ]);

  // Mirror into the unified moderation queue so reviewers see it.
  const post = await getPost(report.postId);

  await submitReport(report.reporterId, {
    targetType: 'post',
    targetId: report.postId,
    reason:
      report.reason === 'bullying'
        ? 'harassment'
        : report.reason === 'hate'
          ? 'hate'
          : report.reason === 'academic_misconduct'
            ? 'academic_misconduct'
            : report.reason === 'inappropriate'
              ? 'inappropriate'
              : report.reason === 'spam'
                ? 'spam'
                : 'other',
    description: report.details,
    targetOwnerId: post?.authorId,
    institutionId: post?.schoolId,
    communityId: post?.communityId,
  });
}

export async function hasReportedPost(
  postId: string,
  reporterId: string,
): Promise<boolean> {
  const reports = await getReports();

  return reports.some(
    (report) =>
      report.postId === postId &&
      report.reporterId === reporterId,
  );
}
