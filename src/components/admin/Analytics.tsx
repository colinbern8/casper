import React, { useEffect, useState } from 'react';
import type { AnalyticsSummary, IssueCategory, TicketPriority } from '../../types';
import { ApiError, fetchAnalytics } from '../../api';
import { formatHours } from '../../data/format';

/**
 * Admin analytics on the demo data. Built by the dataviz method: form first, color by job, thin marks,
 * value labels at the bar tips, a legend whenever there are two or more series, and a table view for
 * every chart. Categorical slots validated with the skill's validator (blue, orange, aqua: adjacent
 * pairs pass CVD and normal-vision checks; aqua is under 3:1 on white, so its values are always printed).
 */
const COLOR = { slot1: '#2a78d6', slot2: '#eb6834', slot3: '#1baf7a', grid: '#e1e0d9' } as const;

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  smartboard: 'Classroom display',
  chromebook: 'Chromebook',
  audio_video: 'Audio and video',
  printer: 'Printer and copier',
  network: 'Wi-Fi and network',
  account: 'Accounts and sign-in',
  other: 'Other',
};
const PRIORITY_LABEL: Record<TicketPriority, string> = {
  critical: 'Priority 1 (class in session)',
  high: 'Priority 2 (planning period)',
  medium: 'Priority 3 (staff and students)',
  low: 'Low',
};

interface Segment {
  name: string;
  value: number;
  color: string;
}
interface Row {
  label: string;
  segments: Segment[];
  /** Printed at the bar tip. */
  tip: string;
}

/** Horizontal bars on one baseline: 20px thick, 2px surface gap between segments, 4px rounded data end. */
const HBars: React.FC<{ rows: Row[]; title: string }> = ({ rows, title }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map(r => r.segments.reduce((n, s) => n + s.value, 0)));
  return (
    <ul className="space-y-2.5" aria-label={title}>
      {rows.map((r, i) => {
        const total = r.segments.reduce((n, s) => n + s.value, 0);
        const detail = r.segments.length > 1 ? r.segments.map(s => `${s.name} ${s.value}`).join(', ') : r.tip;
        return (
          <li
            key={r.label}
            tabIndex={0}
            aria-label={`${r.label}: ${detail}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className={`relative grid grid-cols-1 sm:grid-cols-[minmax(7rem,10rem)_1fr] items-center gap-x-3 gap-y-1 rounded-md px-1 py-0.5 outline-offset-2 ${hover === i ? 'bg-gray-50' : ''}`}
          >
            <span className="text-xs text-gray-800 leading-tight">{r.label}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <span className="contents">
                <span className="flex h-5 shrink-0" style={{ width: `${Math.max(1.5, (total / max) * 62)}%` }} aria-hidden="true">
                {r.segments.filter(s => s.value > 0).map((s, j, list) => (
                  <span
                    key={s.name}
                    className={`h-full ${j < list.length - 1 ? 'mr-[2px]' : 'rounded-r-[4px]'}`}
                    style={{ width: `${(s.value / total) * 100}%`, background: s.color, opacity: hover === null || hover === i ? 1 : 0.55 }}
                  />
                ))}
                </span>
              </span>
              <span className="text-xs font-semibold text-gray-900 tabular-nums">{r.tip}</span>
            </span>
            {hover === i && r.segments.length > 1 && (
              <span role="tooltip" className="absolute right-1 -top-7 z-10 bg-gray-900 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap">
                {r.segments.map(s => (
                  <span key={s.name} className="inline-flex items-center gap-1 mr-2 last:mr-0">
                    <span className="inline-block w-3 h-0.5" style={{ background: s.color }} aria-hidden="true" />
                    <strong>{s.value}</strong> {s.name.toLowerCase()}
                  </span>
                ))}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

const Legend: React.FC<{ items: Array<{ name: string; color: string }> }> = ({ items }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-800 mb-3" aria-label="Legend">
    {items.map(i => (
      <li key={i.name} className="inline-flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-[3px]" style={{ background: i.color }} aria-hidden="true" />
        {i.name}
      </li>
    ))}
  </ul>
);

/** Every chart has a table view with the same numbers (no hover needed). */
const TableView: React.FC<{ caption: string; head: string[]; rows: Array<Array<string | number>> }> = ({ caption, head, rows }) => (
  <details className="mt-3 text-xs">
    <summary className="cursor-pointer text-gray-800 font-medium w-fit">Show as table</summary>
    <table className="mt-2 w-full text-left tabular-nums">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-gray-300 text-gray-700">{head.map(h => <th key={h} scope="col" className="py-1 pr-3 font-medium">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={String(r[0])} className="border-b border-gray-100 text-gray-900">{r.map((c, i) => (i === 0 ? <th key={i} scope="row" className="py-1 pr-3 font-normal">{c}</th> : <td key={i} className="py-1 pr-3">{c}</td>))}</tr>
        ))}
      </tbody>
    </table>
  </details>
);

const Card: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="bg-white border border-gray-200 rounded-lg p-4">
    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    {subtitle && <p className="text-xs text-gray-700 mt-0.5 mb-3">{subtitle}</p>}
    {!subtitle && <div className="mb-3" />}
    {children}
  </section>
);

const Tile: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3">
    <dt className="text-xs font-medium text-gray-700">{label}</dt>
    <dd className="text-2xl font-semibold text-gray-900 mt-1 font-sans">{value}</dd>
    {note && <dd className="text-xs text-gray-700 mt-0.5">{note}</dd>}
  </div>
);

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load the analytics.'));
  }, []);

  if (error) return <p role="alert" className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>;
  if (!data) return <p className="text-xs text-gray-700">Loading analytics...</p>;

  const sh = data.selfHelp;
  const finished = sh.resolved + sh.escalated + sh.blocked;
  const pct = (n: number) => (finished ? `${Math.round((n / finished) * 100)}%` : '0%');
  const selfParts = [
    { name: 'Fixed by the steps (no ticket)', value: sh.resolved, color: COLOR.slot1 },
    { name: 'Sent to a technician', value: sh.escalated, color: COLOR.slot2 },
    { name: 'Blocked at the request limit', value: sh.blocked, color: COLOR.slot3 },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-800">
        Last {data.days} days, demo data (fictional). Updated {new Date(data.generatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.
      </p>

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Tile label="Tickets opened" value={String(data.totals.tickets)} note={`${data.totals.open} still open`} />
        <Tile label="Resolved" value={String(data.totals.resolved)} note="of the tickets opened" />
        <Tile label="Median time to resolve" value={formatHours(data.totals.medianHoursToResolve)} note="all priorities" />
        <Tile label="Student chats fixed by the steps" value={sh.selfResolvedRate === null ? 'n/a' : `${Math.round(sh.selfResolvedRate * 100)}%`} note={`${sh.resolved} of ${finished}, no ticket needed`} />
      </dl>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Tickets per school" subtitle="Opened in the period, resolved and still open">
          <Legend items={[{ name: 'Resolved', color: COLOR.slot1 }, { name: 'Open', color: COLOR.slot2 }]} />
          <HBars
            title="Tickets per school"
            rows={data.perSchool.map(s => ({
              label: s.school,
              segments: [{ name: 'Resolved', value: s.resolved, color: COLOR.slot1 }, { name: 'Open', value: s.open, color: COLOR.slot2 }],
              tip: `${s.resolved + s.open}${s.open ? ` (${s.open} open)` : ''}`,
            }))}
          />
          <TableView caption="Tickets per school" head={['School', 'Resolved', 'Open', 'Total']} rows={data.perSchool.map(s => [s.school, s.resolved, s.open, s.resolved + s.open])} />
        </Card>

        <Card title="Median time to resolve, by priority" subtitle="From opened to resolved. The label also gives the time 90% of tickets were resolved within.">
          <HBars
            title="Median time to resolve, by priority"
            rows={data.timeToResolve.map(r => ({
              label: PRIORITY_LABEL[r.priority],
              segments: [{ name: 'Median', value: r.medianHours ?? 0, color: COLOR.slot1 }],
              tip: `${formatHours(r.medianHours)} · 90% within ${formatHours(r.p90Hours)}`,
            }))}
          />
          <TableView
            caption="Time to resolve by priority"
            head={['Priority', 'Resolved', 'Median', '90% within']}
            rows={data.timeToResolve.map(r => [PRIORITY_LABEL[r.priority], r.resolved, formatHours(r.medianHours), formatHours(r.p90Hours)])}
          />
        </Card>

        <Card title="Most common problems" subtitle="Tickets opened in the period, by category">
          <HBars
            title="Most common problems"
            rows={data.topCategories.map(c => ({ label: CATEGORY_LABEL[c.category], segments: [{ name: 'Tickets', value: c.count, color: COLOR.slot1 }], tip: String(c.count) }))}
          />
          <TableView caption="Tickets by category" head={['Category', 'Tickets']} rows={data.topCategories.map(c => [CATEGORY_LABEL[c.category], c.count])} />
        </Card>

        <Card title="How student self-help chats ended" subtitle={`${finished} finished chats${sh.open ? ` (${sh.open} still in progress are not counted)` : ''}`}>
          <p className="text-sm text-gray-900 mb-3">
            <strong className="text-2xl font-semibold mr-1">{pct(sh.resolved)}</strong> were fixed by the steps, with no ticket.
          </p>
          <div className="flex h-2 w-full mb-3" role="img" aria-label={selfParts.map(p => `${p.name}: ${p.value} (${pct(p.value)})`).join('; ')}>
            {selfParts.filter(p => p.value > 0).map((p, i, list) => (
              <span key={p.name} className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === list.length - 1 ? 'rounded-r-full' : 'mr-[2px]'}`} style={{ width: `${(p.value / Math.max(1, finished)) * 100}%`, background: p.color }} />
            ))}
          </div>
          <ul className="space-y-1.5 text-xs text-gray-900">
            {selfParts.map(p => (
              <li key={p.name} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />{p.name}</span>
                <span className="tabular-nums font-semibold">{p.value} ({pct(p.value)})</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};
