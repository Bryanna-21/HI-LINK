export type UserReportReason =
  | 'spam'
  | 'bullying'
  | 'inappropriate'
  | 'hate'
  | 'impersonation'
  | 'other';

export interface UserReport {
  id: string;
  reportedUserId: string;
  reportedUsername: string;

  reporterId: string;
  reporterName: string;

  reason: UserReportReason;
  createdAt: string;
}
