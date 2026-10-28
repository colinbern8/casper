import React, { useEffect, useRef, useState } from 'react';
import { Info, Send } from 'lucide-react';
import { MAX_REPORTED_ISSUES, type Language, type StudentCaseView, type SupportIssue, type SupportIssueId, type Ticket } from '../types';
import { addSupportIssue, ApiError, createSupportCase, escalateSupportCase, getSupportLimit, recordRedTag, recordSupportAttempt } from '../api';
import { SUPPORT_ISSUES, findSupportIssue } from '../data/supportContent';
import { matchIssue } from '../data/supportMatch';
import { isRedTag, normalizeRedTag } from '../data/redTag';
import { LANGUAGE_PROMPT, PLACEHOLDER_CHOOSE_LANGUAGE, STRINGS } from '../i18n/studentStrings';

type Phase =
  | 'language' | 'issue' | 'details' | 'tag' | 'confirmTag' | 'steps' | 'handoff'
  | 'addMore' | 'addIssue' | 'addDetails'
  | 'done';
type Kind = 'plain' | 'info' | 'success' | 'handoff' | 'notice';

interface Msg {
  id: number;
  from: 'bot' | 'user';
  text: string;
  kind?: Kind;
}

interface Chip {
  key: string;
  label: string;
  primary?: boolean;
}

interface StudentSupportProps {
  onTicketCreated: (ticket: Ticket) => void;
}

const BUBBLE: Record<Kind | 'user', string> = {
  user: 'bg-gray-800 text-white',
  plain: 'bg-gray-50 border border-gray-200 text-gray-800',
  info: 'bg-blue-50 border border-blue-200 text-gray-900',
  success: 'bg-emerald-50 border border-emerald-200 text-gray-900',
  handoff: 'bg-blue-50 border border-blue-200 text-gray-900',
  notice: 'bg-gray-100 text-gray-900',
};

/** Every problem on a request, the first one first. */
const idsOf = (c: StudentCaseView): SupportIssueId[] => [c.reported.issueId, ...(c.additionalIssues ?? []).map(i => i.issueId)];

const YES = new Set(['yes', 'y', 'yep', 'yeah', 'correct', 'right', 'si', 'sí', 's', 'correcto', 'correcta', 'es correcto']);
const NO = new Set(['no', 'n', 'nope', 'wrong', 'incorrect', 'incorrecto', 'incorrecta']);

const initialMessages = (): Msg[] => [{ id: 0, from: 'bot', text: LANGUAGE_PROMPT }];

/**
 * The student-support demo as a conversation: tap a choice or type. There is no AI.
 * Typed text is matched to a common problem by keywords (src/data/supportMatch.ts);
 * everything the bot says is fixed, reviewed text.
 *
 * "Limit mode": a student who already has as many open requests as allowed can still try the
 * self-help steps, but nothing is ever sent. Instead of a technician request the bot shows who to
 * contact. The conversation is never cleared in this mode (there is no "Change language" or
 * "Start another request"), so the open request number stays on screen.
 */
export const StudentSupport: React.FC<StudentSupportProps> = ({ onTicketCreated }) => {
  const [lang, setLang] = useState<Language | null>(null);
  const [phase, setPhase] = useState<Phase>('language');
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [issue, setIssue] = useState<SupportIssue | null>(null);
  const [pendingText, setPendingText] = useState<string | undefined>();
  const [pendingTag, setPendingTag] = useState('');
  const [current, setCurrent] = useState<StudentCaseView | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Open request numbers when the student is at the request limit (limit mode); null otherwise. */
  const [limit, setLimit] = useState<string[] | null>(null);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = STRINGS[lang ?? 'en'];
  const step = issue && !issue.escalateOnly ? issue.steps[stepIndex] : undefined;
  const listedIds = current ? idsOf(current) : [];

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, phase, busy]);

  const inputEnabled = !busy && phase !== 'language' && phase !== 'done';
  useEffect(() => {
    if (inputEnabled) inputRef.current?.focus();
  }, [inputEnabled, phase]);

  const push = (from: 'bot' | 'user', text: string, kind: Kind = 'plain') => {
    const id = nextId.current++;
    setMessages(m => [...m, { id, from, text, kind }]);
  };

  const reset = () => {
    nextId.current = 1;
    setLang(null);
    setPhase('language');
    setMessages(initialMessages());
    setIssue(null);
    setPendingText(undefined);
    setPendingTag('');
    setCurrent(null);
    setStepIndex(0);
    setInput('');
    setError(null);
    setLimit(null);
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OPEN_TICKET_LIMIT') {
        // The server refused (and closed the case as `blocked`): tell them who to contact. This also
        // covers the limit being reached mid-conversation, for example from a second tab.
        const nums = (err.details?.openTicketNumbers as string[] | undefined) ?? [];
        setLimit(nums);
        push('bot', t.limitContact(nums), 'notice');
        setPhase('done');
      } else if (err instanceof ApiError) setError((err.code && t.errors[err.code]) || err.message);
      else setError(t.genericError);
    } finally {
      setBusy(false);
    }
  };

  // ---- Conversation steps ---------------------------------------------------

  const pickLanguage = (l: Language) => {
    setLang(l);
    push('user', l === 'en' ? 'English' : 'Español');
    void run(async () => {
      // A student who already has as many open requests as allowed is told now, before any questions,
      // and can still try the self-help steps.
      const { atLimit, openTicketNumbers } = await getSupportLimit();
      if (atLimit) {
        setLimit(openTicketNumbers);
        push('bot', STRINGS[l].limitIntro(openTicketNumbers), 'notice');
      }
      push('bot', STRINGS[l].greeting);
      setPhase('issue');
    });
  };

  const showFirstStep = (i: SupportIssue, l: Language) => {
    const tt = STRINGS[l];
    if (i.escalateOnly) {
      push('bot', i.escalateOnly[l]);
      setPhase('handoff');
    } else {
      setStepIndex(0);
      push('bot', `${tt.stepOf(1, i.steps.length)}\n${i.steps[0].text[l]}`);
      setPhase('steps');
    }
  };

  const beginCase = (l: Language, i: SupportIssue, description: string | undefined, matched: boolean) =>
    run(async () => {
      const view = await createSupportCase({ language: l, issueId: i.id, description });
      setCurrent(view);
      setIssue(i);
      setPendingText(undefined);
      if (matched) push('bot', STRINGS[l].thisLooksLike(i.title[l]));
      if (limit) {
        // Nothing will be sent, so there is no red tag to collect: go straight to the steps.
        showFirstStep(i, l);
        return;
      }
      push('bot', STRINGS[l].askTag);
      setPhase('tag');
    });

  /** Limit mode, for a problem that has no steps: say who to contact. No case is created. */
  const showContact = (nums: string[], l: Language) => {
    push('bot', STRINGS[l].limitContact(nums), 'notice');
    setPhase('done');
  };

  const pickIssue = (i: SupportIssue) => {
    if (!lang) return;
    push('user', i.title[lang]);
    if (limit && i.escalateOnly) {
      showContact(limit, lang);
      return;
    }
    if (i.id === 'other' && !pendingText) {
      push('bot', t.askDetails);
      setPhase('details');
      return;
    }
    void beginCase(lang, i, pendingText, false);
  };

  /** The student typed a red tag: repeat it back and ask before anything is saved. */
  const askToConfirmTag = (text: string) => {
    if (!isRedTag(text)) {
      // Not six digits: say so and ask again. Nothing is kept, and there is no way to skip this step.
      push('bot', t.tagInvalid);
      setPhase('tag');
      return;
    }
    const tag = normalizeRedTag(text);
    setPendingTag(tag);
    push('bot', t.confirmTag(tag, current?.student.displayName ?? ''));
    setPhase('confirmTag');
  };

  const saveTag = () =>
    run(async () => {
      if (!current || !issue || !lang) return;
      const view = await recordRedTag(current.id, pendingTag);
      setCurrent(view);
      setPendingTag('');
      push('bot', t.tagSaved(view.redTag!.value), 'info');
      showFirstStep(issue, lang);
    });

  const rejectTag = () => {
    setPendingTag('');
    push('bot', t.tagRetype);
    setPhase('tag');
  };

  const answer = (result: 'worked' | 'not_worked') => {
    if (!current || !issue || !step || !lang) return;
    push('user', result === 'worked' ? t.fixed : t.notFixed);
    void run(async () => {
      const view = await recordSupportAttempt(current.id, step.id, result);
      setCurrent(view);
      if (view.outcome === 'resolved') {
        push('bot', `${t.resolvedTitle}\n${t.resolvedBody}\n${t.caseNumber}: ${view.caseNumber}`, 'success');
        setPhase('done');
        return;
      }
      const n = stepIndex + 1;
      if (limit && n >= issue.steps.length) {
        // Out of steps in limit mode: the server refuses and closes the case as `blocked`. Look first, in
        // case a technician has allowed another request in the meantime, so nothing is sent unasked.
        const now = await getSupportLimit();
        if (now.atLimit) {
          await escalateNow(view.id, idsOf(view), 'steps_not_worked');
          return;
        }
        setLimit(null);
      }
      setStepIndex(n);
      if (n < issue.steps.length) push('bot', `${t.stepOf(n + 1, issue.steps.length)}\n${issue.steps[n].text[lang]}`);
      else push('bot', t.noMoreSteps);
    });
  };

  const reasonNow = () => (issue?.escalateOnly ? 'no_steps_for_issue' : step ? 'student_requested' : 'steps_not_worked');

  /** Sends the request: one ticket that lists every problem on it. */
  const escalateNow = async (caseId: string, ids: SupportIssueId[], reason = reasonNow()) => {
    if (!lang) return;
    const res = await escalateSupportCase(caseId, reason);
    setCurrent(res.case);
    onTicketCreated(res.ticket);
    const includes = ids.length > 1 ? `\n${t.requestIncludes(ids.map(id => findSupportIssue(id)!.title[lang]))}` : '';
    push('bot', `${t.escalatedTitle}\n${t.escalatedBody}\n${t.ticketNumber}: ${res.ticket.ticketNumber}\n${t.caseNumber}: ${res.case.caseNumber}${includes}`, 'handoff');
    setPhase('done');
  };

  const sendRequest = () => {
    if (!current) return;
    void run(() => escalateNow(current.id, idsOf(current)));
  };

  /** "Ask for a technician": before sending, offer to add anything else that is wrong. */
  const requestTechnician = () => {
    if (!current || !lang) return;
    push('user', t.askTechnician);
    if (limit) {
      // The server refuses at the limit and closes the case as `blocked`; the reply names the open request.
      sendRequest();
      return;
    }
    if (listedIds.length >= MAX_REPORTED_ISSUES) {
      sendRequest();
      return;
    }
    push('bot', t.addMoreAsk(MAX_REPORTED_ISSUES - listedIds.length));
    setPhase('addMore');
  };

  const addIssueToRequest = (id: SupportIssueId, words: string | undefined) =>
    run(async () => {
      if (!current || !lang) return;
      const view = await addSupportIssue(current.id, id, words);
      setCurrent(view);
      push('bot', t.issueAdded(findSupportIssue(id)!.title[lang]));
      const left = MAX_REPORTED_ISSUES - idsOf(view).length;
      if (left <= 0) {
        push('bot', t.maxReached);
        await escalateNow(view.id, idsOf(view));
        return;
      }
      push('bot', t.addMoreAsk(left));
      setPhase('addMore');
    });

  /** Something typed while adding problems: match it to a common problem, or keep it as "Something else". */
  const addFromText = (text: string) => {
    if (!lang) return;
    const id = matchIssue(text) ?? 'other';
    if (id !== 'other' && listedIds.includes(id)) {
      push('bot', t.alreadyListed(findSupportIssue(id)!.title[lang]));
      setPhase('addIssue');
      return;
    }
    void addIssueToRequest(id, text);
  };

  const submit = (raw: string) => {
    const text = raw.trim();
    if (!text || !inputEnabled || !lang) return;
    setInput('');
    push('user', text);
    switch (phase) {
      case 'issue': {
        const id = matchIssue(text);
        const found = id ? findSupportIssue(id) : undefined;
        if (found && limit && found.escalateOnly) {
          push('bot', t.thisLooksLike(found.title[lang]));
          showContact(limit, lang);
        } else if (found) void beginCase(lang, found, text, true);
        else {
          setPendingText(text);
          push('bot', limit ? t.notSureLimited : t.notSure);
        }
        break;
      }
      case 'details':
        void beginCase(lang, findSupportIssue('other')!, text, false);
        break;
      case 'tag':
        askToConfirmTag(text);
        break;
      case 'confirmTag': {
        // A short "yes" or "no" works like the buttons. Anything else is the student correcting the number.
        const word = text.toLowerCase().replace(/[.!¡¿?]/g, '').trim();
        if (YES.has(word)) void saveTag();
        else if (NO.has(word)) rejectTag();
        else askToConfirmTag(text);
        break;
      }
      case 'addMore':
      case 'addIssue': {
        const word = text.toLowerCase().replace(/[.!¡¿?]/g, '').trim();
        if (NO.has(word) || word === 'nothing' || word === 'nada') sendRequest();
        else if (phase === 'addMore' && YES.has(word)) {
          push('bot', t.addPrompt);
          setPhase('addIssue');
        } else addFromText(text);
        break;
      }
      case 'addDetails':
        void addIssueToRequest('other', text);
        break;
      default:
        push('bot', t.tapChoice);
    }
  };

  // ---- Choices shown under the latest bot message --------------------------

  const chips: Chip[] = (() => {
    if (busy || !lang && phase !== 'language') return [];
    switch (phase) {
      case 'language':
        return [{ key: 'lang:en', label: 'English' }, { key: 'lang:es', label: 'Español' }];
      case 'issue':
        return SUPPORT_ISSUES.map(i => ({ key: `issue:${i.id}`, label: i.title[lang!] }));
      case 'details':
        return [];
      case 'tag':
        return []; // the red tag is required: no Skip
      case 'confirmTag':
        return [{ key: 'tag-yes', label: t.tagYes, primary: true }, { key: 'tag-no', label: t.tagNo }];
      case 'steps':
        return step
          ? [
              { key: 'worked', label: t.fixed, primary: true },
              { key: 'not_worked', label: t.notFixed },
              { key: 'tech', label: t.askTechnician },
            ]
          : [{ key: 'tech', label: t.askTechnician, primary: true }];
      case 'handoff':
        return [{ key: 'tech', label: t.askTechnician, primary: true }];
      case 'addMore':
        return [{ key: 'more-no', label: t.addMoreNo, primary: true }, { key: 'more-yes', label: t.addMoreYes }];
      case 'addIssue':
        return [
          ...SUPPORT_ISSUES.filter(i => i.id === 'other' || !listedIds.includes(i.id)).map(i => ({ key: `addissue:${i.id}`, label: i.title[lang!] })),
          { key: 'more-no', label: t.addMoreNo, primary: true },
        ];
      case 'addDetails':
        return [];
      case 'done':
        return limit
          ? [{ key: 'another', label: t.tryAnother, primary: true }]
          : [{ key: 'again', label: t.startAnother, primary: true }];
    }
  })();

  /** Limit mode: back to the problem menu without clearing the conversation (the open request stays on screen). */
  const tryAnother = () => {
    push('user', t.tryAnother);
    void run(async () => {
      // Ask again: a technician may have allowed another request since. Then the normal flow applies.
      const now = await getSupportLimit();
      setLimit(now.atLimit ? now.openTicketNumbers : null);
      setIssue(null);
      setCurrent(null);
      setStepIndex(0);
      setPendingText(undefined);
      push('bot', t.anotherPrompt);
      setPhase('issue');
    });
  };

  const onChip = (key: string) => {
    if (key === 'lang:en') pickLanguage('en');
    else if (key === 'lang:es') pickLanguage('es');
    else if (key.startsWith('issue:')) pickIssue(findSupportIssue(key.slice(6))!);
    else if (key === 'tag-yes') { push('user', t.tagYes); void saveTag(); }
    else if (key === 'tag-no') { push('user', t.tagNo); rejectTag(); }
    else if (key === 'worked') answer('worked');
    else if (key === 'not_worked') answer('not_worked');
    else if (key === 'tech') requestTechnician();
    else if (key === 'more-yes') { push('user', t.addMoreYes); push('bot', t.addPrompt); setPhase('addIssue'); }
    else if (key === 'more-no') { push('user', t.addMoreNo); sendRequest(); }
    else if (key.startsWith('addissue:')) {
      const id = key.slice(9) as SupportIssueId;
      push('user', findSupportIssue(id)!.title[lang!]);
      if (id === 'other') { push('bot', t.askDetails); setPhase('addDetails'); }
      else void addIssueToRequest(id, undefined);
    }
    else if (key === 'again') reset();
    else if (key === 'another') tryAnother();
  };

  const placeholder =
    phase === 'language' ? PLACEHOLDER_CHOOSE_LANGUAGE
    : phase === 'issue' ? t.placeholderIssue
    : phase === 'details' ? t.placeholderDetails
    : phase === 'tag' ? t.placeholderTag
    : phase === 'confirmTag' ? t.placeholderConfirm
    : phase === 'addMore' || phase === 'addIssue' ? t.placeholderAddIssue
    : phase === 'addDetails' ? t.placeholderDetails
    : phase === 'done' ? t.placeholderDone
    : t.placeholderSteps;

  return (
    <div className="w-full h-full max-w-2xl mx-auto flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 leading-tight">{t.headerTitle}</h2>
        </div>
        {!limit && lang && (
          <button type="button" onClick={reset} className="text-sm text-gray-600 underline hover:text-gray-900">{t.changeLanguage}</button>
        )}
      </div>

      <div role="note" className="flex gap-2 items-start text-xs text-gray-700 bg-gray-100 px-4 py-2 shrink-0">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{t.demoBanner}</p>
          {t.reviewBanner && <p className="mt-0.5">{t.reviewBanner}</p>}
        </div>
      </div>

      <div role="log" aria-live="polite" aria-label="Conversation" className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] sm:max-w-[80%] whitespace-pre-line text-sm sm:text-base leading-relaxed px-4 py-2.5 rounded-lg ${BUBBLE[m.from === 'user' ? 'user' : m.kind ?? 'plain']}`}>
              {m.text}
            </div>
          </div>
        ))}

        {busy && <p className="text-sm text-gray-500 italic">{t.working}</p>}

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Choices">
            {chips.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => onChip(c.key)}
                className={`text-sm sm:text-base px-4 py-2 rounded-full border font-medium text-left transition ${
                  c.primary
                    ? 'bg-blue-700 hover:bg-blue-800 border-blue-700 text-white'
                    : 'bg-white hover:bg-gray-50 border-gray-400 text-gray-900'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 shrink-0">
        {error && <p role="alert" className="mb-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <form
          onSubmit={e => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            aria-label={placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            maxLength={500}
            inputMode={phase === 'tag' ? 'numeric' : 'text'}
            placeholder={placeholder}
            disabled={!inputEnabled}
            className="flex-1 min-w-0 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 disabled:bg-gray-100"
          />
          <button
            type="submit"
            aria-label={t.send}
            disabled={!inputEnabled || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:hover:bg-blue-700 rounded-lg transition shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{t.send}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
