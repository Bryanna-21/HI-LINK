import { UserReport } from '../models/userReport';
import { getLocal, setLocal } from './localStore';
import { submitReport } from './moderation';
import { getUsers } from './users';

const USER_REPORTS_KEY = 'user_reports';

export async function getUserReports(): Promise<UserReport[]> {
  return getLocal<UserReport[]>(
    USER_REPORTS_KEY,
    [],
  );
}

export async function addUserReport(
  report: UserReport,
): Promise<void> {
  const reports = await getUserReports();

  await setLocal(
    USER_REPORTS_KEY,
    [...reports, report],
  );

  const reported = (await getUsers()).find(
    (user) => user.id === report.reportedUserId,
  );

  await submitReport(report.reporterId, {
    targetType: 'account',
    targetId: report.reportedUserId,
    reason:
      report.reason === 'bullying'
        ? 'harassment'
        : report.reason === 'impersonation'
          ? 'impersonation'
          : report.reason === 'hate'
            ? 'hate'
            : report.reason === 'inappropriate'
              ? 'inappropriate'
              : report.reason === 'spam'
                ? 'spam'
                : 'other',
    targetOwnerId: report.reportedUserId,
    institutionId: reported?.schoolId,
  });
}

export async function hasReportedUser(
  reportedUserId: string,
  reporterId: string,
): Promise<boolean> {
  const reports = await getUserReports();

  return reports.some(
    (report) =>
      report.reportedUserId === reportedUserId &&
      report.reporterId === reporterId,
  );
}
