// Screens free-text chat before it gets a built-in answer. Pattern-based and
// English-only, so it is a courtesy filter for students, not a security boundary.

export const MAX_MESSAGE_LENGTH = 1000;

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (?:(?:all|any|previous|prior|above|system|your|the) )*(instructions|prompts|rules|commands|directives)/i,
  /disregard (?:(?:all|any|previous|prior|above|your|the) )*(instructions|rules|prompts|directives)/i,
  /forget (?:(?:all|previous|prior|your|the) )*(instructions|rules|prompts)/i,
  /(system prompt|what is your prompt|show me your instructions|reveal your (prompt|instructions)|repeat the text above)/i,
  /(jailbreak|dan mode|developer mode|unrestricted mode|god mode)/i,
  /bypass (the )?(filter|safety|rules|restrictions)/i,
  /(new instructions?|override (the )?(rule|prompt|setting)s?)\b/i,
  /(roleplay as|you must now act as|pretend (to be|you are))/i,
  /(write (me )?an? (essay|poem|song|story) about|do my homework)/i,
  /(solve (this|my) (math|algebra|geometry|calculus|equation))/i,
  /(write (me )?an? (python|java|javascript|c\+\+|bash|php|sql|ruby|html) (code|script|program))/i,
];

const ABUSIVE_PATTERN =
  /\b(fuck\w*|shit\w*|bitch\w*|asshole|cunt|penis|vagina|pussy|nigg(a|er)s?|fagg?ots?|kys|kill yourself)\b/i;

export type ScreenResult =
  | { blocked: false }
  | { blocked: true; reason: 'EXCESSIVE_LENGTH' | 'INAPPROPRIATE_CONTENT' | 'OFF_TOPIC_OR_INJECTION' | 'SPAM_REPETITION'; message: string };

export function screenMessage(text: string): ScreenResult {
  const clean = text.trim();

  if (clean.length > MAX_MESSAGE_LENGTH) {
    return {
      blocked: true,
      reason: 'EXCESSIVE_LENGTH',
      message: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters. Please shorten your message or describe the main problem.`,
    };
  }
  if (ABUSIVE_PATTERN.test(clean)) {
    return {
      blocked: true,
      reason: 'INAPPROPRIATE_CONTENT',
      message: 'Please keep messages appropriate and respectful. I can only help with school technology.',
    };
  }
  if (INJECTION_PATTERNS.some(p => p.test(clean))) {
    return {
      blocked: true,
      reason: 'OFF_TOPIC_OR_INJECTION',
      message:
        'I can only help with school technology (Chromebooks, Wi-Fi, classroom displays, printers, and school accounts). Please describe the technical problem you need help with.',
    };
  }
  if (/(.)\1{12,}/i.test(clean) || /(\b\w+\b)(?:\s+\1){5,}/i.test(clean)) {
    return {
      blocked: true,
      reason: 'SPAM_REPETITION',
      message: 'Please describe your technology issue in a few clear words.',
    };
  }
  return { blocked: false };
}
