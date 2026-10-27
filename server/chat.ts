/**
 * Built-in answers for the free-text help chat. There is no AI or language model
 * anywhere in this app: every reply is fixed text chosen by keyword matching.
 */

/** 'model' is the wire name for the bot's earlier replies; the browser sends it. */
export interface ChatTurn {
  role: 'user' | 'model';
  content: string;
}

/** What the answers depend on. Everything else the browser sends is ignored. */
export interface ChatContext {
  isStudent: boolean;
  deviceType: string;
}

export interface ChatReply {
  text: string;
  needsEscalation: boolean;
  suggestedActions: string[];
}

const MAX_HISTORY = 10;
const MAX_MODEL_TURN_CHARS = 1500;

/** Validates client-supplied history into a clean, alternating, user-first list. */
export function normalizeHistory(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const turns: ChatTurn[] = [];
  for (const item of raw.slice(-MAX_HISTORY)) {
    if (!item || typeof item.content !== 'string') return null;
    if (item.role !== 'user' && item.role !== 'model') return null;
    turns.push({
      role: item.role,
      // User turns are NOT clipped here so the safety screen can reject oversize input.
      content: item.role === 'model' ? item.content.slice(0, MAX_MODEL_TURN_CHARS) : item.content,
    });
  }
  while (turns.length && turns[0].role === 'model') turns.shift();
  if (turns.length === 0 || turns[turns.length - 1].role !== 'user') return null;
  // Merge consecutive same-role turns (the API expects alternation).
  const merged: ChatTurn[] = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.content += `\n${t.content}`;
    else merged.push({ ...t });
  }
  return merged;
}

export function suggestedActionsFor(isStudent: boolean, needsEscalation: boolean): string[] {
  const escalate = isStudent ? 'Request loaner device' : 'Submit IT ticket';
  return needsEscalation ? [escalate, 'Issue resolved', 'Contact IT'] : ['Issue resolved', 'Try next step', escalate];
}

/** The reply to a free-text question: fixed text chosen by keyword matching. */
export function builtInReply(ctx: ChatContext, query: string): ChatReply {
  const q = query.toLowerCase();
  let text: string;
  let needsEscalation = false;

  if (/(broken|cracked|spill|water|key missing|dropped|loaner)/.test(q)) {
    text = ctx.isStudent
      ? `Damaged devices need a replacement.\n\n1. Bring your Chromebook to the Media Center Tech Desk.\n2. A technician will issue a loaner so you do not miss assignments.\n\nSelect "Request loaner device" to log it.`
      : `Physically damaged equipment needs a technician or a replacement.\n\n1. Note the asset tag on the device.\n2. Select "Submit IT ticket" so a technician can follow up.`;
    needsEscalation = true;
  } else if (/(smartboard|promethean|projector|hdmi|no signal|screen|display)/.test(q) || ctx.deviceType === 'smartboard') {
    text = `Classroom display connection:\n\n1. Reseat the HDMI or USB-C cable at the laptop and at the wall plate.\n2. On a Windows laptop press the Windows key + P and choose "Duplicate".\n3. On the board, press Source or Input and select the HDMI port your cable uses.`;
  } else if (/(wifi|wi-fi|network|internet|chromebook)/.test(q)) {
    text = `Wireless connection:\n\n1. Hold the Refresh key and press Power once to restart the hardware.\n2. Click the clock, turn Wi-Fi off for 5 seconds, then back on.\n3. If it still fails, select the school network, choose Forget, and reconnect with your district account.`;
  } else if (/(password|login|log in|account|clever)/.test(q)) {
    text = `District account sign-in:\n\n1. Use your full district email address.\n2. Check that Caps Lock is off.\n3. Teachers can reset student passwords in the Clever portal under My Students.`;
  } else if (/(headphone|mic|sound|audio|hear|speaker)/.test(q)) {
    text = `Audio:\n\n1. Click the speaker icon and choose the correct output device.\n2. Push the audio cable in firmly at both ends.\n3. Check that the speaker or wall-plate power is on and volume is up.`;
  } else {
    text = `Describe the problem in a sentence (for example: "board says No Signal" or "Chromebook will not connect to Wi-Fi") and I will suggest the next step.`;
  }

  return {
    text,
    needsEscalation,
    suggestedActions: suggestedActionsFor(ctx.isStudent, needsEscalation),
  };
}
