import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, FileText, Hand, Mail, MapPin, Send, Tag, User } from 'lucide-react';
import { TICKET_STATUSES, type Ticket, type TicketStatus, type TicketUpdateInput } from '../../types';
import { allTechs } from '../../data/schools';
import { CaseDetailPanel } from '../CaseDetailPanel';
import { PriorityBadge, STATUS_LABELS, StatusBadge, requesterKind } from './badges';
import { studentAlert } from '../../data/messagePreviews';
import { isUnclaimed } from './QueueFilters';
import { MessagePreviewDialog } from '../MessagePreviewDialog';

interface TicketRowProps {
  ticket: Ticket;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: TicketUpdateInput) => Promise<void>;
  onViewDispatchSlip: (ticket: Ticket) => void;
  /** The signed-in technician's name, and who is away, for the Claim button. */
  me: string;
  isAway: (name: string) => boolean;
  onClaim: (id: string) => Promise<void>;
}

const SMALL_BUTTON = 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-800 bg-white border border-gray-400 hover:bg-gray-50 rounded-lg';

/** One ticket in the technician queue: a summary line, and the full details when expanded. */
export const TicketRow: React.FC<TicketRowProps> = ({ ticket, expanded, onToggle, onUpdate, onViewDispatchSlip, me, isAway, onClaim }) => {
  const [note, setNote] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const mine = ticket.assignedTech === me;
  const canClaim = ticket.status !== 'resolved' && !mine;
  const claimLabel = isUnclaimed(ticket, isAway) ? 'Claim' : 'Take over';
  const [saving, setSaving] = useState(false);
  const isCritical = ticket.priority === 'critical' && ticket.status !== 'resolved';
  const detailsId = `ticket-${ticket.id}`;

  const setStatus = (status: TicketStatus) => onUpdate(ticket.id, { status });
  const assign = (assignedTech: string) => onUpdate(ticket.id, { assignedTech, ...(assignedTech && ticket.status === 'open' ? { status: 'assigned' as const } : {}) });
  const addNote = async () => {
    const text = note.trim();
    if (!text) return;
    setSaving(true);
    // The server appends the note with a timestamp and name, so two technicians cannot overwrite each other.
    await onUpdate(ticket.id, { addNote: text });
    setNote('');
    setSaving(false);
  };
  const techOptions = Array.from(new Set([...allTechs(), ...(ticket.assignedTech ? [ticket.assignedTech] : [])])).sort();

  return (
    <li className={`${isCritical ? 'bg-red-50/40' : 'bg-white'}`}>
      <div className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-gray-900">{ticket.ticketNumber}</span>
            <PriorityBadge ticket={ticket} />
            <StatusBadge status={ticket.status} />
            <span className="text-xs text-gray-600">{new Date(ticket.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{ticket.title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-700">
            <span className="inline-flex items-center gap-1 font-medium text-gray-900"><User className="w-3 h-3" aria-hidden="true" />{ticket.userName} ({requesterKind(ticket)})</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" />{ticket.school} • {ticket.room}</span>
            {ticket.assetTag && <span className="inline-flex items-center gap-1 font-mono bg-gray-100 px-1.5 py-0.5 rounded-lg border border-gray-200"><Tag className="w-3 h-3" aria-hidden="true" /><span className="sr-only">Red tag </span>{ticket.assetTag}</span>}
            <span>
              Technician: <strong>{ticket.assignedTech || 'Unassigned (shared queue)'}</strong>
              {mine && ' (you)'}
              {ticket.assignedTech && isAway(ticket.assignedTech) && <span className="ml-1 font-semibold text-amber-900">· away</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {canClaim && (
            <button type="button" onClick={() => void onClaim(ticket.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg" aria-label={`${claimLabel} ${ticket.ticketNumber}`}>
              <Hand className="w-3.5 h-3.5" aria-hidden="true" />{claimLabel}
            </button>
          )}
          <button type="button" onClick={() => onViewDispatchSlip(ticket)} className={SMALL_BUTTON} aria-label={`Slip or pass for ${ticket.ticketNumber}`}>
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Slip / pass</span>
          </button>
          <select aria-label={`Status of ${ticket.ticketNumber}`} value={ticket.status} onChange={e => setStatus(e.target.value as TicketStatus)} className="text-xs border border-gray-400 rounded-lg px-2 py-1 bg-white font-medium text-gray-800">
            {TICKET_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId} aria-label={`Details for ${ticket.ticketNumber}`} className="p-1 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div id={detailsId} className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs space-y-3">
          <div>
            <span className="font-semibold text-gray-800 block mb-0.5">Issue description</span>
            <p className="text-gray-900 bg-white p-2.5 rounded-lg border border-gray-200 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {ticket.troubleshootStepsAttempted.length > 0 && (
            <div>
              <span className="font-semibold text-gray-800 block mb-1">Steps tried before the request</span>
              <ul className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1 text-gray-800 list-disc list-inside">
                {ticket.troubleshootStepsAttempted.map((step, i) => <li key={i}>{step}</li>)}
              </ul>
            </div>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-gray-200">
            <div><dt className="text-gray-600">Contact</dt><dd className="font-medium text-gray-900">{ticket.phoneOrExt || ticket.userEmail}</dd></div>
            <div><dt className="text-gray-600">Device</dt><dd className="font-medium text-gray-900">{ticket.deviceModel || 'Not given'}</dd></div>
            <div><dt className="text-gray-600">Availability</dt><dd className="font-medium text-gray-900">{ticket.teacherAvailability || 'Not given'}</dd></div>
          </dl>

          <div>
            <span className="font-semibold text-gray-800 block mb-1">Technician notes</span>
            {ticket.techNotes ? (
              <div className="bg-white p-2.5 rounded-lg border border-gray-200 font-mono text-gray-900 whitespace-pre-wrap mb-2">{ticket.techNotes}</div>
            ) : (
              <p className="text-gray-600 italic mb-2">No notes yet.</p>
            )}
            <form onSubmit={e => { e.preventDefault(); void addNote(); }} className="flex gap-2">
              <input
                type="text"
                aria-label={`Add a note to ${ticket.ticketNumber}`}
                placeholder="Add an update..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="flex-1 min-w-0 text-xs border border-gray-400 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-hidden focus:border-gray-600"
              />
              <button type="submit" disabled={!note.trim() || saving} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg disabled:opacity-40">
                <Send className="w-3 h-3" aria-hidden="true" />Save note
              </button>
            </form>
          </div>

          {ticket.caseId && <CaseDetailPanel caseId={ticket.caseId} />}

          {ticket.userRole === 'student' && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="text-gray-800"><span className="font-semibold">Technician alert</span> · what the Media Center desk would get for this request. Not sent.</span>
              <button type="button" onClick={() => setAlertOpen(true)} className={SMALL_BUTTON}><Mail className="w-3.5 h-3.5" aria-hidden="true" />Preview alert</button>
            </div>
          )}

          {ticket.userRole === 'student' && ticket.status !== 'resolved' && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-gray-200">
              <div>
                <span className="font-semibold text-gray-800 block">Student request limit</span>
                <span className="text-gray-700">
                  {ticket.allowsAnother ? 'This student may send another request while this one is open.' : 'This student cannot send another request until this one is resolved.'}
                </span>
              </div>
              <button type="button" onClick={() => onUpdate(ticket.id, { allowAnother: !ticket.allowsAnother })} className={SMALL_BUTTON}>
                {ticket.allowsAnother ? 'Withdraw permission' : 'Allow another request'}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
            <label className="flex items-center gap-2">
              <span className="text-gray-800 font-medium">Assign to</span>
              <select value={ticket.assignedTech || ''} onChange={e => assign(e.target.value)} className="text-xs border border-gray-400 rounded-lg px-2 py-1 bg-white text-gray-900">
                <option value="">Unassigned (shared queue)</option>
                {techOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {ticket.status !== 'resolved' ? (
              <button type="button" onClick={() => setStatus('resolved')} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-400 hover:bg-emerald-100 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />Mark resolved
              </button>
            ) : (
              <button type="button" onClick={() => setStatus('open')} className={SMALL_BUTTON}>Reopen ticket</button>
            )}
          </div>
        </div>
      )}
      {alertOpen && <MessagePreviewDialog title="Technician alert preview" preview={studentAlert(ticket)} onClose={() => setAlertOpen(false)} />}
    </li>
  );
};
