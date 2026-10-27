import type { Language } from '../types';

/**
 * Student-facing chat text only. Technician screens and staff notifications stay in English.
 * The whole Spanish column is awaiting human review; the student screens say so.
 */
export interface StudentStrings {
  demoBanner: string;
  reviewBanner: string | null;
  headerTitle: string;
  changeLanguage: string;
  classicChat: string;
  greeting: string;
  thisLooksLike: (issueTitle: string) => string;
  notSure: string;
  askDetails: string;
  askTag: string;
  skip: string;
  send: string;
  working: string;
  placeholderIssue: string;
  placeholderDetails: string;
  placeholderTag: string;
  placeholderConfirm: string;
  placeholderSteps: string;
  placeholderDone: string;
  tapChoice: string;
  stepOf: (n: number, total: number) => string;
  fixed: string;
  notFixed: string;
  askTechnician: string;
  noMoreSteps: string;
  confirmTag: (tag: string) => string;
  tagYes: string;
  tagNo: string;
  tagRetype: string;
  tagSaved: (tag: string) => string;
  resolvedTitle: string;
  resolvedBody: string;
  escalatedTitle: string;
  escalatedBody: string;
  ticketNumber: string;
  caseNumber: string;
  startAnother: string;
  errors: Record<string, string>;
  genericError: string;
}

/** Shown before a language is chosen, so it is in both. */
export const LANGUAGE_PROMPT = 'Hi! Please choose your language.\n¡Hola! Por favor, elige tu idioma.';
export const PLACEHOLDER_CHOOSE_LANGUAGE = 'Choose a language first / Elige un idioma';

export const STRINGS: Record<Language, StudentStrings> = {
  en: {
    demoBanner: 'DEMO with fictional data. Nothing you enter is sent to anyone.',
    reviewBanner: null,
    headerTitle: 'Student help',
    changeLanguage: 'Change language',
    classicChat: 'Use the classic help chat instead',
    greeting: 'Hi! I can help with your Chromebook. What is the problem? Tap one below, or type it.',
    thisLooksLike: title => `This looks like: ${title}.`,
    notSure: 'I am not sure which one that is. Pick the closest one below, or choose "Something else" and a technician will look at it.',
    askDetails: 'Tell us what is wrong in a few words, or tap Skip.',
    askTag: 'Look for the red tag on your Chromebook. Type the number on it here, or tap Skip.',
    skip: 'Skip',
    send: 'Send',
    working: 'Working...',
    placeholderIssue: 'Type your problem, or tap a choice...',
    placeholderDetails: 'Type what is wrong...',
    placeholderTag: 'Type the red tag number...',
    placeholderConfirm: 'Tap a choice, or type the number again...',
    placeholderSteps: 'Tap a choice above...',
    placeholderDone: 'This request is finished',
    tapChoice: 'To keep going, please tap one of the choices below. If you want a person to help, tap "Ask for a technician".',
    stepOf: (n, total) => `Step ${n} of ${total}`,
    fixed: 'This fixed it',
    notFixed: 'It did not work',
    askTechnician: 'Ask for a technician',
    noMoreSteps: 'We are out of steps to try. A technician can help from here.',
    confirmTag: tag => `You typed: ${tag}\nPlease check that it matches the number on the red tag on your Chromebook. Is that right?`,
    tagYes: 'Yes, that is right',
    tagNo: 'No, type it again',
    tagRetype: 'No problem. Type the number on the red tag again, or tap Skip.',
    tagSaved: tag => `Thanks. We saved red tag ${tag}. A technician will use it to find your Chromebook.`,
    resolvedTitle: 'Glad it is fixed!',
    resolvedBody: 'We saved that this was fixed. You do not need to do anything else.',
    escalatedTitle: 'A technician will help.',
    escalatedBody: 'Your request is in the technician queue. Please bring your Chromebook to the Media Center Tech Desk.',
    ticketNumber: 'Ticket number',
    caseNumber: 'Case number',
    startAnother: 'Start another request',
    errors: {
      RATE_LIMITED: 'Too many requests. Please wait a few minutes.',
      TICKET_LIMIT_EXCEEDED: 'You already sent a request recently. Please take your Chromebook to the Media Center Tech Desk.',
    },
    genericError: 'Something went wrong. Please try again.',
  },
  es: {
    demoBanner: 'DEMOSTRACIÓN con datos ficticios. Nada de lo que escribas se envía a nadie.',
    reviewBanner: 'Texto en español pendiente de revisión humana.',
    headerTitle: 'Ayuda para estudiantes',
    changeLanguage: 'Cambiar idioma',
    classicChat: 'Usar el chat de ayuda clásico',
    greeting: '¡Hola! Puedo ayudarte con tu Chromebook. ¿Cuál es el problema? Toca una opción o escríbelo.',
    thisLooksLike: title => `Esto parece ser: ${title}.`,
    notSure: 'No estoy seguro de cuál es. Elige la más parecida de abajo, o elige "Otra cosa" y un técnico lo revisará.',
    askDetails: 'Cuéntanos qué pasa en pocas palabras, o toca Omitir.',
    askTag: 'Busca la etiqueta roja de tu Chromebook. Escribe aquí el número que tiene, o toca Omitir.',
    skip: 'Omitir',
    send: 'Enviar',
    working: 'Procesando...',
    placeholderIssue: 'Escribe tu problema, o toca una opción...',
    placeholderDetails: 'Escribe qué pasa...',
    placeholderTag: 'Escribe el número de la etiqueta roja...',
    placeholderConfirm: 'Toca una opción, o escribe el número otra vez...',
    placeholderSteps: 'Toca una opción de arriba...',
    placeholderDone: 'Esta solicitud ya terminó',
    tapChoice: 'Para continuar, por favor toca una de las opciones de abajo. Si quieres que te ayude una persona, toca "Pedir un técnico".',
    stepOf: (n, total) => `Paso ${n} de ${total}`,
    fixed: 'Esto lo arregló',
    notFixed: 'No funcionó',
    askTechnician: 'Pedir un técnico',
    noMoreSteps: 'Ya no tenemos más pasos para probar. Un técnico puede ayudarte desde aquí.',
    confirmTag: tag => `Escribiste: ${tag}\nPor favor, revisa que sea igual al número de la etiqueta roja de tu Chromebook. ¿Es correcto?`,
    tagYes: 'Sí, es correcto',
    tagNo: 'No, escribirlo otra vez',
    tagRetype: 'No hay problema. Escribe otra vez el número de la etiqueta roja, o toca Omitir.',
    tagSaved: tag => `Gracias. Guardamos la etiqueta roja ${tag}. Un técnico la usará para encontrar tu Chromebook.`,
    resolvedTitle: '¡Qué bueno que se arregló!',
    resolvedBody: 'Guardamos que esto se arregló. No necesitas hacer nada más.',
    escalatedTitle: 'Un técnico te ayudará.',
    escalatedBody: 'Tu solicitud está en la fila de los técnicos. Por favor, lleva tu Chromebook al Media Center Tech Desk.',
    ticketNumber: 'Número de ticket',
    caseNumber: 'Número de caso',
    startAnother: 'Empezar otra solicitud',
    errors: {
      RATE_LIMITED: 'Demasiadas solicitudes. Por favor, espera unos minutos.',
      TICKET_LIMIT_EXCEEDED: 'Ya enviaste una solicitud hace poco. Por favor, lleva tu Chromebook al Media Center Tech Desk.',
    },
    genericError: 'Algo salió mal. Por favor, inténtalo de nuevo.',
  },
};
