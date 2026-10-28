export type ActionKind = 'resolved' | 'next' | 'escalate' | 'other';

export const ACTION = {
  resolved: 'Issue resolved',
  next: 'Try next step',
  ticket: 'Submit IT ticket',
  loaner: 'Request loaner device',
} as const;

/** Buttons shown under a troubleshooting step. The last step has no "next", and escalation appears once. */
export function stepActions({ isLastStep, isStudent }: { isLastStep: boolean; isStudent: boolean }): string[] {
  const escalate = isStudent ? ACTION.loaner : ACTION.ticket;
  return isLastStep ? [ACTION.resolved, escalate] : [ACTION.resolved, ACTION.next, escalate];
}

export function actionKind(action: string): ActionKind {
  if (/resolved/i.test(action)) return 'resolved';
  if (/next step/i.test(action)) return 'next';
  if (/submit it ticket|loaner device/i.test(action)) return 'escalate';
  return 'other';
}

/** White text on these backgrounds is at least 4.5:1 (green-700 5.0, blue-700 6.7, orange-700 5.2). */
export const ACTION_CLASS: Record<ActionKind, string> = {
  resolved: 'bg-green-700 hover:bg-green-800 border-green-700 text-white',
  next: 'bg-blue-700 hover:bg-blue-800 border-blue-700 text-white',
  escalate: 'bg-orange-700 hover:bg-orange-800 border-orange-700 text-white',
  other: 'bg-white hover:bg-gray-50 border-gray-400 text-gray-900',
};
