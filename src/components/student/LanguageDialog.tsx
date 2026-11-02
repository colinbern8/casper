import React from 'react';
import type { Language } from '../../types';
import { Dialog } from '../Dialog';
import { LANGUAGE_DIALOG } from '../../i18n/studentStrings';

const OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

/**
 * The student picks a language before the chat starts. A choice is required, so there is no close
 * button, and Esc or clicking outside do nothing. Each option is labelled in its own language.
 */
export const LanguageDialog: React.FC<{ current: Language | null; onPick: (language: Language) => void }> = ({ current, onPick }) => (
  <Dialog size="sm" title={LANGUAGE_DIALOG.title} description={LANGUAGE_DIALOG.description}>
    <div className="grid grid-cols-2 gap-3 pt-1" role="group" aria-label={LANGUAGE_DIALOG.title}>
      {OPTIONS.map(o => (
        <button
          key={o.value}
          type="button"
          lang={o.value}
          aria-pressed={current === o.value}
          onClick={() => onPick(o.value)}
          className={`px-4 py-3 text-base font-semibold rounded-lg border-2 ${current === o.value ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-900 border-gray-400 hover:bg-gray-50'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  </Dialog>
);
