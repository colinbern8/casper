import type { PublicConfig, SessionUser, Ticket, TicketCreateInput, TicketUpdateInput, UserRecord } from './types';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

/** Fired on any 401 so the app can send the person back to sign-in, wherever the call came from. */
export const UNAUTHORIZED_EVENT = 'greg:unauthorized';

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
  if (!res.ok) throw new ApiError(data.message || 'The request could not be completed.', res.status, data.error);
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
