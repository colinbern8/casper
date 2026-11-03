import React, { useState } from 'react';
import { BellRing } from 'lucide-react';
import type { Language, Ticket } from '../types';
import type { StatusChange } from '../statusUpdates';
import { STATUS_FOR_REQUESTER, requesterUpdate } from '../data/messagePreviews';
import { MessagePreviewDialog } from './MessagePreviewDialog';

const TEXT = {
  en: { update: 'Update', now: 'is now', preview: 'See the message we would send', dismiss: 'Dismiss', title: 'Message preview' },
  es: { update: 'Actualización', now: 'ahora está', preview: 'Ver el mensaje que enviaríamos', dismiss: 'Cerrar aviso', title: 'Vista previa del mensaje' },
} as const;

/**
 * In-app notice that one of the person's requests changed status, with a preview of the message the
 * help desk would send. Students see it in their chosen language; staff in English.
 */
export const StatusUpdates: React.FC<{ changes: StatusChange[]; language: Language; onDismiss: (ticket: Ticket) => void }> = ({ changes, language, onDismiss }) => {
  const [previewing, setPreviewing] = useState<Ticket | null>(null);
  if (changes.length === 0) return null;
  return (
    <section aria-label={TEXT[language].update} className="mb-2 space-y-2 shrink-0">
      {changes.slice(0, 3).map(({ ticket }) => {
        const lang: Language = ticket.userRole === 'student' ? language : 'en';
        const t = TEXT[lang];
        return (
          <div key={ticket.id} role="status" lang={lang} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-white border-2 border-blue-700 rounded-lg px-3 py-2 text-sm text-gray-900">
            <BellRing className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <p className="flex-1 min-w-[12rem]">
              <strong>{t.update}:</strong> {ticket.ticketNumber} {t.now} <strong>{STATUS_FOR_REQUESTER[ticket.status][lang]}</strong>.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPreviewing(ticket)} className="underline text-blue-800 hover:text-blue-900 font-medium">{t.preview}</button>
              <button type="button" onClick={() => onDismiss(ticket)} className="px-2.5 py-1 border border-gray-400 rounded-lg hover:bg-gray-50">{t.dismiss}</button>
            </div>
          </div>
        );
      })}
      {previewing && (
        <MessagePreviewDialog title={TEXT[previewing.userRole === 'student' ? language : 'en'].title} preview={requesterUpdate(previewing, language)} onClose={() => setPreviewing(null)} />
      )}
    </section>
  );
};
