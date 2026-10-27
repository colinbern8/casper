/** What someone is allowed to do in the app. Students are the default for anyone in the domain. */
export type Role = 'student' | 'staff' | 'tech' | 'admin';

/** What a ticket records about the requester's situation. */
export type UserRole = 'teacher_active' | 'teacher_prep' | 'staff' | 'student';

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
}

export interface UserRecord {
  email: string;
  role: Exclude<Role, 'student'>;
  addedBy: string;
  addedAt: string;
  locked?: boolean;
}

export type IssueCategory =
  | 'smartboard'
  | 'chromebook'
  | 'audio_video'
  | 'printer'
  | 'network'
  | 'account'
  | 'other';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';

export type TicketStatus =
  | 'open'
  | 'assigned'
  | 'dispatched'
  | 'in_progress'
  | 'hardware_swap'
  | 'resolved';

export const ISSUE_CATEGORIES: IssueCategory[] = ['smartboard', 'chromebook', 'audio_video', 'printer', 'network', 'account', 'other'];
export const TICKET_PRIORITIES: TicketPriority[] = ['critical', 'high', 'medium', 'low'];
export const TICKET_STATUSES: TicketStatus[] = ['open', 'assigned', 'dispatched', 'in_progress', 'hardware_swap', 'resolved'];

export interface UserContext {
  role: UserRole;
  userName: string;
  userEmail: string;
  school: string;
  room: string;
  phoneOrExt: string;
  deviceType?: IssueCategory;
  assetTag?: string;
}

export interface Ticket {
  /** Unguessable UUID. Knowing it is what lets a requester view their own ticket. */
  id: string;
  ticketNumber: string;
  createdAt: string;
  userRole: UserRole;
  userName: string;
  userEmail: string;
  school: string;
  room: string;
  phoneOrExt?: string;
  category: IssueCategory;
  deviceModel?: string;
  assetTag?: string;
  title: string;
  description: string;
  troubleshootStepsAttempted: string[];
  priority: TicketPriority;
  priorityReason: string;
  status: TicketStatus;
  assignedTech?: string;
  techNotes?: string;
  teacherAvailability?: string;
  resolvedAt?: string;
  /** Set when the ticket was escalated from a student-support demo case. */
  caseId?: string;
}

/**
 * What a client may send when opening a ticket. Who they are comes from the
 * signed-in session, never from this body.
 */
export interface TicketCreateInput {
  /** Situation only: class in session, planning period, or other staff. Ignored for students. */
  userRole: UserRole;
  school: string;
  room: string;
  phoneOrExt?: string;
  category: IssueCategory;
  assetTag?: string;
  deviceModel?: string;
  title: string;
  description: string;
  troubleshootStepsAttempted?: string[];
  teacherAvailability?: string;
}

/** Fields a technician may change on an existing ticket. */
export interface TicketUpdateInput {
  status?: TicketStatus;
  assignedTech?: string;
  /** Appended (with a timestamp) to the ticket's notes by the server. */
  addNote?: string;
  priority?: TicketPriority;
}

export interface PublicConfig {
  /** Google OAuth client ID for the sign-in button. */
  googleClientId?: string;
  devLogin: boolean;
  demoMode: boolean;
  domain: string;
  districtName: string;
}

// ---- Student-support demo (bilingual prototype) ---------------------------------

export type Language = 'en' | 'es';
export const LANGUAGES: Language[] = ['en', 'es'];

/** 'prototype' = written for the demo, no district sign-off. 'awaiting_human_review' = draft that still needs a person. */
export type ReviewStatus = 'prototype' | 'awaiting_human_review';

export type SupportIssueId = 'wifi' | 'power' | 'login' | 'damaged';
export const SUPPORT_ISSUE_IDS: SupportIssueId[] = ['wifi', 'power', 'login', 'damaged'];

export interface LocalizedText {
  en: string;
  es: string;
}

export interface SupportStep {
  id: string;
  /** Short English label for technician screens and tickets, whatever language the student used. */
  label: string;
  text: LocalizedText;
}

export interface SupportIssue {
  id: SupportIssueId;
  title: LocalizedText;
  /** One short line shown on the menu button. */
  blurb: LocalizedText;
  /** Ticket category used if the case is escalated. */
  category: IssueCategory;
  /** Shown instead of steps when the device should not be self-repaired. */
  escalateOnly?: LocalizedText;
  steps: SupportStep[];
  review: Record<Language, ReviewStatus>;
}

export type SupportOutcome = 'open' | 'resolved' | 'escalated';

export type DeviceCheckResult = 'match' | 'mismatch' | 'unknown_tag' | 'no_assignment';

/** SIMULATED lookup against a fictional fixture. Not connected to any district system. */
export interface DeviceCheck {
  simulated: true;
  enteredTag: string;
  result: DeviceCheckResult;
  /** Technician-only: the tag the fixture says is assigned to this student. */
  expectedTag?: string;
  checkedAt: string;
}

export interface SupportAttempt {
  stepId: string;
  result: 'worked' | 'not_worked';
  at: string;
}

export type DispositionValue = 'loaner_approved' | 'in_person_check' | 'fixed_by_technician' | 'no_action_needed';
export const DISPOSITION_VALUES: DispositionValue[] = ['loaner_approved', 'in_person_check', 'fixed_by_technician', 'no_action_needed'];

/** A technician's DEMO decision. Recording it performs no real-world action. */
export interface DemoDisposition {
  demo: true;
  value: DispositionValue;
  note?: string;
  by: string;
  at: string;
}

/** A message that has been drafted and NOT sent. Nothing in this prototype sends it. */
export interface NotificationDraft {
  status: 'draft_unsent';
  audience: 'student';
  language: Language;
  /** Fictional demo address. */
  recipient: string;
  subject: string;
  body: string;
  /** Spanish drafts need a person to check them before any real use. */
  spanishReview?: 'awaiting_human_review';
  generatedAt: string;
}

/** Minimal decision history: who changed the case's state, and when. */
export interface CaseHistoryEntry {
  at: string;
  by: string;
  action: 'case_started' | 'device_checked' | 'resolved' | 'escalated' | 'disposition_recorded';
  detail?: string;
}

export interface SupportCase {
  id: string;
  caseNumber: string;
  createdAt: string;
  updatedAt: string;
  language: Language;
  student: { email: string; displayName: string; school: string; room: string; onRoster: boolean };
  /** What the student said, as entered. */
  reported: { issueId: SupportIssueId; description?: string };
  deviceCheck?: DeviceCheck;
  attempts: SupportAttempt[];
  outcome: SupportOutcome;
  ticketId?: string;
  ticketNumber?: string;
  disposition?: DemoDisposition;
  notificationDraft?: NotificationDraft;
  history: CaseHistoryEntry[];
}

/** What the student's own browser may see: no technician fields, no expected tag. */
export type StudentCaseView = Omit<SupportCase, 'disposition' | 'notificationDraft' | 'history' | 'deviceCheck'> & {
  deviceCheck?: Omit<DeviceCheck, 'expectedTag'>;
};
