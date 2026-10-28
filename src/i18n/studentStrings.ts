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
  addMoreAsk: (remaining: number) => string;
  addMoreYes: string;
  addMoreNo: string;
  addPrompt: string;
  issueAdded: (issueTitle: string) => string;
  alreadyListed: (issueTitle: string) => string;
  maxReached: string;
  requestIncludes: (issueTitles: string[]) => string;
  /** Shown first when the student already has an open request. */
  limitIntro: (ticketNumbers: string[]) => string;
  /** Shown instead of sending: names the open request and says who to contact. */
  limitContact: (ticketNumbers: string[]) => string;
  notSureLimited: string;
  anotherPrompt: string;
  tryAnother: string;
  placeholderAddIssue: string;
  stepOf: (n: number, total: number) => string;
  fixed: string;
  notFixed: string;
  askTechnician: string;
  noMoreSteps: string;
  confirmTag: (tag: string, name: string) => string;
  tagYes: string;
  tagNo: string;
  tagRetype: string;
  tagInvalid: string;
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
export const PLACEHOLDER_CHOOSE_LANGUAGE = 'Pick a language / Elige idioma';

export const STRINGS: Record<Language, StudentStrings> = {
  en: {
    demoBanner: 'DEMO with fictional data. Nothing you enter is sent to anyone.',
    reviewBanner: null,
    headerTitle: 'Student help',
    changeLanguage: 'Change language',
    greeting: 'Hi! I can help with your Chromebook. What is the problem? Tap one below, or type it.',
    thisLooksLike: title => `This looks like: ${title}.`,
    notSure: 'I am not sure which one that is. Pick the closest one below, or choose "Something else" and a technician will look at it.',
    askDetails: 'Tell us what is wrong in a few words.',
    askTag: 'Look for the red tag on your Chromebook. Type the 6-digit number on it here.',
    skip: 'Skip',
    send: 'Send',
    working: 'Working...',
    placeholderIssue: 'Type your problem, or tap a choice...',
    placeholderDetails: 'Type what is wrong...',
    placeholderTag: 'Type the 6-digit red tag number...',
    placeholderConfirm: 'Tap a choice, or type the number again...',
    placeholderSteps: 'Tap a choice above...',
    placeholderDone: 'This request is finished',
    tapChoice: 'To keep going, please tap one of the choices below. If you want a person to help, tap "Ask for a technician".',
    addMoreAsk: n => `Is there anything else wrong? You can add up to ${n} more ${n === 1 ? 'problem' : 'problems'} to this same request.`,
    addMoreYes: 'Add another problem',
    addMoreNo: 'No, send it',
    addPrompt: 'Tap another problem, or type it.',
    issueAdded: title => `Added: ${title}.`,
    alreadyListed: title => `"${title}" is already on this request. Pick a different problem, or tap "No, send it".`,
    maxReached: 'That is the most we can put in one request. Sending it now.',
    requestIncludes: titles => `This request includes: ${titles.join('; ')}.`,
    limitIntro: nums =>
      `You already have ${nums.length === 1 ? 'an open request' : 'open requests'}${nums.length ? ` (${nums.join(', ')})` : ''}. I can still try some quick fixes, but I can't send a new request. If they don't work, please contact the main office or a technician.`,
    limitContact: nums =>
      `I can't send a new request because you already have ${nums.length === 1 ? 'an open request' : 'open requests'}${nums.length ? ` (${nums.join(', ')})` : ''}. Please contact the main office or a technician.`,
    notSureLimited: 'I am not sure which one that is. Pick the closest one below.',
    anotherPrompt: 'OK. Which problem do you want to try? Tap one below, or type it.',
    tryAnother: 'Try another problem',
    placeholderAddIssue: 'Type another problem...',
    stepOf: (n, total) => `Step ${n} of ${total}`,
    fixed: 'This fixed it',
    notFixed: 'It did not work',
    askTechnician: 'Ask for a technician',
    noMoreSteps: 'We are out of steps to try. A technician can help from here.',
    confirmTag: (tag, name) => `Name: ${name}\nRed tag: ${tag}\nPlease check that the name is yours and the red tag matches the number on your Chromebook. Is all of that right?`,
    tagYes: 'Yes, that is right',
    tagNo: 'No, type it again',
    tagRetype: 'No problem. Type the 6-digit number on the red tag again.',
    tagInvalid: 'The red tag number is exactly 6 digits, numbers only. Please check the tag and type it again.',
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
    greeting: '¡Hola! Puedo ayudarte con tu Chromebook. ¿Cuál es el problema? Toca una opción o escríbelo.',
    thisLooksLike: title => `Esto parece ser: ${title}.`,
    notSure: 'No estoy seguro de cuál es. Elige la más parecida de abajo, o elige "Otra cosa" y un técnico lo revisará.',
    askDetails: 'Cuéntanos qué pasa en pocas palabras.',
    askTag: 'Busca la etiqueta roja de tu Chromebook. Escribe aquí el número de 6 dígitos que tiene.',
    skip: 'Omitir',
    send: 'Enviar',
    working: 'Procesando...',
    placeholderIssue: 'Escribe tu problema, o toca una opción...',
    placeholderDetails: 'Escribe qué pasa...',
    placeholderTag: 'Escribe el número de 6 dígitos de la etiqueta roja...',
    placeholderConfirm: 'Toca una opción, o escribe el número otra vez...',
    placeholderSteps: 'Toca una opción de arriba...',
    placeholderDone: 'Esta solicitud ya terminó',
    tapChoice: 'Para continuar, por favor toca una de las opciones de abajo. Si quieres que te ayude una persona, toca "Pedir un técnico".',
    addMoreAsk: n => `¿Hay algo más que esté mal? Puedes agregar hasta ${n} ${n === 1 ? 'problema más' : 'problemas más'} a esta misma solicitud.`,
    addMoreYes: 'Agregar otro problema',
    addMoreNo: 'No, enviarla',
    addPrompt: 'Toca otro problema, o escríbelo.',
    issueAdded: title => `Agregado: ${title}.`,
    alreadyListed: title => `"${title}" ya está en esta solicitud. Elige otro problema, o toca "No, enviarla".`,
    maxReached: 'Ese es el máximo que cabe en una solicitud. La enviamos ahora.',
    requestIncludes: titles => `Esta solicitud incluye: ${titles.join('; ')}.`,
    limitIntro: nums =>
      `Ya tienes ${nums.length === 1 ? 'una solicitud abierta' : 'solicitudes abiertas'}${nums.length ? ` (${nums.join(', ')})` : ''}. Todavía puedo probar algunas soluciones rápidas, pero no puedo enviar una solicitud nueva. Si no funcionan, por favor comunícate con la oficina principal o con un técnico.`,
    limitContact: nums =>
      `No puedo enviar una solicitud nueva porque ya tienes ${nums.length === 1 ? 'una solicitud abierta' : 'solicitudes abiertas'}${nums.length ? ` (${nums.join(', ')})` : ''}. Por favor, comunícate con la oficina principal o con un técnico.`,
    notSureLimited: 'No estoy seguro de cuál es. Elige la más parecida de abajo.',
    anotherPrompt: 'Está bien. ¿Qué problema quieres probar? Toca una opción de abajo o escríbelo.',
    tryAnother: 'Probar otro problema',
    placeholderAddIssue: 'Escribe otro problema...',
    stepOf: (n, total) => `Paso ${n} de ${total}`,
    fixed: 'Esto lo arregló',
    notFixed: 'No funcionó',
    askTechnician: 'Pedir un técnico',
    noMoreSteps: 'Ya no tenemos más pasos para probar. Un técnico puede ayudarte desde aquí.',
    confirmTag: (tag, name) => `Nombre: ${name}\nEtiqueta roja: ${tag}\nPor favor, revisa que el nombre sea el tuyo y que la etiqueta coincida con el número de tu Chromebook. ¿Todo es correcto?`,
    tagYes: 'Sí, es correcto',
    tagNo: 'No, escribirlo otra vez',
    tagRetype: 'No hay problema. Escribe otra vez el número de 6 dígitos de la etiqueta roja.',
    tagInvalid: 'El número de la etiqueta roja tiene exactamente 6 dígitos, solo números. Por favor, revisa la etiqueta y escríbelo otra vez.',
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
