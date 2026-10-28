import type {
  DispositionValue, Language, PublicConfig, SessionUser, StudentCaseView, SupportCase, SupportIssueId,
  Ticket, TicketCreateInput, TicketUpdateInput, UserRecord,
} from './types';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: Record<string, unknown>) {
    super(message);
  }
}

/** Fired on any 401 so the app can send the person back to sign-in, wherever the call came from. */
export const UNAUTHORIZED_EVENT = 'casper:unauthorized';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the help desk server. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/auth/me') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  if (!res.ok) throw new ApiError(data.message || 'The request could not be completed.', res.status, data.error, data);
  return data as T;
}

export const getConfig = () => request<PublicConfig>('GET', '/api/config');
export const getMe = async () => (await request<{ user: SessionUser | null }>('GET', '/api/auth/me')).user;
export const loginGoogle = async (credential: string) => (await request<{ user: SessionUser }>('POST', '/api/auth/google', { credential })).user;
export const loginDev = async (email: string, name?: string) => (await request<{ user: SessionUser }>('POST', '/api/auth/dev', { email, name })).user;
export const logout = () => request<{ ok: true }>('POST', '/api/auth/logout', {});

export const createTicket = (input: TicketCreateInput) => request<Ticket>('POST', '/api/tickets', input);
export const fetchMyTickets = () => request<Ticket[]>('GET', '/api/tickets/mine');
export const fetchAllTickets = () => request<Ticket[]>('GET', '/api/tickets');
export const updateTicket = (id: string, patch: TicketUpdateInput) => request<Ticket>('PATCH', `/api/tickets/${id}`, patch);

export const listUsers = () => request<UserRecord[]>('GET', '/api/admin/users');
export const setUserRole = (email: string, role: UserRecord['role']) => request<UserRecord>('PUT', `/api/admin/users/${encodeURIComponent(email)}`, { role });
export const removeUser = (email: string) => request<{ ok: true }>('DELETE', `/api/admin/users/${encodeURIComponent(email)}`);
export const importStaff = (text: string) =>
  request<{ added: number; skipped: number; ignoredOutsideDomain: number }>('POST', '/api/admin/users/import', { text });

// ---- Student-support prototype (demo mode only) ---------------------------------
export const getSupportLimit = () =>
  request<{ atLimit: boolean; openTicketNumbers: string[] }>('GET', '/api/support/limit');
export const createSupportCase = (input: { language: Language; issueId: SupportIssueId; description?: string }) =>
  request<StudentCaseView>('POST', '/api/support/cases', input);
export const recordRedTag = (id: string, tag: string) =>
  request<StudentCaseView>('POST', `/api/support/cases/${id}/red-tag`, { tag });
export const addSupportIssue = (id: string, issueId: SupportIssueId, description?: string) =>
  request<StudentCaseView>('POST', `/api/support/cases/${id}/issues`, { issueId, description });
export const recordSupportAttempt = (id: string, stepId: string, result: 'worked' | 'not_worked') =>
  request<StudentCaseView>('POST', `/api/support/cases/${id}/attempts`, { stepId, result });
export const escalateSupportCase = (id: string, reason: string) =>
  request<{ case: StudentCaseView; ticket: Ticket }>('POST', `/api/support/cases/${id}/escalate`, { reason });
/** Technician view: includes the red tag, history, disposition and draft. */
export const fetchSupportCase = (id: string) => request<SupportCase>('GET', `/api/support/cases/${id}`);
export const recordDisposition = (id: string, value: DispositionValue, note?: string) =>
  request<SupportCase>('POST', `/api/support/cases/${id}/disposition`, { value, note });

/** The built-in help chat's reply. Safety-blocked and rate-limited replies use the same shape. */
export interface ChatReplyBody {
  text: string;
  isSafetyBlocked?: boolean;
  needsEscalation?: boolean;
  suggestedActions?: string[];
}
/** A 429 rejects with an ApiError whose `details` carry `text` and `cooldownSeconds`. */
export const sendChat = (messages: { role: 'user' | 'model'; content: string }[], userContext: Record<string, unknown>) =>
  request<ChatReplyBody>('POST', '/api/chat', { messages, userContext });
