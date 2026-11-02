import React, { useEffect, useRef, useState } from 'react';
import type { Ticket, UserContext } from '../types';
import { ApiError, createTicket, sendChat } from '../api';
import { HELP_DESK } from '../data/schools';
import { stepActions, actionKind } from '../data/stepActions';
import { CHAT_MENU, DAMAGE_WORDS, inferCategory, matchFlow, type GuidedFlow } from '../data/staffFlows';
import { MAX_MESSAGE_LENGTH } from '../data/limits';
import { BRAND_NAME } from '../brand';
import { ChatBubble, ChatFrame, ChatInput, ChoiceChips, type BubbleTone, type Choice } from './chat/ChatParts';
import { LocationDialog } from './LocationDialog';
import { GuidelinesDialog } from './GuidelinesDialog';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  time: string;
  tone?: BubbleTone;
  label?: string;
  step?: { action: string; instruction: string; detail?: string };
  ticket?: Ticket;
  choices?: Choice[];
}

interface TeacherChatBotProps {
  userContext: UserContext;
  onUpdateUserContext: (ctx: UserContext) => void;
  onTicketCreated: (ticket: Ticket) => void;
  onViewDispatchSlip: (ticket: Ticket) => void;
  onContactIT: () => void;
}

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** A button label (from the step list or the server) as a choice with its colour. */
const asChoice = (label: string): Choice => {
  const kind = actionKind(label);
  if (kind === 'resolved') return { key: 'resolved', label, tone: 'resolved' };
  if (kind === 'next') return { key: 'next', label, tone: 'next' };
  if (kind === 'escalate') return { key: 'escalate', label, tone: 'escalate' };
  if (label === 'Contact IT') return { key: 'contact', label };
  return { key: `text:${label}`, label };
};

/**
 * Teacher and staff help chat (also the student chat when demo mode is off). Guided steps come
 * from src/data/staffFlows.ts; anything else typed gets a built-in answer from the server. No AI.
 */
export const TeacherChatBot: React.FC<TeacherChatBotProps> = ({ userContext, onUpdateUserContext, onTicketCreated, onViewDispatchSlip, onContactIT }) => {
  const isStudent = userContext.role === 'student';
  const escalateLabel = isStudent ? 'Request loaner device' : 'Submit IT ticket';
  const nextId = useRef(1);

  const welcome = (): Message[] => [
    {
      id: 0,
      from: 'bot',
      text: "Describe your IT issue, and I'll help you find the next step.",
      time: now(),
      choices: CHAT_MENU[isStudent ? 'student' : 'staff'].map(asChoice),
    },
  ];

  const [messages, setMessages] = useState<Message[]>(welcome);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [last, setLast] = useState({ text: '', at: 0 });
  const [dialog, setDialog] = useState<'location' | 'guidelines' | null>(null);
  const [flow, setFlow] = useState<{ flow: GuidedFlow; index: number; tried: string[] } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!warning) return;
    const t = setTimeout(() => setWarning(null), 3500);
    return () => clearTimeout(t);
  }, [warning]);

  // A different person or situation starts a fresh conversation.
  useEffect(() => {
    setMessages(welcome());
    setFlow(null);
    setCooldown(0);
    setWarning(null);
  }, [userContext.role, userContext.userName]);

  const add = (...msgs: Omit<Message, 'id' | 'time'>[]) =>
    setMessages(prev => [...prev, ...msgs.map(m => ({ ...m, id: nextId.current++, time: now() }))]);

  const showStep = (f: GuidedFlow, index: number) => {
    const step = f.steps[index];
    add({
      from: 'bot',
      text: `Troubleshooting: ${f.topic} (step ${index + 1} of ${f.steps.length})`,
      step,
      choices: stepActions({ isLastStep: index + 1 >= f.steps.length, isStudent }).map(asChoice),
    });
  };

  const startFlow = (f: GuidedFlow) => {
    setFlow({ flow: f, index: 0, tried: [f.steps[0].action] });
    showStep(f, 0);
  };

  const nextStep = () => {
    if (!flow) return;
    const index = flow.index + 1;
    if (index >= flow.flow.steps.length) {
      void escalate('Troubleshooting steps completed without resolution.');
      return;
    }
    setFlow({ ...flow, index, tried: [...flow.tried, flow.flow.steps[index].action] });
    showStep(flow.flow, index);
  };

  const resolved = () => {
    setFlow(null);
    add({ from: 'bot', text: 'The issue is marked as resolved. No service request is required.', tone: 'success', choices: [{ key: 'new', label: 'Start new request', tone: 'primary' }] });
  };

  const escalate = async (reason: string) => {
    const topic = flow?.flow.topic ?? '';
    const userText = messages.filter(m => m.from === 'user').slice(-3).map(m => m.text).join(' | ').slice(0, 600);
    const summary = topic || userText.slice(0, 80) || (isStudent ? 'Student device issue' : 'Classroom technology issue');
    try {
      // The server decides role, priority, routing and the ticket number. We show what it returns.
      const ticket = await createTicket({
        userRole: userContext.role,
        school: userContext.school,
        room: userContext.room,
        phoneOrExt: userContext.phoneOrExt,
        category: flow?.flow.category ?? inferCategory(userText),
        assetTag: userContext.assetTag,
        title: isStudent ? `Loaner request: ${summary}` : `${summary} (${userContext.room})`,
        description: [reason, userText && `Reported: ${userText}`].filter(Boolean).join('\n\n'),
        troubleshootStepsAttempted: flow?.tried ?? [],
        teacherAvailability: isStudent ? 'Will visit the Media Center' : userContext.role === 'teacher_active' ? `In ${userContext.room} now` : 'Available during planning period',
      });
      onTicketCreated(ticket);
      setFlow(null);
      const lines = isStudent
        ? ['Your loaner request is logged.', `Ticket number: ${ticket.ticketNumber}`, 'Go to: Media Center Tech Desk', 'Bring your Chromebook so a technician can swap it.']
        : [
            'Your service request is logged.',
            `Ticket number: ${ticket.ticketNumber}`,
            ticket.priority === 'critical' ? 'Priority 1: flagged at the top of the technician queue.' : `Priority: ${ticket.priority === 'high' ? '2' : '3'}`,
            `Location: ${ticket.room} (${ticket.school})`,
            `Routed to: ${ticket.assignedTech || `the shared ${ticket.school} queue`}`,
            `Notes from troubleshooting are attached. If it is urgent and nobody arrives, call ${HELP_DESK.ext}.`,
          ];
      add({
        from: 'bot',
        text: lines.join('\n'),
        tone: 'info',
        ticket,
        choices: [{ key: 'print', label: isStudent ? 'Print loaner pass' : 'Print dispatch slip' }, { key: 'new', label: 'Start new request', tone: 'primary' }],
      });
    } catch (err) {
      const limited = err instanceof ApiError && err.status === 429;
      add({
        from: 'bot',
        text: `${err instanceof ApiError ? err.message : 'Something went wrong.'}\n\nNothing was logged. You can try again, or call ${HELP_DESK.ext}.`,
        tone: 'warning',
        label: limited ? 'Limit reached' : 'Not sent',
        choices: limited ? [{ key: 'new', label: 'Start new request' }, { key: 'contact', label: 'Contact IT' }] : [asChoice(escalateLabel), { key: 'contact', label: 'Contact IT' }],
      });
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;
    if (cooldown > 0) return setWarning(`Please wait ${cooldown}s before sending another message.`);
    const t = Date.now();
    if (text.toLowerCase() === last.text.toLowerCase() && t - last.at < 3000) return setWarning('Please wait a moment before sending the same message again.');
    if (text.length > MAX_MESSAGE_LENGTH) return setWarning(`Please keep messages under ${MAX_MESSAGE_LENGTH} characters.`);
    setLast({ text, at: t });
    setInput('');
    add({ from: 'user', text });

    if (DAMAGE_WORDS.test(text)) {
      add({
        from: 'bot',
        text: isStudent
          ? 'Damaged devices cannot be fixed with troubleshooting steps. A technician at the Media Center Tech Desk will swap it for a loaner so you do not miss assignments.\n\nSelect "Request loaner device" to log it, then bring your Chromebook to the desk.'
          : 'Physically damaged equipment needs a technician or a replacement.\n\nSelect "Submit IT ticket" and a technician will follow up.',
        choices: [asChoice(escalateLabel), { key: 'contact', label: 'Contact IT' }],
      });
      return;
    }
    const matched = matchFlow(text);
    if (matched) return startFlow(matched);

    setLoading(true);
    try {
      const history = [...messages.map(m => ({ role: m.from === 'user' ? ('user' as const) : ('model' as const), content: m.text })), { role: 'user' as const, content: text }];
      const data = await sendChat(history, { deviceType: userContext.deviceType });
      if (data.isSafetyBlocked) {
        add({ from: 'bot', text: data.text, tone: 'warning', label: 'Policy notice', choices: (data.suggestedActions ?? CHAT_MENU[isStudent ? 'student' : 'staff']).map(asChoice) });
        return;
      }
      add({
        from: 'bot',
        text: data.text,
        // Built-in answers list every step at once, so there is no "next step" to offer.
        choices: data.needsEscalation ? [asChoice(escalateLabel), asChoice('Issue resolved'), { key: 'contact', label: 'Contact IT' }] : (data.suggestedActions ?? []).map(asChoice),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const wait = Number(err.details?.cooldownSeconds) || 15;
        setCooldown(wait);
        add({ from: 'bot', text: typeof err.details?.text === 'string' ? err.details.text : `Please wait ${wait} seconds before sending another message.`, tone: 'warning', label: 'Message limit', choices: [{ key: 'contact', label: 'Contact IT' }] });
        return;
      }
      add({
        from: 'bot',
        text: `${BRAND_NAME} could not reach the help desk server. Check your connection and try again, or call ${HELP_DESK.ext}.`,
        tone: 'warning',
        label: 'Connection problem',
        choices: [{ key: 'contact', label: 'Contact IT' }],
      });
    } finally {
      setLoading(false);
    }
  };

  const onPick = (key: string) => {
    if (key === 'resolved') resolved();
    else if (key === 'next') nextStep();
    else if (key === 'escalate') void escalate(flow ? 'Troubleshooting completed without resolution.' : 'User requested a technician or loaner.');
    else if (key === 'print') {
      const ticket = [...messages].reverse().find(m => m.ticket)?.ticket;
      if (ticket) onViewDispatchSlip(ticket);
    } else if (key === 'contact') onContactIT();
    else if (key === 'new') {
      setFlow(null);
      setMessages(welcome());
    } else if (key.startsWith('text:')) void send(key.slice(5));
  };

  const latest = messages[messages.length - 1];

  return (
    <>
      <ChatFrame
        logLabel="Conversation"
        scrollKey={`${messages.length}-${loading}`}
        title={
          <p className="flex flex-wrap items-center gap-x-2 text-sm sm:text-base text-gray-700">
            <span className="font-semibold text-gray-900">{userContext.school}</span>
            <span aria-hidden="true" className="text-gray-400">•</span>
            <span>{userContext.room}</span>
            <button type="button" onClick={() => setDialog('location')} className="underline text-gray-700 hover:text-gray-900">Change<span className="sr-only"> location</span></button>
          </p>
        }
        headerActions={
          !isStudent && (
            <select
              aria-label="Your situation"
              value={userContext.role}
              onChange={e => onUpdateUserContext({ ...userContext, role: e.target.value as UserContext['role'] })}
              className={`px-2 py-1 rounded-lg text-sm font-medium border ${userContext.role === 'teacher_active' ? 'bg-red-50 text-red-800 border-red-300' : 'bg-white text-gray-800 border-gray-400'}`}
            >
              <option value="teacher_active">Class in session (Priority 1)</option>
              <option value="teacher_prep">Planning period (Priority 2)</option>
              <option value="staff">Not teaching (standard)</option>
            </select>
          )
        }
        footer={
          <>
            {cooldown > 0 && <p role="status" className="mb-2 text-sm text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg">Please wait <strong>{cooldown}s</strong> before sending another message.</p>}
            {warning && <p role="alert" className="mb-2 text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{warning}</p>}
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={() => void send(input)}
              placeholder={cooldown > 0 ? `Please wait ${cooldown}s...` : isStudent ? 'Describe your Chromebook issue...' : 'Describe your classroom IT issue...'}
              disabled={loading || cooldown > 0}
              sendLabel="Send"
              sendText={cooldown > 0 ? `${cooldown}s` : undefined}
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDialog('guidelines')} className="underline hover:text-gray-900">IT support guidelines</button>
                <span aria-hidden="true">•</span>
                <button type="button" onClick={onContactIT} className="underline hover:text-gray-900">Help desk: {HELP_DESK.ext}</button>
              </div>
              <span className="font-mono" aria-label={`${input.length} of ${MAX_MESSAGE_LENGTH} characters`}>{input.length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
          </>
        }
      >
        {messages.map(m => (
          <ChatBubble key={m.id} from={m.from} tone={m.tone} label={m.label} meta={m.time}>
            {m.step && (
              <span className="block mb-2.5 p-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-900">
                <span className="block text-xs font-semibold text-gray-600 mb-0.5">Recommended action</span>
                {m.step.action}
              </span>
            )}
            {m.text}
            {m.step && (
              <>
                <span className="block mt-2.5 bg-white p-2.5 rounded-lg border border-gray-200 text-gray-800">{m.step.instruction}</span>
                {m.step.detail && <span className="block mt-2 text-gray-600 italic">Note: {m.step.detail}</span>}
              </>
            )}
            {m.ticket && (
              <span className="mt-3 p-3 bg-white border border-gray-300 rounded-lg flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">{isStudent ? 'Media Center loaner request' : 'Technician work order'}</span>
                <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded-lg border border-gray-200">{m.ticket.ticketNumber}</span>
              </span>
            )}
          </ChatBubble>
        ))}
        {loading && <p className="text-sm sm:text-base text-gray-600 italic">Checking troubleshooting steps...</p>}
        {!loading && latest.choices && <ChoiceChips choices={latest.choices} onPick={onPick} label="Choices" />}
      </ChatFrame>

      {dialog === 'location' && <LocationDialog context={userContext} isStudent={isStudent} onSave={onUpdateUserContext} onClose={() => setDialog(null)} />}
      {dialog === 'guidelines' && <GuidelinesDialog onClose={() => setDialog(null)} />}
    </>
  );
};
