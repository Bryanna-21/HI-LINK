import { PostReport } from '../models/report';
import { getLocal, setLocal } from './localStore';

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
