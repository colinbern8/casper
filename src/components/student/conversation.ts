import { MAX_REPORTED_ISSUES, type Language, type StudentCaseView, type SupportIssueId } from '../../types';
import { SUPPORT_ISSUES } from '../../data/supportContent';
import { COMMON_PROBLEMS } from '../../data/commonProblems';
import type { StudentStrings } from '../../i18n/studentStrings';
import type { Choice } from '../chat/ChatParts';

/**
 * The pure parts of the student chat: which choices and input hint each step shows, and how a
 * typed "yes" or "no" is read. Kept out of the component so they are easy to read and test.
 */

export type Phase =
  | 'issue' | 'details' | 'tag' | 'confirmTag' | 'steps' | 'handoff'
  | 'addMore' | 'addIssue' | 'addDetails'
  | 'done';

/** Every problem on a request, the first one first. */
export const idsOf = (c: StudentCaseView): SupportIssueId[] => [c.reported.issueId, ...(c.additionalIssues ?? []).map(i => i.issueId)];

export { readYesNo } from '../../data/yesNo';

interface ChoiceState {
  phase: Phase;
  lang: Language;
  /** The current step exists (false once the steps run out). */
  hasStep: boolean;
  listedIds: SupportIssueId[];
  /** Limit mode: the student already has as many open requests as allowed. */
  atLimit: boolean;
}

export function choicesFor({ phase, lang, hasStep, listedIds, atLimit }: ChoiceState, t: StudentStrings): Choice[] {
  switch (phase) {
    case 'issue':
      // The shared list of common problems (src/data/commonProblems.ts).
      return COMMON_PROBLEMS.student.flatMap(p => ('issue' in p.start ? [{ key: `issue:${p.start.issue}`, label: p.label[lang] }] : []));
    case 'details':
    case 'tag': // the red tag is required: no Skip
    case 'addDetails':
      return [];
    case 'confirmTag':
      return [{ key: 'tag-yes', label: t.tagYes, tone: 'primary' }, { key: 'tag-no', label: t.tagNo }];
    case 'steps':
      return hasStep
        ? [{ key: 'worked', label: t.fixed, tone: 'resolved' }, { key: 'not_worked', label: t.notFixed }, { key: 'tech', label: t.askTechnician, tone: 'escalate' }]
        : [{ key: 'tech', label: t.askTechnician, tone: 'escalate' }];
    case 'handoff':
      return [{ key: 'tech', label: t.askTechnician, tone: 'escalate' }];
    case 'addMore':
      return [{ key: 'more-no', label: t.addMoreNo, tone: 'primary' }, { key: 'more-yes', label: t.addMoreYes }];
    case 'addIssue':
      return [
        ...SUPPORT_ISSUES.filter(i => i.id === 'other' || !listedIds.includes(i.id)).map(i => ({ key: `addissue:${i.id}`, label: i.title[lang] })),
        { key: 'more-no', label: t.addMoreNo, tone: 'primary' as const },
      ];
    case 'done':
      return atLimit ? [{ key: 'another', label: t.tryAnother, tone: 'primary' }] : [{ key: 'again', label: t.startAnother, tone: 'primary' }];
  }
}

export function placeholderFor(phase: Phase, t: StudentStrings): string {
  switch (phase) {
    case 'issue': return t.placeholderIssue;
    case 'details':
    case 'addDetails': return t.placeholderDetails;
    case 'tag': return t.placeholderTag;
    case 'confirmTag': return t.placeholderConfirm;
    case 'addMore':
    case 'addIssue': return t.placeholderAddIssue;
    case 'done': return t.placeholderDone;
    default: return t.placeholderSteps;
  }
}

/** Room left on a request for more problems. */
export const roomLeft = (listed: number) => MAX_REPORTED_ISSUES - listed;
