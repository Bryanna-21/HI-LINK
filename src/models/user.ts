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

  createdAt: string;
  updatedAt: string;
}
