import React, { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import type { TechnicianStatus, Ticket, TicketUpdateInput } from '../types';
import { ApiError, fetchTechs, setAway } from '../api';
import { POLL_MS } from '../data/limits';
import { studentDigest } from '../data/messagePreviews';
import { DEFAULT_FILTERS, QueueFilters, isUnclaimed, matchesFilters, type Filters } from './tech/QueueFilters';
import { TicketRow } from './tech/TicketRow';
import { SelfHelpCases } from './tech/SelfHelpCases';
import { Coverage } from './tech/Coverage';
import { MessagePreviewDialog } from './MessagePreviewDialog';

interface TechnicianConsoleProps {
  districtName: string;
  tickets: Ticket[];
  onRefresh: () => Promise<void>;
  onUpdateTicket: (id: string, updates: TicketUpdateInput) => Promise<void>;
  onClaimTicket: (id: string) => Promise<void>;
  onViewDispatchSlip: (ticket: Ticket) => void;
  /** Self-help cases exist only with the student-support chat (demo mode). */
  showSelfHelp: boolean;
}

type Tab = 'queue' | 'selfhelp';

const isToday = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString();

export const TechnicianConsole: React.FC<TechnicianConsoleProps> = ({ districtName, tickets, onRefresh, onUpdateTicket, onClaimTicket, onViewDispatchSlip, showSelfHelp }) => {
  const [tab, setTab] = useState<Tab>('queue');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [techs, setTechs] = useState<{ me: string; technicians: TechnicianStatus[] } | null>(null);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [digestOpen, setDigestOpen] = useState(false);

  const loadTechs = useCallback(async () => {
    try {
      setTechs(await fetchTechs());
      setCoverageError(null);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setCoverageError('Could not load who is away.');
    }
  }, []);
  useEffect(() => {
    void loadTechs();
  }, [loadTechs]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([onRefresh(), loadTechs()]);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAway = async (away: boolean) => {
    try {
      await setAway(away);
      await loadTechs();
    } catch (err) {
      setCoverageError(err instanceof ApiError ? err.message : 'Could not change your status.');
    }
  };

  const me = techs?.me ?? '';
  const awayNames = new Set(techs?.technicians.filter(t => t.away).map(t => t.name));
  const isAway = (name: string) => awayNames.has(name);
  const active = tickets.filter(t => t.status !== 'resolved');
  const stats: Array<{ label: string; value: number; alert?: boolean }> = [
    { label: 'Not resolved', value: active.length },
    { label: 'Priority 1 open', value: active.filter(t => t.priority === 'critical').length, alert: true },
    { label: 'Assigned to me', value: active.filter(t => t.assignedTech === me).length },
    { label: 'Resolved today', value: tickets.filter(t => t.status === 'resolved' && isToday(t.resolvedAt)).length },
  ];
  const shown = tickets.filter(t => matchesFilters(t, filters, me, isAway));
  const schools = Array.from(new Set(tickets.map(t => t.school))).sort();
  const sharedQueues = schools.map(school => ({ school, count: tickets.filter(t => t.school === school && isUnclaimed(t, isAway)).length }));
  const tabClass = (t: Tab) => `px-3 py-1.5 text-sm font-medium rounded-full border ${tab === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-50'}`;

  return (
    // On phones the whole console scrolls (the header blocks would leave no room for the list);
    // on wider screens only the list scrolls.
    <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-200 rounded-lg overflow-y-auto sm:overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Technician queue</h2>
          <p className="text-xs text-gray-700 mt-0.5">{districtName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showSelfHelp && (
            <div role="tablist" aria-label="Technician views" className="flex gap-1.5">
              <button type="button" role="tab" aria-selected={tab === 'queue'} onClick={() => setTab('queue')} className={tabClass('queue')}>Tickets</button>
              <button type="button" role="tab" aria-selected={tab === 'selfhelp'} onClick={() => setTab('selfhelp')} className={tabClass('selfhelp')}>Student self-help</button>
            </div>
          )}
          <button type="button" onClick={() => setDigestOpen(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-800 bg-white border border-gray-400 rounded-lg hover:bg-gray-50">
            <Mail className="w-3.5 h-3.5" aria-hidden="true" />Student digest preview
          </button>
          <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-800 bg-white border border-gray-400 rounded-lg hover:bg-gray-50 disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <Coverage techs={techs} error={coverageError} onToggleAway={toggleAway} />

      {tab === 'selfhelp' ? (
        <SelfHelpCases />
      ) : (
        <>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 border-b border-gray-200 shrink-0 text-xs">
            {stats.map(s => (
              <div key={s.label} className={`rounded-lg p-2.5 border ${s.alert && s.value > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                <dt className={`font-medium ${s.alert && s.value > 0 ? 'text-red-800' : 'text-gray-700'}`}>{s.label}</dt>
                <dd className="text-lg font-bold text-gray-900 mt-0.5">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="px-3 pt-2.5 bg-white flex flex-wrap items-center gap-1.5 text-xs" aria-label="Shared queues by school">
            <span className="text-gray-800 font-medium mr-1">Shared queues:</span>
            {sharedQueues.map(q => {
              const on = filters.who === 'unclaimed' && filters.school === q.school;
              return (
                <button
                  key={q.school}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilters(on ? DEFAULT_FILTERS : { ...DEFAULT_FILTERS, school: q.school, who: 'unclaimed' })}
                  className={`px-2.5 py-1 rounded-full border ${on ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-50'}`}
                >
                  {q.school} <span className="font-semibold">({q.count})</span>
                </button>
              );
            })}
          </div>

          <QueueFilters filters={filters} onChange={setFilters} schools={schools} />

          <div className="sm:flex-1 sm:overflow-y-auto">
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
                    me={me}
                    isAway={isAway}
                    onClaim={onClaimTicket}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-700 shrink-0">
            <span>Showing {shown.length} of {tickets.length} tickets</span>
            <span>Refreshes every {POLL_MS.techQueue / 1000} seconds</span>
          </div>
        </>
      )}

      {digestOpen && <MessagePreviewDialog title="Student request digest preview" preview={studentDigest(tickets)} onClose={() => setDigestOpen(false)} />}
    </div>
  );
};
