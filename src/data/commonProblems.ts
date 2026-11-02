import type { LocalizedText, SupportIssueId } from '../types';
import { SUPPORT_ISSUES } from './supportContent';
import type { FlowId } from './staffFlows';

/**
 * The tappable common problems at the start of every chat, about five per audience. This is the one
 * list the chats and the server's built-in replies all use, so a change here changes every screen.
 * Typed text is matched by keywords: src/data/supportMatch.ts (students, English and Spanish) and
 * src/data/staffFlows.ts (teachers and staff).
 */

export interface CommonProblem {
  /** What tapping it starts: a student support issue, a staff troubleshooting flow, or "describe it". */
  start: { issue: SupportIssueId } | { flow: FlowId } | { describe: true };
  label: LocalizedText;
}

/** Students: the five problems of the student-support chat, in English and Spanish. */
const STUDENT: CommonProblem[] = SUPPORT_ISSUES.map(i => ({ start: { issue: i.id }, label: i.title }));

/** Teachers and staff (English only until staff-side Spanish is built). */
const en = (text: string): LocalizedText => ({ en: text, es: text });
const STAFF: CommonProblem[] = [
  { start: { flow: 'display' }, label: en('Smartboard or display shows "No Signal"') },
  { start: { flow: 'wifi' }, label: en('Student Chromebook cannot connect to Wi-Fi') },
  { start: { flow: 'audio' }, label: en('Audio playing from laptop instead of room speakers') },
  { start: { flow: 'copier' }, label: en('Copier badge reader not responding') },
  { start: { flow: 'account' }, label: en('Student locked out of district Google account') },
];

export const COMMON_PROBLEMS = { student: STUDENT, staff: STAFF } as const;
export type Audience = keyof typeof COMMON_PROBLEMS;

/** English labels, for the server's built-in replies (the built-in chat is English only). */
export const problemLabels = (audience: Audience): string[] => COMMON_PROBLEMS[audience].map(p => p.label.en);
