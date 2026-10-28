import React, { useCallback, useEffect, useState } from 'react';
import type { SessionUser, Ticket, UserRecord } from '../types';
import { ApiError, fetchAllTickets, importStaff, listUsers, removeUser, setUserRole } from '../api';

type StaffRole = UserRecord['role'];
const ROLE_LABELS: Record<StaffRole, string> = { staff: 'Teacher / staff', tech: 'Technician', admin: 'Admin' };

interface AdminPageProps {
  user: SessionUser;
  domain: string;
}

export const AdminPage: React.FC<AdminPageProps> = ({ user, domain }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('tech');
  const [importText, setImportText] = useState('');
  const [filter, setFilter] = useState('');

  const fail = (err: unknown) => setError(err instanceof ApiError ? err.message : 'Something went wrong.');

  const refresh = useCallback(async () => {
    try {
      const [u, t] = await Promise.all([listUsers(), fetchAllTickets()]);
      setUsers(u);
      setTickets(t);
    } catch (err) {
      fail(err);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setError(null);
    setMessage(null);
    try {
      await fn();
      if (done) setMessage(done);
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const open = tickets.filter(t => t.status !== 'resolved');
  const stats: [string, number][] = [
    ['Open requests', open.length],
    ['Priority 1 open', open.filter(t => t.priority === 'critical').length],
    ['Student loaners open', open.filter(t => t.userRole === 'student').length],
    ['Total tickets', tickets.length],
  ];

  const shown = users.filter(u => u.email.includes(filter.trim().toLowerCase()));
  const field = 'border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-900';

  return (
    <div className="w-full h-full overflow-y-auto space-y-4 pb-4 text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-3">
            <span className="text-gray-500 block text-[11px] font-medium uppercase tracking-wider">{label}</span>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {error && <div role="alert" className="text-red-800 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{error}</div>}
      {message && <div className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">{message}</div>}

      <section className="bg-white border border-gray-300 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">People and roles</h2>
          <p className="text-gray-500 mt-0.5">
            Everyone with an @{domain} account is a student unless listed here. Role changes take effect immediately.
          </p>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            run(() => setUserRole(newEmail.trim().toLowerCase(), newRole), `Saved ${newEmail.trim()} as ${ROLE_LABELS[newRole]}.`).then(() => setNewEmail(''));
          }}
          className="p-4 flex flex-wrap items-end gap-2 border-b border-gray-100"
        >
          <label className="flex flex-col gap-1">
            <span className="text-gray-700 font-medium">Add or change a person</span>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder={`name@${domain}`} className={`${field} w-64`} type="email" required />
          </label>
          <select aria-label="Role" value={newRole} onChange={e => setNewRole(e.target.value as StaffRole)} className={field}>
            {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button type="submit" className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold">Save</button>
        </form>

        <div className="p-4 border-b border-gray-100 space-y-2">
          <label htmlFor="import-list" className="text-gray-700 font-medium block">Import teachers and staff</label>
          <p className="text-gray-500">
            Paste a list or the contents of a Google Admin console user export. Only @{domain} addresses are added, as Teacher / staff. People who already have a role are not changed.
          </p>
          <textarea id="import-list" value={importText} onChange={e => setImportText(e.target.value)} rows={3} className={`${field} w-full font-mono`} />
          <button
            type="button" disabled={!importText.trim()}
            onClick={() =>
              run(async () => {
                const r = await importStaff(importText);
                setImportText('');
                setMessage(`Added ${r.added}, already had a role ${r.skipped}, ignored ${r.ignoredOutsideDomain} outside @${domain}.`);
              })
            }
            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            Import
          </button>
        </div>

        <div className="p-4 space-y-2">
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search people with a role..." className={`${field} w-full sm:w-72`} aria-label="Search" />
          {users.length === 0 ? (
            <p className="text-gray-500 py-4">Nobody has a role yet. Everyone is a student.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-200">
                    <th className="py-1.5 pr-3 font-medium">Email</th>
                    <th className="py-1.5 pr-3 font-medium">Role</th>
                    <th className="py-1.5 pr-3 font-medium">Added by</th>
                    <th className="py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map(u => {
                    const self = u.email === user.email;
                    const frozen = u.locked || self;
                    return (
                      <tr key={u.email} className="border-b border-gray-100">
                        <td className="py-1.5 pr-3 text-gray-900">{u.email}{self && <span className="text-gray-400"> (you)</span>}</td>
                        <td className="py-1.5 pr-3">
                          <select
                            aria-label={`Role for ${u.email}`} value={u.role} disabled={frozen} className={field}
                            onChange={e => run(() => setUserRole(u.email, e.target.value as StaffRole))}
                          >
                            {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 pr-3 text-gray-500">{u.locked ? 'Server setting (locked)' : u.addedBy}</td>
                        <td className="py-1.5 text-right">
                          {!frozen && (
                            <button type="button" onClick={() => run(() => removeUser(u.email), `Removed ${u.email}. They are now a student.`)} className="text-red-700 hover:text-red-900 underline">
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
