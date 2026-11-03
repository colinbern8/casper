import React from 'react';
import { AlertTriangle, Check, Clock } from 'lucide-react';
import type { Ticket, TicketStatus } from '../../types';

const PILL = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border';

/** Priority in words and colour, with an icon for the two urgent levels. */
export const PriorityBadge: React.FC<{ ticket: Pick<Ticket, 'priority' | 'userRole'> }> = ({ ticket }) => {
  if (ticket.priority === 'critical')
    return <span className={`${PILL} font-semibold bg-red-100 text-red-800 border-red-300`}><AlertTriangle className="w-3 h-3" aria-hidden="true" />Priority 1 · class in session</span>;
  if (ticket.priority === 'high')
    return <span className={`${PILL} bg-amber-100 text-amber-900 border-amber-300`}><Clock className="w-3 h-3" aria-hidden="true" />Priority 2 · planning period</span>;
  if (ticket.userRole === 'student') return <span className={`${PILL} bg-blue-100 text-blue-900 border-blue-300`}>Student request</span>;
  return <span className={`${PILL} bg-gray-100 text-gray-800 border-gray-300`}>Priority 3</span>;
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  dispatched: 'Dispatched (on the way)',
  in_progress: 'In progress',
  hardware_swap: 'Hardware swap or loaner',
  resolved: 'Resolved',
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  open: 'bg-gray-100 text-gray-800 border-gray-300',
  assigned: 'bg-blue-50 text-blue-800 border-blue-200',
  dispatched: 'bg-red-50 text-red-800 border-red-200',
  in_progress: 'bg-purple-50 text-purple-800 border-purple-200',
  hardware_swap: 'bg-amber-50 text-amber-900 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => (
  <span className={`${PILL} ${STATUS_CLASS[status]}`}>
    {status === 'resolved' && <Check className="w-3 h-3" aria-hidden="true" />}
    {STATUS_LABELS[status]}
  </span>
);

export const requesterKind = (t: Pick<Ticket, 'userRole'>) => (t.userRole.startsWith('teacher') ? 'Teacher' : t.userRole === 'student' ? 'Student' : 'Staff');
