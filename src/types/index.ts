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

export const USER_ROLES: UserRole[] = ['teacher_active', 'teacher_prep', 'staff', 'student'];
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
  periodOrTime?: string;
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
}
