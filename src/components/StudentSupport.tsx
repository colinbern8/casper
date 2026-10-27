import React, { useState } from 'react';
import { CheckCircle2, ChevronLeft, Info, Languages, Wrench } from 'lucide-react';
import type { Language, StudentCaseView, SupportIssue, Ticket } from '../types';
import { ApiError, checkSupportDevice, createSupportCase, escalateSupportCase, recordSupportAttempt } from '../api';
import { SUPPORT_ISSUES } from '../data/supportContent';
import { STRINGS } from '../i18n/studentStrings';

type Stage = 'language' | 'issue' | 'intake' | 'steps' | 'resolved' | 'escalated';

interface StudentSupportProps {
  onTicketCreated: (ticket: Ticket) => void;
  onUseClassicChat: () => void;
}

const card = 'bg-white border border-gray-300 rounded-md p-4 sm:p-5 shadow-xs';
const primary = 'px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded text-sm font-semibold';
const secondary = 'px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded text-sm font-medium';
const field = 'w-full bg-white border border-gray-300 rounded px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700';

export const StudentSupport: React.FC<StudentSupportProps> = ({ onTicketCreated, onUseClassicChat }) => {
  const [lang, setLang] = useState<Language | null>(null);
  const [stage, setStage] = useState<Stage>('language');
  const [issue, setIssue] = useState<SupportIssue | null>(null);
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('');
  const [current, setCurrent] = useState<StudentCaseView | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = STRINGS[lang ?? 'en'];

  const reset = () => {
    setLang(null);
    setStage('language');
    setIssue(null);
    setDescription('');
    setTag('');
    setCurrent(null);
    setStepIndex(0);
    setTicket(null);
    setError(null);
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      if (err instanceof ApiError) setError((err.code && t.errors[err.code]) || err.message);
      else setError(t.genericError);
    } finally {
      setBusy(false);
    }
  };

  const chooseLanguage = (l: Language) => {
    setLang(l);
    setStage('issue');
  };

  const chooseIssue = (i: SupportIssue) => {
    setIssue(i);
    setStage('intake');
  };

  const startCase = () =>
    run(async () => {
      if (!lang || !issue) return;
      let view = await createSupportCase({ language: lang, issueId: issue.id, description: description.trim() || undefined });
      if (tag.trim()) view = await checkSupportDevice(view.id, tag.trim());
      setCurrent(view);
      setStepIndex(0);
      setStage('steps');
    });

  const answerStep = (result: 'worked' | 'not_worked') =>
    run(async () => {
      if (!current || !issue) return;
      const step = issue.steps[stepIndex];
      const view = await recordSupportAttempt(current.id, step.id, result);
      setCurrent(view);
      if (view.outcome === 'resolved') setStage('resolved');
      else setStepIndex(stepIndex + 1);
    });

  const askTechnician = (reason: string) =>
    run(async () => {
      if (!current) return;
      const res = await escalateSupportCase(current.id, reason);
      setCurrent(res.case);
      setTicket(res.ticket);
      onTicketCreated(res.ticket);
      setStage('escalated');
    });

  const noMoreSteps = issue ? stepIndex >= issue.steps.length : false;
  const step = issue && !noMoreSteps ? issue.steps[stepIndex] : null;

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-xl mx-auto space-y-3 pb-6">
        <div role="note" className="flex gap-2 items-start text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{t.demoBanner}</p>
            {t.reviewBanner && <p className="mt-0.5">{t.reviewBanner}</p>}
          </div>
        </div>

        {error && <p role="alert" className="text-xs text-red-800 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        {stage === 'language' && (
          <section className={card} aria-labelledby="ss-lang">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="w-4 h-4 text-gray-500" />
              <h2 id="ss-lang" className="text-sm font-semibold text-gray-900">Choose your language / Elige tu idioma</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => chooseLanguage('en')} className="py-4 border-2 border-gray-300 hover:border-blue-700 rounded-md text-base font-semibold text-gray-900 bg-white">English</button>
              <button type="button" onClick={() => chooseLanguage('es')} className="py-4 border-2 border-gray-300 hover:border-blue-700 rounded-md text-base font-semibold text-gray-900 bg-white">Español</button>
            </div>
            <button type="button" onClick={onUseClassicChat} className="mt-4 text-xs text-gray-500 underline hover:text-gray-800">{STRINGS.en.classicChat}</button>
          </section>
        )}

        {stage === 'issue' && (
          <section className={card} aria-labelledby="ss-issue">
            <h2 id="ss-issue" className="text-sm font-semibold text-gray-900 mb-3">{t.chooseIssue}</h2>
            <div className="space-y-2">
              {SUPPORT_ISSUES.map(i => (
                <button key={i.id} type="button" onClick={() => chooseIssue(i)} className="w-full text-left px-3 py-2.5 border border-gray-300 hover:border-blue-700 hover:bg-blue-50/40 rounded bg-white">
                  <span className="block text-sm font-medium text-gray-900">{i.title[lang!]}</span>
                  <span className="block text-xs text-gray-500">{i.blurb[lang!]}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={reset} className="mt-4 text-xs text-gray-500 underline hover:text-gray-800">{t.changeLanguage}</button>
          </section>
        )}

        {stage === 'intake' && issue && (
          <section className={`${card} space-y-3`} aria-labelledby="ss-intake">
            <h2 id="ss-intake" className="text-sm font-semibold text-gray-900">{issue.title[lang!]}</h2>
            <div>
              <label htmlFor="ss-desc" className="block text-xs font-medium text-gray-700 mb-1">{t.tellUsMore}</label>
              <textarea id="ss-desc" className={field} rows={3} maxLength={500} value={description} onChange={e => setDescription(e.target.value)} />
              <p className="text-[11px] text-gray-500 mt-0.5">{t.tellUsMoreHint}</p>
            </div>
            <div>
              <label htmlFor="ss-tag" className="block text-xs font-medium text-gray-700 mb-1">{t.tagLabel}</label>
              <input id="ss-tag" className={field} maxLength={40} value={tag} onChange={e => setTag(e.target.value)} />
              <p className="text-[11px] text-gray-500 mt-0.5">{t.tagHint}</p>
            </div>
            <div className="flex justify-between pt-1">
              <button type="button" onClick={() => setStage('issue')} className={`${secondary} inline-flex items-center gap-1`}><ChevronLeft className="w-4 h-4" />{t.back}</button>
              <button type="button" onClick={startCase} disabled={busy} className={primary}>{busy ? t.working : t.continue}</button>
            </div>
          </section>
        )}

        {stage === 'steps' && issue && current && (
          <section className={`${card} space-y-3`} aria-labelledby="ss-steps">
            <h2 id="ss-steps" className="text-sm font-semibold text-gray-900">{issue.title[lang!]}</h2>

            {current.deviceCheck && (
              <div className="text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2">
                <p className="font-semibold text-gray-700">{t.deviceCheckTitle}</p>
                <p className="text-gray-700 mt-0.5">{t.deviceResult[current.deviceCheck.result]}</p>
              </div>
            )}

            {issue.escalateOnly ? (
              <>
                <p className="text-sm text-gray-800 leading-relaxed">{issue.escalateOnly[lang!]}</p>
                <button type="button" onClick={() => askTechnician('damaged_device')} disabled={busy} className={primary}>{busy ? t.working : t.askTechnician}</button>
              </>
            ) : step ? (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.stepOf(stepIndex + 1, issue.steps.length)}</p>
                <p className="text-sm text-gray-900 leading-relaxed">{step.text[lang!]}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => answerStep('worked')} disabled={busy} className={primary}>{t.fixed}</button>
                  <button type="button" onClick={() => answerStep('not_worked')} disabled={busy} className={secondary}>{t.notFixed}</button>
                </div>
                <button type="button" onClick={() => askTechnician('student_requested')} disabled={busy} className="text-xs text-gray-500 underline hover:text-gray-800">{t.askTechnicianNow}</button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-800">{t.noMoreSteps}</p>
                <button type="button" onClick={() => askTechnician('steps_not_worked')} disabled={busy} className={primary}>{busy ? t.working : t.askTechnician}</button>
              </>
            )}
          </section>
        )}

        {stage === 'resolved' && current && (
          <section className={`${card} space-y-2 text-center`} aria-live="polite">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h2 className="text-base font-semibold text-gray-900">{t.resolvedTitle}</h2>
            <p className="text-sm text-gray-700">{t.resolvedBody}</p>
            <p className="text-xs text-gray-500">{t.caseNumber}: <span className="font-mono">{current.caseNumber}</span></p>
            <button type="button" onClick={reset} className={`${primary} mt-2`}>{t.startAnother}</button>
          </section>
        )}

        {stage === 'escalated' && current && ticket && (
          <section className={`${card} space-y-2 text-center`} aria-live="polite">
            <Wrench className="w-8 h-8 text-blue-700 mx-auto" />
            <h2 className="text-base font-semibold text-gray-900">{t.escalatedTitle}</h2>
            <p className="text-sm text-gray-700">{t.escalatedBody}</p>
            <p className="text-xs text-gray-500">{t.ticketNumber}: <span className="font-mono">{ticket.ticketNumber}</span></p>
            <p className="text-xs text-gray-500">{t.caseNumber}: <span className="font-mono">{current.caseNumber}</span></p>
            <button type="button" onClick={reset} className={`${primary} mt-2`}>{t.startAnother}</button>
          </section>
        )}
      </div>
    </div>
  );
};
