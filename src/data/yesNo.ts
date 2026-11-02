/**
 * A short typed answer read as yes, no, or neither, in English or Spanish. Shared by the student
 * chat and the server (a yes or no is never counted as a bad message).
 */
const YES = new Set(['yes', 'y', 'yep', 'yeah', 'correct', 'right', 'si', 'sí', 's', 'correcto', 'correcta', 'es correcto']);
const NO = new Set(['no', 'n', 'nope', 'wrong', 'incorrect', 'incorrecto', 'incorrecta']);
const NOTHING = new Set(['nothing', 'nada']);

export function readYesNo(text: string): 'yes' | 'no' | null {
  const word = text.toLowerCase().replace(/[.!¡¿?]/g, '').trim();
  if (YES.has(word)) return 'yes';
  if (NO.has(word) || NOTHING.has(word)) return 'no';
  return null;
}
