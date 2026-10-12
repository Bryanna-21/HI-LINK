export type HiLinkRole =
  | 'student'
  | 'teacher'
  | 'principal'
  | 'school_admin';

export type BoardingStatus =
  | 'boarding'
  | 'day'
  | 'unknown';

export interface HiLinkUser {
  id: string;
  hilinkId: string;
  name: string;
  username: string;

  bio?: string;

  role: HiLinkRole;

  schoolId?: string;
  schoolName?: string;

  form?: string;
  stream?: string;
  className?: string;

  subjects?: string[];

  clubs?: string[];
  societies?: string[];
  interests?: string[];
  sports?: string[];

  followersCount?: number;
  followingCount?: number;

  admissionNumber?: string;
  studentId?: string;
  staffNumber?: string;

  boardingStatus?: BoardingStatus;
  house?: string;

  avatarUri?: string;
  coverUri?: string;

  /**
   * Private accounts approve followers. Everything else is open-follow.
   * Defaults to public when absent so existing profiles are unchanged.
   */
  isPrivate?: boolean;

  /** Skills shown on the profile portfolio (projects etc. live in portfolio.ts). */
  skills?: string[];

  createdAt: string;
  updatedAt: string;
}
