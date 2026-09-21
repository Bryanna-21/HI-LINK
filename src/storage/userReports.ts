import { UserReport } from '../models/userReport';
import { getLocal, setLocal } from './localStore';

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
