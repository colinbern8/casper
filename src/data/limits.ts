/** Limits and timings shared by the browser and the server. */

/** Longest chat message accepted. The server refuses anything longer. */
export const MAX_MESSAGE_LENGTH = 1000;

/** Longest text a student can type into the student-support chat. */
export const MAX_SUPPORT_INPUT = 500;

/** How long the spam guard locks a student out after too many bad messages (server/spamGuard.ts). */
export const SPAM_LOCKOUT_MINUTES = 15;

/** How long the "signed out" message stays on the chat before the signed-out page appears. */
export const SIGN_OUT_NOTICE_MS = 6000;

/** How often the browser asks for fresh data. */
export const POLL_MS = { myTickets: 30_000, techQueue: 20_000 } as const;

/** Plain-language versions of server limits, for help text. Keep in step with LIMITS in server/config.ts. */
export const LIMITS_TEXT = {
  chat: 'up to 5 messages every 30 seconds, so the help desk is not flooded.',
} as const;
