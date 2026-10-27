import type {
  DispositionValue,
  Language,
  NotificationDraft,
  StudentCaseView,
  SupportCase,
  SupportIssue,
} from '../src/types';

/** Strip everything a student's own browser should not see (technician fields, the expected tag). */
export function toStudentView(c: SupportCase): StudentCaseView {
  const { disposition: _d, notificationDraft: _n, history: _h, deviceCheck, ...rest } = c;
  const view: StudentCaseView = { ...rest };
  if (deviceCheck) {
    const { expectedTag: _e, ...safe } = deviceCheck;
    view.deviceCheck = safe;
  }
  return view;
}

/**
 * Body for the existing ticket validator. Always English: technicians read it.
 * Identity, role, priority and routing are still decided by parseTicketInput.
 */
export function buildTicketBody(c: SupportCase, issue: SupportIssue) {
  const tried = c.attempts.map(a => {
    const step = issue.steps.find(s => s.id === a.stepId);
    return `${step?.label ?? a.stepId} (${a.result === 'worked' ? 'worked' : 'did not work'})`;
  });
  const lines = [
    `Student support case ${c.caseNumber} (prototype demo, fictional data).`,
    `Issue: ${issue.title.en}.`,
    `Student language: ${c.language === 'es' ? 'Spanish' : 'English'}.`,
  ];
  if (c.reported.description) lines.push(`Student's own words: ${c.reported.description}`);
  return {
    school: c.student.school,
    room: c.student.room,
    category: issue.category,
    assetTag: c.deviceCheck?.enteredTag,
    title: `Student support (demo): ${issue.title.en}`,
    description: lines.join('\n'),
    troubleshootStepsAttempted: tried,
    teacherAvailability: 'Will visit the Media Center',
  };
}

type Template = { subject: (ticket: string) => string; body: (name: string, ticket: string) => string };

const DRAFTS: Record<DispositionValue, Record<Language, Template>> = {
  loaner_approved: {
    en: {
      subject: t => `Update on your request ${t}`,
      body: (n, t) => `Hi ${n},\n\nA technician reviewed your request ${t} and approved a loaner Chromebook. Please bring your Chromebook to the Media Center Tech Desk.`,
    },
    es: {
      subject: t => `Actualización de tu solicitud ${t}`,
      body: (n, t) => `Hola ${n}:\n\nUn técnico revisó tu solicitud ${t} y aprobó una Chromebook prestada. Por favor, lleva tu Chromebook al Media Center Tech Desk.`,
    },
  },
  in_person_check: {
    en: {
      subject: t => `Update on your request ${t}`,
      body: (n, t) => `Hi ${n},\n\nA technician reviewed your request ${t}. Please bring your Chromebook to the Media Center Tech Desk so a technician can look at it.`,
    },
    es: {
      subject: t => `Actualización de tu solicitud ${t}`,
      body: (n, t) => `Hola ${n}:\n\nUn técnico revisó tu solicitud ${t}. Por favor, lleva tu Chromebook al Media Center Tech Desk para que un técnico la revise.`,
    },
  },
  fixed_by_technician: {
    en: {
      subject: t => `Your request ${t} is fixed`,
      body: (n, t) => `Hi ${n},\n\nA technician marked your request ${t} as fixed. If the problem comes back, please start a new request.`,
    },
    es: {
      subject: t => `Tu solicitud ${t} está resuelta`,
      body: (n, t) => `Hola ${n}:\n\nUn técnico marcó tu solicitud ${t} como resuelta. Si el problema vuelve, por favor inicia una nueva solicitud.`,
    },
  },
  no_action_needed: {
    en: {
      subject: t => `Update on your request ${t}`,
      body: (n, t) => `Hi ${n},\n\nA technician reviewed your request ${t} and no more action is needed right now. If you still have a problem, please start a new request.`,
    },
    es: {
      subject: t => `Actualización de tu solicitud ${t}`,
      body: (n, t) => `Hola ${n}:\n\nUn técnico revisó tu solicitud ${t} y por ahora no se necesita más acción. Si todavía tienes un problema, por favor inicia una nueva solicitud.`,
    },
  },
};

/** Builds a draft in the student's language. It is only stored; nothing in this app sends it. */
export function buildDraft(c: SupportCase, value: DispositionValue, now = new Date()): NotificationDraft {
  const tpl = DRAFTS[value][c.language];
  const ticket = c.ticketNumber ?? c.caseNumber;
  return {
    status: 'draft_unsent',
    audience: 'student',
    language: c.language,
    recipient: c.student.email,
    subject: tpl.subject(ticket),
    body: tpl.body(c.student.displayName, ticket),
    ...(c.language === 'es' ? { spanishReview: 'awaiting_human_review' as const } : {}),
    generatedAt: now.toISOString(),
  };
}
