import React from 'react';
import type { TechnicianStatus } from '../../types';

const since = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

/**
 * The signed-in technician's away switch, and who covers which school. While a lead is away, new
 * staff tickets from their school go to the backup, or to the school's shared queue.
 */
export const Coverage: React.FC<{
  techs: { me: string; technicians: TechnicianStatus[] } | null;
  error: string | null;
  onToggleAway: (away: boolean) => void;
}> = ({ techs, error, onToggleAway }) => {
  const mine = techs?.technicians.find(t => t.name === techs.me);
  const away = techs?.technicians.filter(t => t.away) ?? [];
  return (
    <div className="px-4 py-2.5 border-b border-gray-200 bg-white text-xs text-gray-800 shrink-0 space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {mine && (
          <>
            <span>
              You: <strong>{mine.name}</strong> ·{' '}
              <span className={mine.away ? 'font-semibold text-amber-900' : 'font-semibold text-emerald-800'}>{mine.away ? `Away since ${since(mine.since)}` : 'Available'}</span>
            </span>
            <button
              type="button"
              aria-pressed={mine.away}
              onClick={() => onToggleAway(!mine.away)}
              className="px-2.5 py-1 rounded-lg border border-gray-400 bg-white hover:bg-gray-50 font-medium"
            >
              {mine.away ? "I'm back" : 'Mark me away'}
            </button>
          </>
        )}
        <span className="text-gray-700">{away.length === 0 ? 'Everyone is available.' : `Away: ${away.map(t => t.name).join(', ')}.`}</span>
        {error && <span role="alert" className="text-red-800">{error}</span>}
      </div>
      {techs && (
        <details>
          <summary className="cursor-pointer font-medium text-gray-900 w-fit">Who covers which school</summary>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-700 border-b border-gray-200">
                  <th className="py-1 pr-3 font-medium">Technician</th>
                  <th className="py-1 pr-3 font-medium">Status</th>
                  <th className="py-1 pr-3 font-medium">Lead for</th>
                  <th className="py-1 font-medium">Backup for</th>
                </tr>
              </thead>
              <tbody>
                {techs.technicians.map(t => (
                  <tr key={t.name} className="border-b border-gray-100">
                    <td className="py-1 pr-3 text-gray-900">{t.name}{t.name === techs.me && ' (you)'}</td>
                    <td className={`py-1 pr-3 ${t.away ? 'font-semibold text-amber-900' : 'text-gray-800'}`}>{t.away ? `Away since ${since(t.since)}` : 'Available'}</td>
                    <td className="py-1 pr-3">{t.leads.join(', ') || '-'}</td>
                    <td className="py-1">{t.backs.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-gray-700">While a lead is away, new staff tickets go to the backup, or to the school's shared queue if the backup is away too.</p>
        </details>
      )}
    </div>
  );
};
