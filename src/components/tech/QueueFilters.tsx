import React from 'react';
import { Search, X } from 'lucide-react';
import type { Ticket } from '../../types';

export interface Filters {
  search: string;
  priority: 'all' | Ticket['priority'];
  status: 'active' | 'all' | Ticket['status'];
  role: 'all' | 'teacher' | 'student' | 'staff';
  school: string;
}

export const DEFAULT_FILTERS: Filters = { search: '', priority: 'all', status: 'active', role: 'all', school: 'all' };

/** True when a ticket passes every filter. */
export function matchesFilters(t: Ticket, f: Filters): boolean {
  if (f.priority !== 'all' && t.priority !== f.priority) return false;
  if (f.status === 'active' ? t.status === 'resolved' : f.status !== 'all' && t.status !== f.status) return false;
  if (f.school !== 'all' && t.school !== f.school) return false;
  if (f.role === 'teacher' && !t.userRole.startsWith('teacher')) return false;
  if (f.role === 'student' && t.userRole !== 'student') return false;
  if (f.role === 'staff' && t.userRole !== 'staff') return false;
  const q = f.search.trim().toLowerCase();
  if (q) {
    const fields = [t.ticketNumber, t.userName, t.room, t.title, t.school, t.assetTag, t.assignedTech];
    if (!fields.some(v => v?.toLowerCase().includes(q))) return false;
  }
  return true;
}

const SELECT = 'text-xs border border-gray-400 rounded-lg px-2.5 py-1.5 bg-white text-gray-800';

export const QueueFilters: React.FC<{ filters: Filters; onChange: (f: Filters) => void; schools: string[] }> = ({ filters, onChange, schools }) => {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  return (
    <div className="p-3 border-b border-gray-200 bg-white shrink-0 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search tickets"
          placeholder="Search by ticket #, name, room or red tag..."
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-400 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-hidden focus:border-gray-600"
        />
        {filters.search && (
          <button type="button" aria-label="Clear search" onClick={() => set('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 p-0.5">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <select aria-label="Priority" value={filters.priority} onChange={e => set('priority', e.target.value as Filters['priority'])} className={SELECT}>
        <option value="all">All priorities</option>
        <option value="critical">Priority 1 (class in session)</option>
        <option value="high">Priority 2 (planning period)</option>
        <option value="medium">Priority 3</option>
      </select>
      <select aria-label="School" value={filters.school} onChange={e => set('school', e.target.value)} className={SELECT}>
        <option value="all">All schools</option>
        {schools.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <select aria-label="Requester" value={filters.role} onChange={e => set('role', e.target.value as Filters['role'])} className={SELECT}>
        <option value="all">All requesters</option>
        <option value="teacher">Teachers</option>
        <option value="student">Students</option>
        <option value="staff">Other staff</option>
      </select>
      <select aria-label="Status" value={filters.status} onChange={e => set('status', e.target.value as Filters['status'])} className={SELECT}>
        <option value="active">Not resolved</option>
        <option value="all">All statuses</option>
        <option value="open">Open</option>
        <option value="assigned">Assigned</option>
        <option value="dispatched">Dispatched</option>
        <option value="in_progress">In progress</option>
        <option value="hardware_swap">Hardware swap</option>
        <option value="resolved">Resolved</option>
      </select>
    </div>
  );
};
