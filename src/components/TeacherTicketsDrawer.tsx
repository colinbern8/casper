import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Printer, FileText, Mail } from 'lucide-react';
import type { Language, Ticket } from '../types';
import { STATUS_FOR_REQUESTER, requesterUpdate } from '../data/messagePreviews';
import { MessagePreviewDialog } from './MessagePreviewDialog';

interface TeacherTicketsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  userName: string;
  /** Students see status words and message previews in their chosen language. */
  language: Language;
  onViewDispatchSlip: (ticket: Ticket) => void;
}

const STATUS_CLASS = (t: Ticket) =>
  t.status === 'resolved' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : t.status === 'open' ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-amber-50 text-amber-900 border-amber-300';

/** A person's own requests, from their account (any device), with status and a message preview. */
export const TeacherTicketsDrawer: React.FC<TeacherTicketsDrawerProps> = ({ isOpen, onClose, tickets, userName, language, onViewDispatchSlip }) => {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [previewing, setPreviewing] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    return () => previous?.focus?.();
  }, [isOpen]);

  if (!isOpen) return null;
  const lang = (t: Ticket): Language => (t.userRole === 'student' ? language : 'en');

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-black/50" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={e => e.key === 'Escape' && !previewing && onClose()}
        className="absolute inset-y-0 right-0 w-full max-w-md bg-white border-l border-gray-200 flex flex-col"
      >
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 id={titleId} className="font-semibold text-gray-900 text-lg">My requests</h2>
            <p className="text-xs text-gray-700">Requests sent from {userName}'s account, on any device</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-600 hover:text-gray-900 rounded-lg" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto p-4 space-y-3">
          {tickets.length === 0 ? (
            <li className="text-center py-12 text-gray-700 space-y-1">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" aria-hidden="true" />
              <p className="font-medium text-sm">No requests yet</p>
            </li>
          ) : (
            tickets.map(ticket => (
              <li key={ticket.id} className="p-3.5 rounded-lg border border-gray-200 bg-white text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded-lg border border-gray-200">{ticket.ticketNumber}</span>
                  <span lang={lang(ticket)} className={`text-xs font-medium px-2 py-0.5 rounded-lg border ${STATUS_CLASS(ticket)}`}>{STATUS_FOR_REQUESTER[ticket.status][lang(ticket)]}</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 leading-snug">{ticket.title}</h3>
                  <p className="text-gray-700 mt-1 line-clamp-2 text-xs leading-relaxed">{ticket.description}</p>
                </div>
                <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700">
                  <span>{ticket.room}</span>
                  <span className="flex gap-3">
                    <button type="button" onClick={() => setPreviewing(ticket)} className="text-blue-800 hover:text-blue-900 font-medium inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" aria-hidden="true" />Message preview
                    </button>
                    <button type="button" onClick={() => onViewDispatchSlip(ticket)} className="text-blue-800 hover:text-blue-900 font-medium inline-flex items-center gap-1">
                      <Printer className="w-3 h-3" aria-hidden="true" />{ticket.userRole === 'student' ? 'Loaner pass' : 'Print slip'}
                    </button>
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
      {previewing && <MessagePreviewDialog title="Message preview" preview={requesterUpdate(previewing, language)} onClose={() => setPreviewing(null)} />}
    </div>
  );
};
