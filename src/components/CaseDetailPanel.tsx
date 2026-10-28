import React, { useEffect, useState } from 'react';
import type { DispositionValue, SupportCase } from '../types';
import { DISPOSITION_VALUES } from '../types';
import { ApiError, fetchSupportCase, recordDisposition } from '../api';
import { findSupportIssue } from '../data/supportContent';

const DISPOSITION_LABELS: Record<DispositionValue, string> = {
  loaner_approved: 'Loaner approved',
  in_person_check: 'Needs in-person check',
  fixed_by_technician: 'Fixed by technician',
  no_action_needed: 'No action needed',
};

const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

const Section: React.FC<{ title: string; tag?: string; children: React.ReactNode }> = ({ title, tag, children }) => (
  <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold text-gray-700">{title}</span>
      {tag && <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-1.5 py-0.5">{tag}</span>}
    </div>
    {children}
  </div>
);

/** Technician view of a student-support demo case. Technician screens stay in English. */
export const CaseDetailPanel: React.FC<{ caseId: string }> = ({ caseId }) => {
  const [data, setData] = useState<SupportCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<DispositionValue>('in_person_check');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSupportCase(caseId)
      .then(c => !cancelled && setData(c))
      .catch(err => !cancelled && setError(err instanceof ApiError ? err.message : 'Could not load the case.'));
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const record = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await recordDisposition(caseId, value, note.trim() || undefined));
      setNote('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the disposition.');
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <p role="alert" className="text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{error}</p>;
  if (!data) return <p className="text-gray-500">Loading student-support case...</p>;

  const issue = findSupportIssue(data.reported.issueId);
  const problems = [data.reported, ...(data.additionalIssues ?? [])].map(r => ({
    title: findSupportIssue(r.issueId)?.title.en ?? r.issueId,
    words: r.description,
  }));

  return (
    <div className="space-y-2 border border-blue-200 bg-blue-50/40 rounded-lg p-2.5" data-testid="case-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-gray-800">Student-support case {data.caseNumber}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-1.5 py-0.5">Prototype demo, fictional data</span>
      </div>

      <Section title="Student-reported">
        {problems.length === 1 ? (
          <p className="text-gray-800">Issue: {problems[0].title}</p>
        ) : (
          <div className="text-gray-800">
            <p>Problems reported ({problems.length}), in the order the student gave them:</p>
            <ol className="list-decimal list-inside">
              {problems.map((p, i) => (
                <li key={i}>
                  {p.title}
                  {p.words && <span className="italic text-gray-600"> - "{p.words}"</span>}
                  {i === 0 ? <span className="text-gray-500"> (had troubleshooting steps)</span> : <span className="text-gray-500"> (sent straight to a technician)</span>}
                </li>
              ))}
            </ol>
          </div>
        )}
        <p className="text-gray-800">
          Language: <strong>{data.language === 'es' ? 'Spanish' : 'English'}</strong>
          {data.language === 'es' && <span className="text-gray-500"> (the student saw Spanish text that is awaiting human review)</span>}
        </p>
        <p className="text-gray-800">Student: {data.student.displayName}{data.student.onRoster ? '' : ' (not on demo roster)'} · {data.student.school}, {data.student.room}</p>
        {problems.length === 1 && (
          <p className="text-gray-800 whitespace-pre-wrap">
            Own words: {problems[0].words ? <span className="italic">"{problems[0].words}"</span> : <span className="text-gray-400">none given</span>}
          </p>
        )}
      </Section>

      <Section title="Chromebook red tag" tag="Entered by the student, not looked up">
        {data.redTag ? (
          <>
            <p className="text-lg font-mono font-semibold text-gray-900 break-all">{data.redTag.value}</p>
            <p className="text-gray-600">Use this number to find the Chromebook, and the student it belongs to, in your own records. This app does not check it.</p>
          </>
        ) : (
          <p className="text-gray-400">The student did not enter a tag.</p>
        )}
      </Section>

      <Section title="Troubleshooting attempts">
        {data.attempts.length === 0 ? (
          <p className="text-gray-400">No steps were tried.</p>
        ) : (
          <ul className="list-disc list-inside text-gray-800">
            {data.attempts.map(a => (
              <li key={a.stepId}>
                {issue?.steps.find(s => s.id === a.stepId)?.label ?? a.stepId}: {a.result === 'worked' ? 'worked' : 'did not work'}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Technician disposition" tag="Demo decision, no real action taken">
        {data.disposition && (
          <p className="text-gray-800">
            Recorded: <strong>{DISPOSITION_LABELS[data.disposition.value]}</strong> by {data.disposition.by}, {when(data.disposition.at)}
            {data.disposition.note ? ` · "${data.disposition.note}"` : ''}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Disposition" value={value} onChange={e => setValue(e.target.value as DispositionValue)} className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white">
            {DISPOSITION_VALUES.map(v => <option key={v} value={v}>{DISPOSITION_LABELS[v]}</option>)}
          </select>
          <input aria-label="Disposition note" value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="Note (optional)" className="flex-1 min-w-[10rem] text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white" />
          <button type="button" onClick={record} disabled={busy} className="px-3 py-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg">
            {data.disposition ? 'Replace demo disposition' : 'Record demo disposition'}
          </button>
        </div>
        {error && <p role="alert" className="text-red-800">{error}</p>}
      </Section>

      <Section title="Notification draft" tag="Draft only, not sent">
        {data.notificationDraft ? (
          <div className="space-y-1">
            <p className="text-gray-600">To (fictional): {data.notificationDraft.recipient} · Language: {data.notificationDraft.language === 'es' ? 'Spanish' : 'English'}</p>
            {data.notificationDraft.spanishReview && <p className="text-amber-800">Spanish text awaiting human review.</p>}
            <p className="font-medium text-gray-800">{data.notificationDraft.subject}</p>
            <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-2">{data.notificationDraft.body}</p>
          </div>
        ) : (
          <p className="text-gray-400">A draft is created when a disposition is recorded.</p>
        )}
      </Section>

      <Section title="Confirmed external actions">
        <p className="text-gray-800">None. This prototype sends no messages and changes no outside system.</p>
      </Section>

      <Section title="Decision history">
        <ul className="text-gray-700 space-y-0.5">
          {data.history.map((h, i) => (
            <li key={i}>{when(h.at)} · {h.by} · {h.action.replace(/_/g, ' ')}{h.detail ? ` (${h.detail})` : ''}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
};
