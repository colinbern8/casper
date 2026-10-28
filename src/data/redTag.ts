/**
 * What a red tag looks like: exactly six digits, nothing else. Used by the student chat (so it can
 * ask again right away) and by the server (so a wrong value is never saved).
 * The app does not look the number up anywhere; it only checks its shape.
 */
export const RED_TAG_LENGTH = 6;

const RED_TAG = /^\d{6}$/;

/** True for a six-digit number. Surrounding spaces are ignored; anything inside the number is not. */
export const isRedTag = (text: unknown): boolean => typeof text === 'string' && RED_TAG.test(text.trim());

/** The value to store: the trimmed digits. Call only after isRedTag says yes. */
export const normalizeRedTag = (text: string): string => text.trim();
