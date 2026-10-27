import type { DeviceCheckResult, Language } from '../types';

/**
 * Student-facing screen text only. Technician screens and staff notifications stay in English.
 * The whole Spanish column is awaiting human review; the student screens say so.
 */
export interface StudentStrings {
  demoBanner: string;
  reviewBanner: string | null;
  changeLanguage: string;
  chooseIssue: string;
  tellUsMore: string;
  tellUsMoreHint: string;
  tagLabel: string;
  tagHint: string;
  continue: string;
  back: string;
  stepOf: (n: number, total: number) => string;
  fixed: string;
  notFixed: string;
  askTechnician: string;
  askTechnicianNow: string;
  noMoreSteps: string;
  working: string;
  deviceCheckTitle: string;
  deviceResult: Record<DeviceCheckResult, string>;
  resolvedTitle: string;
  resolvedBody: string;
  escalatedTitle: string;
  escalatedBody: string;
  ticketNumber: string;
  caseNumber: string;
  startAnother: string;
  classicChat: string;
  errors: Record<string, string>;
  genericError: string;
}

export const STRINGS: Record<Language, StudentStrings> = {
  en: {
    demoBanner: 'DEMO with fictional data. The device check is simulated and nothing is sent to anyone.',
    reviewBanner: null,
    changeLanguage: 'Change language',
    chooseIssue: 'What is the problem?',
    tellUsMore: 'Tell us more (optional)',
    tellUsMoreHint: 'Write what happened in your own words.',
    tagLabel: 'Tag on your Chromebook (optional)',
    tagHint: 'Look for a sticker like DEMO-CB-1001 on the bottom of your Chromebook.',
    continue: 'Continue',
    back: 'Back',
    stepOf: (n, total) => `Step ${n} of ${total}`,
    fixed: 'This fixed it',
    notFixed: 'It did not work',
    askTechnician: 'Ask for a technician',
    askTechnicianNow: 'Skip and ask for a technician',
    noMoreSteps: 'We are out of steps to try. A technician can help from here.',
    working: 'Working...',
    deviceCheckTitle: 'Device check (simulated demo)',
    deviceResult: {
      match: 'This tag matches the Chromebook assigned to you.',
      mismatch: 'This tag does not match the Chromebook assigned to you. You can keep going; a technician will look at it.',
      unknown_tag: 'We could not find that tag in the demo list. You can keep going.',
      no_assignment: 'No Chromebook is on file for you in this demo. You can keep going.',
    },
    resolvedTitle: 'Glad it is fixed',
    resolvedBody: 'We saved that this was fixed. You do not need to do anything else.',
    escalatedTitle: 'A technician will help',
    escalatedBody: 'Your request is in the technician queue. Please bring your Chromebook to the Media Center Tech Desk.',
    ticketNumber: 'Ticket number',
    caseNumber: 'Case number',
    startAnother: 'Start another request',
    classicChat: 'Use the classic help chat instead',
    errors: {
      RATE_LIMITED: 'Too many requests. Please wait a few minutes.',
      TICKET_LIMIT_EXCEEDED: 'You already sent a request recently. Please take your Chromebook to the Media Center Tech Desk.',
    },
    genericError: 'Something went wrong. Please try again.',
  },
  es: {
    demoBanner: 'DEMOSTRACIÓN con datos ficticios. La verificación del dispositivo es simulada y no se envía nada a nadie.',
    reviewBanner: 'Texto en español pendiente de revisión humana.',
    changeLanguage: 'Cambiar idioma',
    chooseIssue: '¿Cuál es el problema?',
    tellUsMore: 'Cuéntanos más (opcional)',
    tellUsMoreHint: 'Escribe lo que pasó con tus propias palabras.',
    tagLabel: 'Etiqueta de tu Chromebook (opcional)',
    tagHint: 'Busca una etiqueta como DEMO-CB-1001 en la parte de abajo de tu Chromebook.',
    continue: 'Continuar',
    back: 'Atrás',
    stepOf: (n, total) => `Paso ${n} de ${total}`,
    fixed: 'Esto lo arregló',
    notFixed: 'No funcionó',
    askTechnician: 'Pedir un técnico',
    askTechnicianNow: 'Saltar y pedir un técnico',
    noMoreSteps: 'Ya no tenemos más pasos para probar. Un técnico puede ayudarte desde aquí.',
    working: 'Procesando...',
    deviceCheckTitle: 'Verificación del dispositivo (demostración simulada)',
    deviceResult: {
      match: 'Esta etiqueta coincide con la Chromebook asignada a ti.',
      mismatch: 'Esta etiqueta no coincide con la Chromebook asignada a ti. Puedes seguir; un técnico lo revisará.',
      unknown_tag: 'No encontramos esa etiqueta en la lista de la demostración. Puedes seguir.',
      no_assignment: 'No hay una Chromebook registrada para ti en esta demostración. Puedes seguir.',
    },
    resolvedTitle: 'Qué bueno que se arregló',
    resolvedBody: 'Guardamos que esto se arregló. No necesitas hacer nada más.',
    escalatedTitle: 'Un técnico te ayudará',
    escalatedBody: 'Tu solicitud está en la fila de los técnicos. Por favor, lleva tu Chromebook al Media Center Tech Desk.',
    ticketNumber: 'Número de ticket',
    caseNumber: 'Número de caso',
    startAnother: 'Empezar otra solicitud',
    classicChat: 'Usar el chat de ayuda clásico',
    errors: {
      RATE_LIMITED: 'Demasiadas solicitudes. Por favor, espera unos minutos.',
      TICKET_LIMIT_EXCEEDED: 'Ya enviaste una solicitud hace poco. Por favor, lleva tu Chromebook al Media Center Tech Desk.',
    },
    genericError: 'Algo salió mal. Por favor, inténtalo de nuevo.',
  },
};
