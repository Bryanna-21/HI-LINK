/**
 * Campus-level domain models: institutions, communities, announcements,
 * events, timetable, assignments, opportunities, notifications, moderation
 * and emergency. All IDs are stable, device-generated strings so records can
 * be created offline and synced later without renumbering.
 */

import type { PostVisibility } from './post';

/* ------------------------------ Institutions ------------------------------ */

export type InstitutionType =
  | 'secondary'
  | 'university'
  | 'college'
  | 'tvet'
  | 'other';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  /** Set only when a system administrator has verified the institution. */
  verifiedBy?: string;
  verifiedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type OrgUnitKind =
  | 'school'
  | 'faculty'
  | 'department'
  | 'form'
  | 'class'
  | 'stream'
  | 'course';

/** Extensible academic hierarchy node (institution → ... → class/course). */
export interface OrgUnit {
  id: string;
  institutionId: string;
  parentId?: string;
  kind: OrgUnitKind;
  name: string;
  code?: string;
  createdAt: string;
}

/* --------------------------------- Roles ---------------------------------- */

export type GrantedRole =
  | 'teacher'
  | 'school_admin'
  | 'system_admin'
  | 'super_admin';

export interface RoleGrant {
  id: string;
  userId: string;
  role: GrantedRole;
  /** Required for teacher/school_admin; absent for system-level roles. */
  institutionId?: string;
  grantedBy: string;
  createdAt: string;
}

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected';

export interface VerificationRecord {
  id: string;
  userId: string;
  institutionId?: string;
  status: VerificationStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  note?: string;
}

/* ------------------------------- Communities ------------------------------ */

export type CommunityKind =
  | 'school'
  | 'class'
  | 'course'
  | 'department'
  | 'club'
  | 'academic'
  | 'study_group'
  | 'interest'
  | 'student_org';

export type CommunityPrivacy =
  | 'open'
  | 'request'
  | 'invite_only';

export interface Community {
  id: string;
  name: string;
  description: string;
  kind: CommunityKind;
  iconUri?: string;
  institutionId?: string;
  creatorId: string;
  privacy: CommunityPrivacy;
  guidelines?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MembershipRole = 'owner' | 'admin' | 'member';

export type MembershipState =
  | 'active'
  | 'pending'
  | 'invited'
  | 'banned';

export interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  role: MembershipRole;
  state: MembershipState;
  joinedAt: string;
  updatedAt: string;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  communityId: string;
  authorId: string;
  question: string;
  options: PollOption[];
  /** userId → optionId. One vote per member, changeable until closed. */
  votes: Record<string, string>;
  closesAt?: string;
  createdAt: string;
}

/* ------------------------------ Announcements ----------------------------- */

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export type AnnouncementAudience =
  | { kind: 'institution'; institutionId: string }
  | { kind: 'community'; communityId: string }
  | { kind: 'class'; institutionId: string; form: string; stream?: string };

export interface AnnouncementAttachment {
  uri: string;
  name?: string;
  mimeType?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  attachments: AnnouncementAttachment[];
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- Events --------------------------------- */

export type EventCategory =
  | 'academic'
  | 'sports'
  | 'social'
  | 'club'
  | 'career'
  | 'technology'
  | 'leadership'
  | 'other';

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  organizerId: string;
  /** ISO date-time. */
  startsAt: string;
  endsAt?: string;
  location?: string;
  imageUri?: string;
  category: EventCategory;
  institutionId?: string;
  communityId?: string;
  visibility: PostVisibility;
  cancelled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RsvpStatus = 'going' | 'interested' | 'not_going';

export interface EventRsvp {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  /** Minutes before start to remind; undefined = no reminder. */
  reminderMinutes?: number;
  updatedAt: string;
}

/* -------------------------------- Timetable ------------------------------- */

/** 0 = Sunday ... 6 = Saturday (matches Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimetableEntry {
  id: string;
  ownerId: string;
  day: Weekday;
  /** 24h "HH:MM". */
  start: string;
  end: string;
  subject: string;
  subjectId?: string;
  teacher?: string;
  room?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------- Assignments ------------------------------ */

export type SubmissionState =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'late'
  | 'returned'
  | 'completed';

export interface AssignmentAttachment {
  uri: string;
  name?: string;
  mimeType?: string;
}

export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  subjectName: string;
  subjectId?: string;
  teacherId: string;
  institutionId?: string;
  communityId?: string;
  form?: string;
  stream?: string;
  dueAt?: string;
  maxScore?: number;
  attachments: AssignmentAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  state: SubmissionState;
  text?: string;
  attachments: AssignmentAttachment[];
  submittedAt?: string;
  late?: boolean;
  feedback?: string;
  score?: number;
  returnedAt?: string;
  returnedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ Opportunities ----------------------------- */

export type OpportunityCategory =
  | 'internship'
  | 'job'
  | 'scholarship'
  | 'competition'
  | 'hackathon'
  | 'volunteering'
  | 'entrepreneurship'
  | 'training'
  | 'program';

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  description: string;
  eligibility: string;
  category: OpportunityCategory;
  deadline?: string;
  location?: string;
  remote: boolean;
  /** External link; if absent the in-app expression of interest is used. */
  applyUrl?: string;
  postedBy: string;
  institutionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityInterest {
  id: string;
  opportunityId: string;
  userId: string;
  note?: string;
  createdAt: string;
}

/* ------------------------------ Notifications ----------------------------- */

export type NotificationType =
  | 'message'
  | 'reaction'
  | 'comment'
  | 'follow'
  | 'follow_request'
  | 'community'
  | 'announcement'
  | 'assignment'
  | 'assessment'
  | 'timetable'
  | 'event'
  | 'emergency'
  | 'admin'
  | 'report';

export interface NotificationRoute {
  pathname: string;
  params?: Record<string, string>;
}

export interface HiLinkNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  /** Deep link opened when the notification is tapped. */
  route?: NotificationRoute;
  /** Same key replaces the earlier notification instead of duplicating it. */
  dedupeKey?: string;
  createdAt: string;
  readAt?: string;
}

/* -------------------------------- Moderation ------------------------------ */

export type ReportTargetType =
  | 'post'
  | 'comment'
  | 'message'
  | 'account'
  | 'community'
  | 'media';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'hate'
  | 'scam'
  | 'impersonation'
  | 'academic_misconduct'
  | 'other';

export type ReportStatus =
  | 'pending'
  | 'reviewing'
  | 'resolved'
  | 'dismissed';

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  /** Owner of the reported content, when known. */
  targetOwnerId?: string;
  /** Scope used to route the report to the right moderators. */
  institutionId?: string;
  communityId?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  reviewerId?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------- Emergency ------------------------------- */

export type EmergencyCategory =
  | 'medical'
  | 'security'
  | 'fire'
  | 'accident'
  | 'harassment'
  | 'other';

export type EmergencyStatus =
  | 'reported'
  | 'acknowledged'
  | 'responder_assigned'
  | 'responding'
  | 'arrived'
  | 'resolved'
  | 'cancelled';

export interface EmergencyStatusChange {
  status: EmergencyStatus;
  at: string;
  byUserId: string;
  note?: string;
}

export interface EmergencyRequest {
  id: string;
  requesterId: string;
  institutionId?: string;
  category: EmergencyCategory;
  description?: string;
  /**
   * Where the student says they are. Always self-reported text: the app has
   * no GPS capability, so coordinates are never fabricated.
   */
  locationText?: string;
  status: EmergencyStatus;
  responderId?: string;
  /** Minutes, entered by the responder. Never estimated by the app. */
  etaMinutes?: number;
  history: EmergencyStatusChange[];
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  institutionId: string;
  label: string;
  phone: string;
  kind: 'school' | 'infirmary' | 'hospital' | 'police' | 'fire' | 'other';
  createdBy: string;
  createdAt: string;
}
