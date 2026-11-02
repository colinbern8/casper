import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { Ticket, TicketUpdateInput } from '../types';
import { POLL_MS } from '../data/limits';
import { DEFAULT_FILTERS, QueueFilters, matchesFilters, type Filters } from './tech/QueueFilters';
import { TicketRow } from './tech/TicketRow';

interface TechnicianConsoleProps {
  districtName: string;
  tickets: Ticket[];
  onRefresh: () => Promise<void>;
  onUpdateTicket: (id: string, updates: TicketUpdateInput) => Promise<void>;
  onViewDispatchSlip: (ticket: Ticket) => void;
}

const isToday = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString();

export const TechnicianConsole: React.FC<TechnicianConsoleProps> = ({ districtName, tickets, onRefresh, onUpdateTicket, onViewDispatchSlip }) => {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const active = tickets.filter(t => t.status !== 'resolved');
  const stats: Array<{ label: string; value: number; alert?: boolean }> = [
    { label: 'Not resolved', value: active.length },
    { label: 'Priority 1 open', value: active.filter(t => t.priority === 'critical').length, alert: true },
    { label: 'Student requests open', value: active.filter(t => t.userRole === 'student').length },
    { label: 'Resolved today', value: tickets.filter(t => t.status === 'resolved' && isToday(t.resolvedAt)).length },
  ];
  const shown = tickets.filter(t => matchesFilters(t, filters));
  const schools = Array.from(new Set(tickets.map(t => t.school))).sort();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Technician queue</h2>
          <p className="text-xs text-gray-700 mt-0.5">{districtName}</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-800 bg-white border border-gray-400 rounded-lg hover:bg-gray-50 disabled:opacity-60">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 border-b border-gray-200 shrink-0 text-xs">
        {stats.map(s => (
          <div key={s.label} className={`rounded-lg p-2.5 border ${s.alert && s.value > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
            <dt className={`font-medium ${s.alert && s.value > 0 ? 'text-red-800' : 'text-gray-700'}`}>{s.label}</dt>
            <dd className="text-lg font-bold text-gray-900 mt-0.5">{s.value}</dd>
          </div>
        ))}
      </dl>

      <QueueFilters filters={filters} onChange={setFilters} schools={schools} />

      <div className="flex-1 overflow-y-auto">
        {shown.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-700">No tickets match these filters.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {shown.map(t => (
              <TicketRow
                key={t.id}
                ticket={t}
                expanded={expanded === t.id}
                onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                onUpdate={onUpdateTicket}
                onViewDispatchSlip={onViewDispatchSlip}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-700 shrink-0">
        <span>Showing {shown.length} of {tickets.length} tickets</span>
        <span>Refreshes every {POLL_MS.techQueue / 1000} seconds</span>
      </div>
    </div>
  );
};
