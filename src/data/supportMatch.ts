import type { SupportIssueId } from '../types';

/**
 * Picks the closest common problem for something a student typed, in English or
 * Spanish. This is plain keyword matching, not AI: it only recognises the words
 * below and returns null for everything else, so the chat can show the menu instead.
 * Never returns 'other'; that is something the student chooses.
 */

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // drop accents: contraseña -> contrasena
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Checked in this order, so a damaged device is never treated as a Wi-Fi problem. */
const RULES: Array<[SupportIssueId, RegExp]> = [
  ['damaged', /\b(crack\w*|broke\w*|smash\w*|shatter\w*|spill\w*|water|wet|drop\w*|damag\w*|bent|rot[ao]s?|quebrad\w*|romp\w*|derram\w*|agua|moj\w*|cay[oe]\w*|golpe\w*|dan[ao]\w*)\b/],
  ['power', /\b(turn\w* on|power\w*|batter\w*|charg\w*|dead|black screen|(won t|will not|wont|not) (start|turn)\w*|bateria|carga\w*|cargador|enciend\w*|encender|prend\w*|pantalla negra|no arranca|apag\w*)\b/],
  ['wifi', /\b(wi ?fi|internet|network|conect\w*|connect\w*|online|offline|wireless|conexion|inalambric\w*|red)\b/],
  ['login', /\b(password|passcode|log ?in|sign ?in|logged out|locked out|account|email|google|clever|contrasena|clave|cuenta|iniciar sesion|inicio de sesion|sesion|correo|usuario|acceso)\b/],
];

export function matchIssue(text: string): SupportIssueId | null {
  const t = normalize(text);
  if (!t) return null;
  for (const [id, re] of RULES) if (re.test(t)) return id;
  return null;
}
