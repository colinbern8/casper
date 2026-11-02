import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  title: React.ReactNode;
  /** Optional line under the title. */
  description?: React.ReactNode;
  /** Absent: the dialog cannot be dismissed (Esc and clicking outside do nothing), so a choice is required. */
  onClose?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md';
  /** Language of the dialog's text, for screen readers. */
  lang?: string;
}

/**
 * A modal dialog: labelled for screen readers, focus moves in on open, Tab stays inside, and
 * focus returns to where it was on close. Esc and clicking outside close it only when `onClose` is given.
 */
export const Dialog: React.FC<DialogProps> = ({ title, description, onClose, children, footer, size = 'md', lang }) => {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? ref.current)?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (onClose) onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        lang={lang}
        onKeyDown={onKeyDown}
        className={`bg-white border border-gray-200 rounded-lg w-full ${size === 'sm' ? 'max-w-sm' : 'max-w-md'} p-5 text-gray-900 max-h-[90dvh] overflow-y-auto focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-3 pb-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900 leading-snug">{title}</h2>
            {description && <p id={descId} className="text-sm text-gray-600 mt-0.5">{description}</p>}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900 p-1 rounded-lg" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-sm text-gray-700">{children}</div>
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

/** Button styles shared by dialogs and forms. */
export const BUTTON = {
  primary: 'px-3.5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50',
  secondary: 'px-3.5 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-400 hover:bg-gray-50 rounded-lg disabled:opacity-50',
} as const;
