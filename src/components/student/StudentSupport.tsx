import React, { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { Language, StudentCaseView, SupportIssue, SupportIssueId, Ticket } from '../../types';
import { addSupportIssue, ApiError, createSupportCase, escalateSupportCase, getSupportLimit, recordRedTag, recordSupportAttempt } from '../../api';
import { findSupportIssue } from '../../data/supportContent';
import { matchIssue } from '../../data/supportMatch';
import { isRedTag, normalizeRedTag } from '../../data/redTag';
import { MAX_SUPPORT_INPUT } from '../../data/limits';
import { STRINGS } from '../../i18n/studentStrings';
import { loadLanguage, saveLanguage } from '../../profile';
import { ChatBubble, ChatFrame, ChatInput, ChoiceChips, type BubbleTone } from '../chat/ChatParts';
import { LanguageDialog } from './LanguageDialog';
import { choicesFor, idsOf, placeholderFor, readYesNo, roomLeft, type Phase } from './conversation';

interface Msg {
  id: number;
  from: 'bot' | 'user';
  text: string;
  tone?: BubbleTone;
  /** The language the message is written in, so a screen reader pronounces it right after a language change. */
  lang: Language;
}

interface StudentSupportProps {
  email: string;
  onTicketCreated: (ticket: Ticket) => void;
}

/**
 * The student-support chat: tap a choice or type. There is no AI. Typed text is matched to a common
 * problem by keywords (src/data/supportMatch.ts); everything the bot says is fixed, reviewed text.
 *
 * The language is picked in a pop-up first (remembered per account in this browser). "Change language"
 * reopens it and keeps the conversation.
 *
 * "Limit mode": a student who already has as many open requests as allowed can still try the self-help
 * steps, but nothing is ever sent. Instead of a technician request the bot shows who to contact, and the
 * conversation is never cleared, so the open request number stays on screen.
 */
export const StudentSupport: React.FC<StudentSupportProps> = ({ email, onTicketCreated }) => {
  const [lang, setLang] = useState<Language | null>(() => loadLanguage(email));
  const [choosing, setChoosing] = useState(lang === null);
  const [phase, setPhase] = useState<Phase>('issue');
  const [messages, setMessages] = useState<Msg[]>([]);
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
  const started = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const l: Language = lang ?? 'en';
  const t = STRINGS[l];
  const step = issue && !issue.escalateOnly ? issue.steps[stepIndex] : undefined;
  const listedIds = current ? idsOf(current) : [];

  const inputEnabled = !busy && !choosing && lang !== null && phase !== 'done';
  useEffect(() => {
    if (inputEnabled) inputRef.current?.focus();
  }, [inputEnabled, phase]);

  const push = (from: 'bot' | 'user', text: string, tone: BubbleTone = 'plain', in_: Language = l) => {
    const id = nextId.current++;
    setMessages(m => [...m, { id, from, text, tone, lang: in_ }]);
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

  /** A new conversation in `lng`: the request-limit check first, then the greeting and the problem menu. */
  const begin = (lng: Language) =>
    run(async () => {
      // A student who already has as many open requests as allowed is told now, before any questions,
      // and can still try the self-help steps.
      const { atLimit, openTicketNumbers } = await getSupportLimit();
      setLimit(atLimit ? openTicketNumbers : null);
      if (atLimit) push('bot', STRINGS[lng].limitIntro(openTicketNumbers), 'notice', lng);
      push('bot', STRINGS[lng].greeting, 'plain', lng);
      setPhase('issue');
    });

  // A returning student whose language is remembered starts straight away.
  useEffect(() => {
    if (lang && !started.current) {
      started.current = true;
      void begin(lang);
    }
  }, []);

  const pickLanguage = (lng: Language) => {
    saveLanguage(email, lng);
    setChoosing(false);
    const changed = lang !== lng;
    setLang(lng);
    if (!started.current) {
      started.current = true;
      void begin(lng);
      return;
    }
    if (!changed) return;
    // The conversation is kept. Say so in the new language, and repeat the step being tried in it.
    push('bot', STRINGS[lng].languageChanged, 'plain', lng);
    if (phase === 'steps' && step && issue) push('bot', `${STRINGS[lng].stepOf(stepIndex + 1, issue.steps.length)}\n${step.text[lng]}`, 'plain', lng);
    if (phase === 'tag') push('bot', STRINGS[lng].askTag, 'plain', lng);
  };

  // ---- Conversation steps ---------------------------------------------------

  const showFirstStep = (i: SupportIssue) => {
    if (i.escalateOnly) {
      push('bot', i.escalateOnly[l]);
      setPhase('handoff');
    } else {
      setStepIndex(0);
      push('bot', `${t.stepOf(1, i.steps.length)}\n${i.steps[0].text[l]}`);
      setPhase('steps');
    }
  };

  const beginCase = (i: SupportIssue, description: string | undefined, matched: boolean) =>
    run(async () => {
      const view = await createSupportCase({ language: l, issueId: i.id, description });
      setCurrent(view);
      setIssue(i);
      setPendingText(undefined);
      if (matched) push('bot', t.thisLooksLike(i.title[l]));
      if (limit) {
        // Nothing will be sent, so there is no red tag to collect: go straight to the steps.
        showFirstStep(i);
        return;
      }
      push('bot', t.askTag);
      setPhase('tag');
    });

  /** Limit mode, for a problem that has no steps: say who to contact. No case is created. */
  const showContact = (nums: string[]) => {
    push('bot', t.limitContact(nums), 'notice');
    setPhase('done');
  };

  const pickIssue = (i: SupportIssue) => {
    push('user', i.title[l]);
    if (limit && i.escalateOnly) return showContact(limit);
    if (i.id === 'other' && !pendingText) {
      push('bot', t.askDetails);
      setPhase('details');
      return;
    }
    void beginCase(i, pendingText, false);
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
      if (!current || !issue) return;
      const view = await recordRedTag(current.id, pendingTag);
      setCurrent(view);
      setPendingTag('');
      push('bot', t.tagSaved(view.redTag!.value), 'info');
      showFirstStep(issue);
    });

  const rejectTag = () => {
    setPendingTag('');
    push('bot', t.tagRetype);
    setPhase('tag');
  };

  /** Sends the request: one ticket that lists every problem on it. */
  const escalateNow = async (caseId: string, ids: SupportIssueId[], reason: string) => {
    const res = await escalateSupportCase(caseId, reason);
    setCurrent(res.case);
    onTicketCreated(res.ticket);
    const includes = ids.length > 1 ? `\n${t.requestIncludes(ids.map(id => findSupportIssue(id)!.title[l]))}` : '';
    push('bot', `${t.escalatedTitle}\n${t.escalatedBody}\n${t.ticketNumber}: ${res.ticket.ticketNumber}\n${t.caseNumber}: ${res.case.caseNumber}${includes}`, 'info');
    setPhase('done');
  };

  const reasonNow = () => (issue?.escalateOnly ? 'no_steps_for_issue' : step ? 'student_requested' : 'steps_not_worked');

  const sendRequest = () => {
    if (!current) return;
    void run(() => escalateNow(current.id, idsOf(current), reasonNow()));
  };

  const answer = (result: 'worked' | 'not_worked') => {
    if (!current || !issue || !step) return;
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
      if (n < issue.steps.length) push('bot', `${t.stepOf(n + 1, issue.steps.length)}\n${issue.steps[n].text[l]}`);
      else push('bot', t.noMoreSteps);
    });
  };

  /** "Ask for a technician": before sending, offer to add anything else that is wrong. */
  const requestTechnician = () => {
    if (!current) return;
    push('user', t.askTechnician);
    // At the limit the server refuses and closes the case as `blocked`; the reply names the open request.
    if (limit || roomLeft(listedIds.length) <= 0) return sendRequest();
    push('bot', t.addMoreAsk(roomLeft(listedIds.length)));
    setPhase('addMore');
  };

  const addIssueToRequest = (id: SupportIssueId, words: string | undefined) =>
    run(async () => {
      if (!current) return;
      const view = await addSupportIssue(current.id, id, words);
      setCurrent(view);
      push('bot', t.issueAdded(findSupportIssue(id)!.title[l]));
      const left = roomLeft(idsOf(view).length);
      if (left <= 0) {
        push('bot', t.maxReached);
        await escalateNow(view.id, idsOf(view), reasonNow());
        return;
      }
      push('bot', t.addMoreAsk(left));
      setPhase('addMore');
    });

  /** Something typed while adding problems: match it to a common problem, or keep it as "Something else". */
  const addFromText = (text: string) => {
    const id = matchIssue(text) ?? 'other';
    if (id !== 'other' && listedIds.includes(id)) {
      push('bot', t.alreadyListed(findSupportIssue(id)!.title[l]));
      setPhase('addIssue');
      return;
    }
    void addIssueToRequest(id, text);
  };

  const submit = (raw: string) => {
    const text = raw.trim();
    if (!text || !inputEnabled) return;
    setInput('');
    push('user', text);
    switch (phase) {
      case 'issue': {
        const id = matchIssue(text);
        const found = id ? findSupportIssue(id) : undefined;
        if (found && limit && found.escalateOnly) {
          push('bot', t.thisLooksLike(found.title[l]));
          showContact(limit);
        } else if (found) void beginCase(found, text, true);
        else {
          setPendingText(text);
          push('bot', limit ? t.notSureLimited : t.notSure);
        }
        break;
      }
      case 'details':
        void beginCase(findSupportIssue('other')!, text, false);
        break;
      case 'tag':
        askToConfirmTag(text);
        break;
      case 'confirmTag': {
        // A short "yes" or "no" works like the buttons. Anything else is the student correcting the number.
        const yn = readYesNo(text);
        if (yn === 'yes') void saveTag();
        else if (yn === 'no') rejectTag();
        else askToConfirmTag(text);
        break;
      }
      case 'addMore':
      case 'addIssue': {
        const yn = readYesNo(text);
        if (yn === 'no') sendRequest();
        else if (yn === 'yes' && phase === 'addMore') {
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

  /** Back to the problem menu without clearing the conversation. */
  const backToMenu = (userText: string, prompt: string) => {
    push('user', userText);
    void run(async () => {
      // Ask again: a technician may have allowed another request since, or the limit may now apply.
      const now = await getSupportLimit();
      setLimit(now.atLimit ? now.openTicketNumbers : null);
      if (now.atLimit && !limit) push('bot', t.limitIntro(now.openTicketNumbers), 'notice');
      setIssue(null);
      setCurrent(null);
      setStepIndex(0);
      setPendingText(undefined);
      push('bot', prompt);
      setPhase('issue');
    });
  };

  const onChip = (key: string) => {
    if (key.startsWith('issue:')) pickIssue(findSupportIssue(key.slice(6))!);
    else if (key === 'tag-yes') { push('user', t.tagYes); void saveTag(); }
    else if (key === 'tag-no') { push('user', t.tagNo); rejectTag(); }
    else if (key === 'worked') answer('worked');
    else if (key === 'not_worked') answer('not_worked');
    else if (key === 'tech') requestTechnician();
    else if (key === 'more-yes') { push('user', t.addMoreYes); push('bot', t.addPrompt); setPhase('addIssue'); }
    else if (key === 'more-no') { push('user', t.addMoreNo); sendRequest(); }
    else if (key.startsWith('addissue:')) {
      const id = key.slice(9) as SupportIssueId;
      push('user', findSupportIssue(id)!.title[l]);
      if (id === 'other') { push('bot', t.askDetails); setPhase('addDetails'); }
      else void addIssueToRequest(id, undefined);
    }
    else if (key === 'again') backToMenu(t.startAnother, t.anotherPrompt);
    else if (key === 'another') backToMenu(t.tryAnother, t.anotherPrompt);
  };

  const choices = busy || !lang ? [] : choicesFor({ phase, lang, hasStep: !!step, listedIds, atLimit: !!limit }, t);

  return (
    <>
      <ChatFrame
        lang={l}
        logLabel={t.conversation}
        scrollKey={`${messages.length}-${phase}-${busy}`}
        title={<h2 className="text-xl font-semibold text-gray-900 leading-tight">{t.headerTitle}</h2>}
        headerActions={
          lang && (
            <button type="button" onClick={() => setChoosing(true)} className="text-sm text-gray-700 underline hover:text-gray-900">{t.changeLanguage}</button>
          )
        }
        banner={
          <div role="note" className="flex gap-2 items-start text-xs text-gray-800 bg-gray-100 px-4 py-2 shrink-0">
            <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">{t.demoBanner}</p>
              {t.reviewBanner && <p className="mt-0.5">{t.reviewBanner}</p>}
            </div>
          </div>
        }
        footer={
          <>
            {error && <p role="alert" className="mb-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <ChatInput
              inputRef={inputRef}
              value={input}
              onChange={setInput}
              onSubmit={() => submit(input)}
              placeholder={placeholderFor(phase, t)}
              disabled={!inputEnabled}
              sendLabel={t.send}
              maxLength={MAX_SUPPORT_INPUT}
              inputMode={phase === 'tag' ? 'numeric' : 'text'}
            />
          </>
        }
      >
        {messages.map(m => (
          <div key={m.id} lang={m.lang}>
            <ChatBubble from={m.from} tone={m.tone}>{m.text}</ChatBubble>
          </div>
        ))}
        {busy && <p className="text-sm text-gray-600 italic">{t.working}</p>}
        <ChoiceChips choices={choices} onPick={onChip} label={t.choices} />
      </ChatFrame>
      {choosing && <LanguageDialog current={lang} onPick={pickLanguage} />}
    </>
  );
};
