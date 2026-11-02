import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SupportCase } from '../../types';
import { ApiError, fetchSelfHelpCases } from '../../api';
import { findSupportIssue } from '../../data/supportContent';
import { CaseDetailPanel } from '../CaseDetailPanel';

type Show = 'resolved,blocked' | 'resolved' | 'blocked';

const OUTCOME: Record<'resolved' | 'blocked', { label: string; className: string }> = {
  resolved: { label: 'Fixed by the steps', className: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
  blocked: { label: 'Blocked: open request limit', className: 'bg-amber-50 text-amber-900 border-amber-300' },
};

const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Student chats that ended without a ticket: fixed by the self-help steps, or blocked because the
 * student already had an open request (they were told to contact the main office or a technician).
 */
export const SelfHelpCases: React.FC = () => {
  const [show, setShow] = useState<Show>('resolved,blocked');
  const [cases, setCases] = useState<SupportCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCases(null);
    fetchSelfHelpCases(show)
      .then(c => !cancelled && setCases(c))
      .catch(err => !cancelled && setError(err instanceof ApiError ? err.message : 'Could not load the cases.'));
    return () => {
      cancelled = true;
    };
  }, [show]);

  const fixed = cases?.filter(c => c.outcome === 'resolved').length ?? 0;
  const blocked = cases?.filter(c => c.outcome === 'blocked').length ?? 0;

  return (
    <div className="sm:flex-1 flex flex-col sm:min-h-0">
      <div className="p-3 border-b border-gray-200 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-gray-800 max-w-xl">
          Student chats that ended <strong>without a ticket</strong>. "Fixed" means a self-help step worked. "Blocked" means the student already had an
          open request, so nothing was sent and they were told to contact the main office or a technician.
        </p>
        <select aria-label="Show" value={show} onChange={e => setShow(e.target.value as Show)} className="text-xs border border-gray-400 rounded-lg px-2.5 py-1.5 bg-white text-gray-800">
          <option value="resolved,blocked">Fixed and blocked</option>
          <option value="resolved">Fixed by the steps</option>
          <option value="blocked">Blocked at the limit</option>
        </select>
      </div>
      {error && <p role="alert" className="m-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{error}</p>}
      {!cases ? (
        <p className="p-6 text-xs text-gray-700">Loading...</p>
      ) : cases.length === 0 ? (
        <p className="p-8 text-center text-xs text-gray-700">No cases to show.</p>
      ) : (
        <>
          <p className="px-4 py-2 text-xs text-gray-700 bg-gray-50 border-b border-gray-200" aria-live="polite">
            {cases.length} cases: {fixed} fixed by the steps, {blocked} blocked at the request limit.
          </p>
          <ul className="sm:flex-1 sm:overflow-y-auto divide-y divide-gray-200">
            {cases.map(c => {
              const issue = findSupportIssue(c.reported.issueId);
              const o = OUTCOME[c.outcome === 'blocked' ? 'blocked' : 'resolved'];
              const worked = c.attempts.find(a => a.result === 'worked');
              return (
                <li key={c.id} className="bg-white">
                  <div className="p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-gray-900">{c.caseNumber}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-lg border ${o.className}`}>{o.label}</span>
                        <span className="text-xs text-gray-700">{c.language === 'es' ? 'Spanish' : 'English'} · {when(c.createdAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{issue?.title.en ?? c.reported.issueId}</p>
                      <p className="text-xs text-gray-700">
                        {c.student.displayName} · {c.student.school}, {c.student.room}
                        {worked && <> · fixed by: {issue?.steps.find(s => s.id === worked.stepId)?.label}</>}
                        {!worked && c.attempts.length > 0 && <> · tried {c.attempts.length} {c.attempts.length === 1 ? 'step' : 'steps'}</>}
                      </p>
                    </div>
                    <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} aria-label={`Details for ${c.caseNumber}`} className="p-1 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100">
                      {open === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  {open === c.id && <div className="px-4 pb-3 text-xs"><CaseDetailPanel caseId={c.id} /></div>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
