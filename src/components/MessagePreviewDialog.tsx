import React from 'react';
import type { MessagePreview } from '../data/messagePreviews';
import { Dialog, BUTTON } from './Dialog';

const TEXT = {
  en: { notSent: 'Preview only. Nothing is sent: real messages come with the final version.', to: 'To', subject: 'Subject', review: '', close: 'Close' },
  es: { notSent: 'Solo vista previa. No se envía nada: los mensajes reales llegarán con la versión final.', to: 'Para', subject: 'Asunto', review: 'Texto en español pendiente de revisión humana.', close: 'Cerrar' },
} as const;

/** Shows a message the help desk would send, clearly marked as not sent. */
export const MessagePreviewDialog: React.FC<{ title: string; preview: MessagePreview; onClose: () => void }> = ({ title, preview, onClose }) => {
  const t = TEXT[preview.language];
  return (
    <Dialog title={title} onClose={onClose} lang={preview.language} footer={<button type="button" onClick={onClose} className={BUTTON.secondary}>{t.close}</button>}>
      <p className="mb-3 text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">{t.notSent}</p>
      {t.review && <p className="mb-3 text-sm text-gray-700">{t.review}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-gray-600">{t.to}</dt>
        <dd className="text-gray-900 break-all">{preview.to}</dd>
        <dt className="text-gray-600">{t.subject}</dt>
        <dd className="text-gray-900 font-medium">{preview.subject}</dd>
      </dl>
      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-3">{preview.body}</pre>
    </Dialog>
  );
};
