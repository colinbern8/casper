import React, { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

/**
 * The pieces every chat screen is built from (student help, teacher and staff help), so they
 * share one look: the same bubbles, text size, choice buttons and input.
 */

export type BubbleTone = 'plain' | 'info' | 'success' | 'notice' | 'warning';

const TONE: Record<BubbleTone | 'user', string> = {
  user: 'bg-gray-800 text-white',
  plain: 'bg-gray-50 border border-gray-200 text-gray-800',
  info: 'bg-blue-50 border border-blue-200 text-gray-900',
  success: 'bg-emerald-50 border border-emerald-300 text-gray-900',
  notice: 'bg-gray-100 border border-gray-300 text-gray-900',
  warning: 'bg-amber-50 border border-amber-400 text-gray-900',
};

interface BubbleProps {
  from: 'bot' | 'user';
  tone?: BubbleTone;
  /** A short heading inside the bubble, so the tone is never told by colour alone. */
  label?: string;
  children: React.ReactNode;
  /** Shown under the text, small and to the right. */
  meta?: string;
}

export const ChatBubble: React.FC<BubbleProps> = ({ from, tone = 'plain', label, children, meta }) => (
  <div className={`flex flex-col ${from === 'user' ? 'items-end' : 'items-start'}`}>
    <div className={`max-w-[88%] sm:max-w-[80%] whitespace-pre-line text-sm sm:text-base leading-relaxed px-4 py-2.5 rounded-lg ${TONE[from === 'user' ? 'user' : tone]}`}>
      {label && <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 pb-1 mb-1.5 border-b border-current/20">{label}</p>}
      {children}
      {meta && <span className={`block text-xs mt-1.5 text-right ${from === 'user' ? 'text-gray-300' : 'text-gray-500'}`}>{meta}</span>}
    </div>
  </div>
);

export type ChoiceTone = 'default' | 'primary' | 'resolved' | 'next' | 'escalate';

/** White text on these backgrounds is at least 4.5:1 (green-700 5.0, blue-700 6.7, orange-700 5.2). */
const CHOICE: Record<ChoiceTone, string> = {
  default: 'bg-white hover:bg-gray-50 border-gray-400 text-gray-900',
  primary: 'bg-blue-700 hover:bg-blue-800 border-blue-700 text-white',
  next: 'bg-blue-700 hover:bg-blue-800 border-blue-700 text-white',
  resolved: 'bg-green-700 hover:bg-green-800 border-green-700 text-white',
  escalate: 'bg-orange-700 hover:bg-orange-800 border-orange-700 text-white',
};

export interface Choice {
  key: string;
  label: string;
  tone?: ChoiceTone;
}

export const ChoiceChips: React.FC<{ choices: Choice[]; onPick: (key: string) => void; label: string }> = ({ choices, onPick, label }) =>
  choices.length === 0 ? null : (
    <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label={label}>
      {choices.map(c => (
        <button
          key={c.key}
          type="button"
          onClick={() => onPick(c.key)}
          className={`text-sm sm:text-base px-4 py-2 rounded-full border font-medium text-left ${CHOICE[c.tone ?? 'default']}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled?: boolean;
  sendLabel: string;
  maxLength: number;
  inputMode?: 'text' | 'numeric';
  inputRef?: React.Ref<HTMLInputElement>;
  /** Text on the send button instead of the label (for example a countdown). */
  sendText?: string;
}

export const ChatInput: React.FC<InputProps> = ({ value, onChange, onSubmit, placeholder, disabled, sendLabel, maxLength, inputMode = 'text', inputRef, sendText }) => (
  <form
    onSubmit={e => {
      e.preventDefault();
      onSubmit();
    }}
    className="flex items-center gap-2"
  >
    <input
      ref={inputRef}
      type="text"
      aria-label={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      maxLength={maxLength}
      inputMode={inputMode}
      placeholder={placeholder}
      disabled={disabled}
      className="flex-1 min-w-0 bg-white border border-gray-400 rounded-lg px-4 py-2.5 text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 disabled:bg-gray-100"
    />
    <button
      type="submit"
      aria-label={sendLabel}
      disabled={disabled || !value.trim()}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:hover:bg-blue-700 rounded-lg shrink-0"
    >
      <Send className="w-4 h-4" aria-hidden="true" />
      <span className="hidden sm:inline">{sendText ?? sendLabel}</span>
    </button>
  </form>
);

interface FrameProps {
  title: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Shown between the header and the conversation, for example the demo notice. */
  banner?: React.ReactNode;
  /** Changes whenever the conversation grows, so the log scrolls to the newest message. */
  scrollKey: unknown;
  logLabel: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  lang?: string;
}

/** The chat window: header, optional banner, a scrolling conversation log, and the input area. */
export const ChatFrame: React.FC<FrameProps> = ({ title, headerActions, banner, scrollKey, logLabel, children, footer, lang }) => {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [scrollKey]);

  return (
    <section lang={lang} aria-label={logLabel} className="w-full h-full max-w-2xl mx-auto flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="min-w-0">{title}</div>
        {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
      </div>
      {banner}
      <div role="log" aria-live="polite" aria-label={logLabel} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        {children}
        <div ref={endRef} />
      </div>
      <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 shrink-0">{footer}</div>
    </section>
  );
};
