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

  faculty?: string;
  course?: string;
  yearOfStudy?: string;

  clubs?: string[];
  societies?: string[];
  interests?: string[];

  followersCount?: number;
  followingCount?: number;

  admissionNumber?: string;
  studentId?: string;
  staffNumber?: string;

  form?: string;
  stream?: string;
  className?: string;

  boardingStatus?: BoardingStatus;
  house?: string;

  avatarUri?: string;
  coverUri?: string;

  createdAt: string;
  updatedAt: string;
}
