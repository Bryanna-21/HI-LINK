export type PostReportReason =
  | 'spam'
  | 'bullying'
  | 'inappropriate'
  | 'hate'
  | 'academic_misconduct'
  | 'other';

export interface PostReport {
  id: string;
  postId: string;

  reporterId: string;
  reporterName: string;

  reason: PostReportReason;
  details?: string;

  createdAt: string;
}
