import React, { useState, useRef, useEffect } from 'react';
import { UserContext, Ticket, IssueCategory } from '../types';
import { ApiError, createTicket, sendChat } from '../api';
import { HELP_DESK, schoolsFor } from '../data/schools';

const MAX_MESSAGE_LENGTH = 1000;

function inferCategory(text: string): IssueCategory {
  const t = text.toLowerCase();
  if (/(smartboard|promethean|projector|board|hdmi|display|no signal)/.test(t)) return 'smartboard';
  if (/(sound|audio|speaker|microphone|headphone)/.test(t)) return 'audio_video';
  if (/(copier|printer|print|badge)/.test(t)) return 'printer';
  if (/(wi-?fi|network|internet)/.test(t)) return 'network';
  if (/(password|login|log in|account|clever)/.test(t)) return 'account';
  if (/(chromebook|laptop)/.test(t)) return 'chromebook';
  return 'other';
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  content: string;
  timestamp: string;
  stepsList?: string[];
  kbSource?: { title: string; url?: string };
  actionCallout?: string;
  note?: string;
  suggestedActions?: string[];
  escalationTicket?: Ticket;
  isSafetyBlocked?: boolean;
  isRateLimited?: boolean;
}

interface TeacherChatBotProps {
  userContext: UserContext;
  onUpdateUserContext: (ctx: UserContext) => void;
  onTicketCreated: (ticket: Ticket) => void;
  onViewDispatchSlip: (ticket: Ticket) => void;
  onContactIT?: () => void;
  demoMode: boolean;
}

export const TeacherChatBot: React.FC<TeacherChatBotProps> = ({
  userContext,
  onUpdateUserContext,
  onTicketCreated,
  onViewDispatchSlip,
  onContactIT,
  demoMode
}) => {
  const isStudent = userContext.role === 'student';

  const getInitialMessages = (): Message[] => [
    {
      id: 'msg-welcome',
      sender: 'bot',
      content: "Describe your IT issue, and I'll help you find the next step.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: isStudent ? [
        'Chromebook will not turn on',
        'Cannot connect to school Wi-Fi',
        'Forgot account password or login',
        'Headphones or microphone not working',
        'Chromebook damaged or need loaner'
      ] : [
        'Smartboard or display shows "No Signal"',
        'Student Chromebook cannot connect to Wi-Fi',
        'Audio playing from laptop instead of room speakers',
        'Copier badge reader not responding',
        'Student locked out of district Google account'
      ]
    }
  ];

  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [lastSentText, setLastSentText] = useState<string>('');
  const [lastSentTimestamp, setLastSentTimestamp] = useState<number>(0);
  const [spamWarning, setSpamWarning] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [tempContext, setTempContext] = useState<UserContext>(userContext);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentTroubleshootFlow, setCurrentTroubleshootFlow] = useState<{
    topic: string;
    stepIndex: number;
    steps: {
      action: string;
      instruction: string;
      detail?: string;
    }[];
    kbSource?: { title: string; url?: string };
    stepsAttempted: string[];
  } | null>(null);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  useEffect(() => {
    setMessages(getInitialMessages());
    setCurrentTroubleshootFlow(null);
    setCooldownRemaining(0);
    setSpamWarning(null);
  }, [userContext.role, userContext.userName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startGuidedFlow = (topicKey: string) => {
    let flowData: {
      topic: string;
      steps: { action: string; instruction: string; detail?: string }[];
      kbSource?: { title: string; url?: string };
    };

    if (topicKey.includes('turn on') || topicKey.includes('black screen') || (isStudent && topicKey.includes('Chromebook will not turn on'))) {
      flowData = {
        topic: 'Chromebook Power & Display Reset',
        kbSource: { title: 'District KB #102: Student Chromebook Power Troubleshooting' },
        steps: [
          {
            action: 'Verify charging connection',
            instruction: 'Connect the power adapter to the charging port. Check if the small LED indicator light beside the port turns on.',
            detail: 'If the battery is completely discharged, leave the adapter connected for at least 60 seconds.'
          },
          {
            action: 'Perform a hardware refresh',
            instruction: 'Press and hold the circular Refresh key (located along the top row of keys), then press the Power button once. Release both keys when the screen flickers.',
            detail: 'This resets internal hardware controllers and will not erase saved schoolwork or Google Drive files.'
          },
          {
            action: 'Inspect for physical damage or loose keys',
            instruction: 'Check the screen and chassis for physical cracks or liquid damage. If damaged, a replacement loaner is required.',
            detail: 'The Media Center library desk provides replacement devices.'
          }
        ]
      };
    } else if (topicKey.includes('Wi-Fi') || topicKey.includes('internet') || topicKey.includes('connect')) {
      flowData = {
        topic: 'District Wi-Fi Connection',
        kbSource: { title: 'District KB #108: Campus Wireless Authentication & Certificate Sync' },
        steps: [
          {
            action: 'Toggle Wi-Fi connection',
            instruction: 'Select the bottom-right clock area, turn Wi-Fi off, wait 5 seconds, and turn it back on. Select "District-Secure".',
            detail: 'Verify the device is not connected to a personal phone hotspot.'
          },
          {
            action: 'Forget and rejoin the district network',
            instruction: 'Click "Known networks", select "District-Secure", and choose "Forget". Re-select it and authenticate using your district email and password.',
            detail: 'Ensure the EAP method is set to PEAP and Phase 2 authentication is set to MSCHAPv2.'
          },
          {
            action: 'Restart device network stack',
            instruction: 'Hold the circular Refresh key and press Power once to clear temporary network leases.',
            detail: 'If DHCP fails repeatedly, the unit may require a network certificate re-enrollment.'
          }
        ]
      };
    } else if (topicKey.includes('No Signal') || topicKey.includes('Smartboard') || topicKey.includes('display')) {
      flowData = {
        topic: 'Classroom Display & Smartboard Connection',
        kbSource: { title: 'District KB #204: Promethean ActivPanel & Teacher Laptop Routing' },
        steps: [
          {
            action: 'Reseat the video cable',
            instruction: 'Unplug the HDMI or USB-C display cable from the laptop, wait 3 seconds, and firmly reconnect it.',
            detail: 'Ensure the other end is securely plugged into the classroom wall plate or panel input.'
          },
          {
            action: 'Set display mode to Duplicate',
            instruction: 'Press the Windows key and tap P. In the project sidebar on the right, select "Duplicate".',
            detail: 'If set to "PC screen only", the classroom projector or panel will show No Signal.'
          },
          {
            action: 'Verify input source on panel',
            instruction: 'Use the front panel Source button or remote to verify the selected input matches the cable port (e.g. HDMI 1 or Front HDMI).',
            detail: 'Also verify the panel freeze function is toggled off.'
          }
        ]
      };
    } else if (topicKey.includes('speakers') || topicKey.includes('Sound') || topicKey.includes('Audio') || topicKey.includes('Headphones')) {
      flowData = {
        topic: 'Audio Output Configuration',
        kbSource: { title: 'District KB #305: Classroom Sound & Headphone Troubleshooting' },
        steps: [
          {
            action: 'Select correct audio output device',
            instruction: 'Click the speaker volume icon in the bottom-right taskbar. Click the audio device selector and choose the classroom speakers or display rather than laptop speakers.',
            detail: 'Classroom amplifiers are typically labeled "Extron Audio" or "Display Audio".'
          },
          {
            action: 'Check physical cable connection',
            instruction: 'Ensure the 3.5mm green audio wire is firmly plugged into the laptop headphone jack and classroom wall port.',
            detail: 'Ensure volume knobs on classroom wall plates or speakers are turned up.'
          }
        ]
      };
    } else if (topicKey.includes('badge') || topicKey.includes('Copier') || topicKey.includes('Printer')) {
      flowData = {
        topic: 'PaperCut Copier Badge Scanner',
        kbSource: { title: 'District KB #410: PaperCut MFP Authentication & PIN Workaround' },
        steps: [
          {
            action: 'Use manual PIN login',
            instruction: 'Touch "ID Number / PIN" on the copier screen and enter your 4-digit district staff PIN.',
            detail: 'This allows immediate printing while the RFID badge reader is inspected.'
          },
          {
            action: 'Check badge scanner USB cable',
            instruction: 'Ensure the small black tap-box cable connected to the rear USB port of the copier is firmly inserted.',
            detail: 'If the scanner light remains red, the driver service requires an administrative restart.'
          }
        ]
      };
    } else if (topicKey.includes('password') || topicKey.includes('login') || topicKey.includes('account')) {
      flowData = {
        topic: 'District Account & Password Reset',
        kbSource: { title: 'District KB #101: Student Google Workspace & Clever Login Recovery' },
        steps: [
          {
            action: 'Check caps lock and username format',
            instruction: 'Ensure Caps Lock is turned off. Verify the username is the full district email address.',
            detail: 'Make sure no trailing spaces were copied into the login box.'
          },
          {
            action: 'Reset password via Clever or Teacher Portal',
            instruction: 'Teachers can reset student passwords instantly from Clever Portal -> My Students -> Reset Password.',
            detail: 'If the student is locked out of Google 2-Step Verification, an administrator ticket is required.'
          }
        ]
      };
    } else {
      flowData = {
        topic: 'Hardware & System Diagnostic',
        kbSource: { title: 'District KB #100: General Equipment Checklist' },
        steps: [
          {
            action: 'Inspect cables and power',
            instruction: 'Verify power cords and peripheral cables are connected securely to working outlets.',
            detail: 'Check for physical power switch status on equipment.'
          },
          {
            action: 'Restart device',
            instruction: 'Save current documents and perform a full device restart to clear pending system updates.',
            detail: 'Avoid holding the power button unless standard shut down does not respond.'
          }
        ]
      };
    }

    const firstStep = flowData.steps[0];
    setCurrentTroubleshootFlow({
      topic: flowData.topic,
      stepIndex: 0,
      steps: flowData.steps,
      kbSource: flowData.kbSource,
      stepsAttempted: [firstStep.action]
    });

    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      content: `Troubleshooting: ${flowData.topic} (Step 1 of ${flowData.steps.length})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      stepsList: [firstStep.instruction],
      actionCallout: firstStep.action,
      note: firstStep.detail,
      kbSource: flowData.kbSource,
      suggestedActions: [
        'Issue resolved',
        flowData.steps.length > 1 ? 'Try next step' : (isStudent ? 'Request loaner device' : 'Submit IT ticket'),
        isStudent ? 'Request loaner device' : 'Submit IT ticket'
      ]
    };

    setMessages(prev => [...prev, botMsg]);
  };

  const handleNextStep = () => {
    if (!currentTroubleshootFlow) return;

    const nextIndex = currentTroubleshootFlow.stepIndex + 1;
    if (nextIndex < currentTroubleshootFlow.steps.length) {
      const nextStep = currentTroubleshootFlow.steps[nextIndex];
      const updatedStepsAttempted = [...currentTroubleshootFlow.stepsAttempted, nextStep.action];

      setCurrentTroubleshootFlow({
        ...currentTroubleshootFlow,
        stepIndex: nextIndex,
        stepsAttempted: updatedStepsAttempted
      });

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: `Troubleshooting: ${currentTroubleshootFlow.topic} (Step ${nextIndex + 1} of ${currentTroubleshootFlow.steps.length})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stepsList: [nextStep.instruction],
        actionCallout: nextStep.action,
        note: nextStep.detail,
        kbSource: currentTroubleshootFlow.kbSource,
        suggestedActions: [
          'Issue resolved',
          nextIndex + 1 < currentTroubleshootFlow.steps.length ? 'Try next step' : (isStudent ? 'Request loaner device' : 'Submit IT ticket'),
          isStudent ? 'Request loaner device' : 'Submit IT ticket'
        ]
      };
      setMessages(prev => [...prev, botMsg]);
    } else {
      handleEscalateTicket('Troubleshooting steps completed without resolution.');
    }
  };

  const handleIssueResolved = () => {
    setCurrentTroubleshootFlow(null);
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      content: 'The issue is marked as resolved. No service request is required.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        'Start new request',
        'Close'
      ]
    };
    setMessages(prev => [...prev, botMsg]);
  };

  const handleEscalateTicket = async (reason?: string) => {
    const isUrgentTeacher = userContext.role === 'teacher_active';
    const topic = currentTroubleshootFlow?.topic || '';
    const userText = messages
      .filter(m => m.sender === 'user')
      .slice(-3)
      .map(m => m.content)
      .join(' | ')
      .slice(0, 600);
    const summary = topic || userText.slice(0, 80) || (isStudent ? 'Student device issue' : 'Classroom technology issue');
    const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      // The server decides role, priority, routing, and the ticket number. We show what it returns.
      const ticket = await createTicket({
        userRole: userContext.role,
        school: userContext.school,
        room: userContext.room,
        phoneOrExt: userContext.phoneOrExt,
        category: inferCategory(`${topic} ${userText}`),
        assetTag: userContext.assetTag,
        title: isStudent ? `Loaner request: ${summary}` : `${summary} (${userContext.room})`,
        description:
          [reason || 'Troubleshooting did not resolve the issue.', userText && `Reported: ${userText}`].filter(Boolean).join('\n\n'),
        troubleshootStepsAttempted: currentTroubleshootFlow?.stepsAttempted || [],
        teacherAvailability: isStudent
          ? 'Will visit the Media Center'
          : isUrgentTeacher
          ? `In ${userContext.room} now`
          : 'Available during planning period',
      });

      onTicketCreated(ticket);
      setCurrentTroubleshootFlow(null);

      const lines = isStudent
        ? [
            'Your loaner request is logged.',
            `Ticket number: ${ticket.ticketNumber}`,
            'Go to: Media Center Tech Desk',
            'Bring your Chromebook so a technician can swap it.',
          ]
        : [
            'Your service request is logged.',
            `Ticket number: ${ticket.ticketNumber}`,
            ticket.priority === 'critical' ? 'Priority 1: flagged at the top of the technician queue.' : `Priority: ${ticket.priority}`,
            `Location: ${ticket.room} (${ticket.school})`,
            `Routed to: ${ticket.assignedTech}`,
            `Notes from troubleshooting are attached. If it is urgent and nobody arrives, call ${HELP_DESK.ext}.`,
          ];

      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          content: lines.join('\n\n'),
          timestamp: time(),
          escalationTicket: ticket,
          suggestedActions: [isStudent ? 'Print Loaner Pass' : 'Print Dispatch Slip', 'Start new request'],
        },
      ]);
    } catch (err) {
      const limited = err instanceof ApiError && err.status === 429;
      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          content: `${limited ? 'Notice: ' : 'The request was not submitted. '}${
            err instanceof ApiError ? err.message : 'Something went wrong.'
          }\n\nNothing was logged. You can try again, or call ${HELP_DESK.ext}.`,
          timestamp: time(),
          isSafetyBlocked: limited,
          suggestedActions: limited ? ['Start new request', 'Contact IT'] : [isStudent ? 'Request loaner device' : 'Submit IT ticket', 'Contact IT'],
        },
      ]);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputValue).trim();
    if (!text || loading) return;

    if (cooldownRemaining > 0) {
      setSpamWarning(`Rate limit active. Please wait ${cooldownRemaining}s.`);
      setTimeout(() => setSpamWarning(null), 3000);
      return;
    }

    const now = Date.now();
    if (text.toLowerCase() === lastSentText.toLowerCase() && now - lastSentTimestamp < 3000) {
      setSpamWarning('Please wait a moment before sending the same message again.');
      setTimeout(() => setSpamWarning(null), 3000);
      return;
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      setSpamWarning(`Please keep messages under ${MAX_MESSAGE_LENGTH} characters.`);
      setTimeout(() => setSpamWarning(null), 3500);
      return;
    }

    setLastSentText(text);
    setLastSentTimestamp(now);

    const lower = text.toLowerCase();

    if (/(broken|cracked|crack|spill|spilled|water|dropped|key missing|damaged|loaner)/.test(lower)) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        { id: `user-${Date.now()}`, sender: 'user', content: text, timestamp: time },
        {
          id: `bot-${Date.now() + 1}`,
          sender: 'bot',
          content: isStudent
            ? 'Damaged devices cannot be fixed with troubleshooting steps. A technician at the Media Center Tech Desk will swap it for a loaner so you do not miss assignments.\n\nSelect "Request loaner device" to log it, then bring your Chromebook to the desk.'
            : 'Physically damaged equipment needs a technician or a replacement.\n\nSelect "Submit IT ticket" and a technician will follow up.',
          timestamp: time,
          suggestedActions: [isStudent ? 'Request loaner device' : 'Submit IT ticket', 'Contact IT'],
        },
      ]);
      setInputValue('');
      return;
    }

    const matchingCommon = [
      'no signal', 'smartboard', 'display', 'screen is blank', 'turn on',
      'black screen', 'broken', 'loaner', 'password', 'login', 'headphones',
      'microphone', 'chromebook', 'internet', 'wi-fi', 'sound', 'speakers',
      'copier', 'badge'
    ];

    if (matchingCommon.some(kw => lower.includes(kw))) {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        sender: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMsg]);
      setInputValue('');
      startGuidedFlow(text);
      return;
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const data = await sendChat(
        [...messages, userMsg].map(m => ({ role: m.sender === 'user' ? 'user' : 'model', content: m.content })),
        {
          role: userContext.role,
          school: userContext.school,
          room: userContext.room,
          deviceType: userContext.deviceType,
          assetTag: userContext.assetTag,
        },
      );

      if (data.isSafetyBlocked) {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          content: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSafetyBlocked: true,
          suggestedActions: data.suggestedActions || (isStudent ? [
            'Chromebook will not turn on',
            'Cannot connect to school Wi-Fi',
            'Forgot account password or login'
          ] : [
            'Smartboard or display shows "No Signal"',
            'Student Chromebook cannot connect to Wi-Fi',
            'Audio playing from laptop instead of room speakers'
          ])
        };
        setMessages(prev => [...prev, botMsg]);
        return;
      }

      // Clean out any lingering emojis
      const cleanText = (data.text || '').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: cleanText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: data.needsEscalation ? [
          isStudent ? 'Request loaner device' : 'Submit IT ticket',
          'Issue resolved',
          'Contact IT'
        ] : [
          'Issue resolved',
          'Try next step',
          isStudent ? 'Request loaner device' : 'Submit IT ticket'
        ]
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const waitSec = Number(err.details?.cooldownSeconds) || 15;
        setCooldownRemaining(waitSec);
        const text = typeof err.details?.text === 'string' ? err.details.text : `Rate limit active: Please wait ${waitSec} seconds before sending another message.`;
        const limitedMsg: Message = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSafetyBlocked: true,
          isRateLimited: true,
          suggestedActions: [
            isStudent ? 'Chromebook will not turn on' : 'Smartboard or display shows "No Signal"',
            'Contact IT',
          ],
        };
        setMessages(prev => [...prev, limitedMsg]);
        return;
      }
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: (isStudent
          ? "Troubleshooting steps for your Chromebook:\n\n1. Check the power light: Plug in the charger and verify the indicator light turns on.\n2. Hardware refresh: Hold the circular refresh key and press the power button once.\n3. Need a loaner? Visit the Media Center Tech Desk for a replacement."
          : `Troubleshooting steps for ${userContext.room}:\n\n1. Check the display cable: Ensure the HDMI cord is connected firmly between your laptop and the wall plate.\n2. Display setting: Press Windows + P and select "Duplicate".\n3. If unresolved, submit a request for an on-campus technician visit.`) + `\n\n(Greg Bot could not reach the help desk server, so these are general steps.)`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          'Issue resolved',
          'Try next step',
          isStudent ? 'Request loaner device' : 'Submit IT ticket'
        ]
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    if (action.includes('resolved') || action.includes('Close')) {
      handleIssueResolved();
    } else if (action.includes('next step') || action.includes('Next step')) {
      handleNextStep();
    } else if (action.includes('Submit IT ticket') || action.includes('loaner device') || action.includes('Request loaner')) {
      handleEscalateTicket(currentTroubleshootFlow ? 'Troubleshooting completed without resolution.' : 'User requested a technician or loaner.');
    } else if (action.includes('Print') || action.includes('Slip') || action.includes('Pass')) {
      const lastTicket = [...messages].reverse().find(m => m.escalationTicket)?.escalationTicket;
      if (lastTicket) {
        onViewDispatchSlip(lastTicket);
      }
    } else if (action.includes('Contact IT')) {
      if (onContactIT) onContactIT();
      else handleEscalateTicket('User requested direct technician dispatch.');
    } else if (action.includes('Start new request')) {
      setCurrentTroubleshootFlow(null);
      setMessages(getInitialMessages());
    } else {
      handleSendMessage(action);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-300 rounded-md shadow-xs overflow-hidden">
      {/* Context Subheader - Room & Status */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-medium text-gray-900">{userContext.school}</span>
          <span className="text-gray-300">•</span>
          <span>{userContext.room}</span>
          <button
            type="button"
            onClick={() => {
              setTempContext(userContext);
              setShowLocationModal(true);
            }}
            className="text-blue-700 hover:text-blue-900 underline text-[11px]"
          >
            Change
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isStudent && (
            <select
              aria-label="Your situation"
              value={userContext.role}
              onChange={e => onUpdateUserContext({ ...userContext, role: e.target.value as UserContext['role'] })}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                userContext.role === 'teacher_active' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              <option value="teacher_active">Class in session (Priority 1)</option>
              <option value="teacher_prep">Planning period (Priority 2)</option>
              <option value="staff">Not teaching (standard)</option>
            </select>
          )}
        </div>
      </div>

      {/* Message Feed - Single Column */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[85%] text-xs sm:text-sm leading-relaxed p-3.5 rounded ${
                msg.sender === 'user'
                  ? 'bg-gray-800 text-white'
                  : msg.isSafetyBlocked
                  ? 'bg-amber-50/70 border border-amber-300 text-gray-900'
                  : 'bg-gray-50 border border-gray-200 text-gray-800'
              }`}
            >
              {/* Safety notice indicator */}
              {msg.isSafetyBlocked && (
                <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider pb-1 mb-2 border-b border-amber-200">
                  {msg.isRateLimited ? 'Rate Limit Notice' : 'Policy Notice'}
                </div>
              )}

              {/* Action Callout if provided */}
              {msg.actionCallout && (
                <div className="mb-2.5 p-2 bg-white border border-gray-300 rounded text-xs font-medium text-gray-900">
                  <span className="font-semibold text-gray-700 uppercase tracking-wider text-[10px] block text-gray-500 mb-0.5">
                    Recommended Action
                  </span>
                  {msg.actionCallout}
                </div>
              )}

              {/* Text Content */}
              <div className="whitespace-pre-line space-y-1.5">
                {msg.content.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              {/* Numbered Steps List */}
              {msg.stepsList && msg.stepsList.length > 0 && (
                <ol className="mt-2.5 list-decimal list-inside space-y-1 text-xs text-gray-700 bg-white p-2.5 rounded border border-gray-200">
                  {msg.stepsList.map((step, idx) => (
                    <li key={idx} className="leading-snug">{step}</li>
                  ))}
                </ol>
              )}

              {/* Understated Note */}
              {msg.note && (
                <p className="mt-2 text-xs text-gray-500 italic">
                  Note: {msg.note}
                </p>
              )}

              {/* Reference link: only shown when a real article URL is configured */}
              {msg.kbSource?.url && (
                <div className="mt-2 pt-2 border-t border-gray-200/80 text-[11px] text-gray-500">
                  <span className="text-gray-400">Reference: </span>
                  <a href={msg.kbSource.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                    {msg.kbSource.title}
                  </a>
                </div>
              )}

              {/* Escalation Ticket Details Box */}
              {msg.escalationTicket && (
                <div className="mt-3 p-3 bg-white border border-gray-300 rounded text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">
                      {isStudent ? 'Media Center Loaner Request' : 'Technician Work Order'}
                    </span>
                    <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                      {msg.escalationTicket.ticketNumber}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    Location: {msg.escalationTicket.room} • Status: {msg.escalationTicket.status}
                  </p>
                  <button
                    type="button"
                    onClick={() => onViewDispatchSlip(msg.escalationTicket!)}
                    className="w-full py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium text-xs text-center border border-gray-300 transition"
                  >
                    {isStudent ? 'Print Loaner Pass' : 'Print Dispatch Slip'}
                  </button>
                </div>
              )}

              <span className={`block text-[10px] mt-1.5 text-right ${msg.sender === 'user' ? 'text-gray-300' : 'text-gray-400'}`}>
                {msg.timestamp}
              </span>
            </div>

            {/* Suggested Action Buttons */}
            {msg.suggestedActions && msg.suggestedActions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-w-[92%] sm:max-w-[85%]">
                {msg.suggestedActions.map((action, idx) => {
                  const isPrimary = action.includes('resolved') || action.includes('next step') || action.includes('Next step');
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleActionClick(action)}
                      className={`text-xs px-2.5 py-1.5 rounded border transition font-medium text-left ${
                        isPrimary
                          ? 'bg-white hover:bg-gray-50 border-gray-400 text-gray-900'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700'
                      }`}
                    >
                      {action}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="text-xs text-gray-500 italic p-2">
            Checking troubleshooting steps...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 shrink-0">
        {/* Rate limit warning */}
        {cooldownRemaining > 0 && (
          <div className="mb-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
            Rate limit active. Please wait <strong>{cooldownRemaining}s</strong> before sending another message.
          </div>
        )}

        {/* Spam warning */}
        {spamWarning && (
          <div className="mb-2 text-xs text-red-800 bg-red-50 border border-red-200 px-3 py-1.5 rounded">
            {spamWarning}
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={
              cooldownRemaining > 0
                ? `Please wait ${cooldownRemaining}s...`
                : isStudent
                ? 'Describe your Chromebook issue...'
                : 'Describe your classroom IT issue...'
            }
            disabled={loading || cooldownRemaining > 0}
            className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || loading || cooldownRemaining > 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:hover:bg-blue-700 rounded transition shrink-0"
          >
            {cooldownRemaining > 0 ? `${cooldownRemaining}s` : 'Send'}
          </button>
        </form>

        {/* Quiet Footer Links */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPolicyModal(true)}
              className="text-gray-500 hover:text-gray-700 underline text-left"
            >
              IT Support Guidelines
            </button>
            <span className="text-gray-300">•</span>
            {onContactIT && (
              <button
                type="button"
                onClick={onContactIT}
                className="text-gray-500 hover:text-gray-700 underline text-left"
              >
                Help Desk: {HELP_DESK.ext}
              </button>
            )}
          </div>
          <span className="font-mono text-gray-400">
            {inputValue.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
      </div>

      {/* Edit Location Dialog */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-gray-300 rounded-lg max-w-sm w-full p-5 text-gray-900 shadow-md">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {isStudent ? 'Student Profile' : 'Classroom Location'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Technicians dispatch based on your specified room.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">School</label>
                <select
                  value={tempContext.school}
                  onChange={e => setTempContext({ ...tempContext, school: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900"
                >
                  {schoolsFor(demoMode).map(sc => (
                    <option key={sc.id} value={sc.name}>{sc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Room</label>
                <input
                  type="text"
                  value={tempContext.room}
                  onChange={e => setTempContext({ ...tempContext, room: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Phone or Ext</label>
                <input
                  type="text"
                  value={tempContext.phoneOrExt}
                  onChange={e => setTempContext({ ...tempContext, phoneOrExt: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateUserContext(tempContext);
                  setShowLocationModal(false);
                }}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guidelines Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-gray-300 rounded-lg max-w-md w-full p-5 text-gray-900 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">District IT Help Desk Guidelines</h3>
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-gray-600 leading-relaxed">
              <p>
                <strong>Scope:</strong> Greg Bot is designed strictly for school district technology troubleshooting (Chromebooks, classroom displays, network connectivity, and district accounts).
              </p>
              <p>
                <strong>Rate Limiting:</strong> Requests are limited to 5 messages per 30-second window to prevent system flooding.
              </p>
              <p>
                <strong>Student Loaner Passes:</strong> Students can only have a limited number of open requests at once. If you reach the limit, contact the main office or a technician.
              </p>
              <p>
                <strong>Privacy:</strong> Do not enter passwords or confidential student records. Free-text questions are answered from built-in help text on the help desk server. Nothing you type is sent to an outside service.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
