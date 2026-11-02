import type { IssueCategory } from '../types';

/**
 * Guided troubleshooting for the teacher and staff chat (and the student chat when demo mode is
 * off). Fixed text, the same every time. Matching is plain keywords, checked in order.
 */

export interface GuidedStep {
  /** Short name of the step, recorded on the ticket as "steps tried". */
  action: string;
  instruction: string;
  detail?: string;
}

export type FlowId = 'power' | 'wifi' | 'display' | 'audio' | 'copier' | 'account' | 'general';

export interface GuidedFlow {
  id: FlowId;
  topic: string;
  category: IssueCategory;
  steps: GuidedStep[];
}

/** Physical damage cannot be fixed with steps: it goes straight to a technician or a loaner. */
export const DAMAGE_WORDS = /\b(broken|broke|cracked|crack|smashed|spill|spilled|water|dropped|key missing|damaged|loaner)\b/i;

const FLOWS: Array<GuidedFlow & { keywords: RegExp }> = [
  {
    id: 'power',
    topic: 'Chromebook power and display reset',
    category: 'chromebook',
    keywords: /\b(turn(s|ed)? on|black screen|won'?t start|no power|dead battery|not charging)\b/i,
    steps: [
      {
        action: 'Verify charging connection',
        instruction: 'Connect the power adapter to the charging port. Check if the small light beside the port turns on.',
        detail: 'If the battery is completely flat, leave the adapter connected for at least 60 seconds.',
      },
      {
        action: 'Perform a hardware refresh',
        instruction: 'Press and hold the circular Refresh key (top row of keys), then press the Power button once. Let go of both when the screen flickers.',
        detail: 'This resets internal hardware controllers and does not erase saved schoolwork or Google Drive files.',
      },
      {
        action: 'Inspect for physical damage or loose keys',
        instruction: 'Check the screen and case for cracks or liquid damage. If it is damaged, a loaner is needed.',
        detail: 'The Media Center desk provides replacement devices.',
      },
    ],
  },
  {
    id: 'wifi',
    topic: 'District Wi-Fi connection',
    category: 'network',
    keywords: /\b(wi-?fi|internet|wireless|network|connect\w*|offline)\b/i,
    steps: [
      {
        action: 'Toggle Wi-Fi connection',
        instruction: 'Select the clock area at the bottom right, turn Wi-Fi off, wait 5 seconds, and turn it back on. Select "District-Secure".',
        detail: 'Check that the device is not connected to a personal phone hotspot.',
      },
      {
        action: 'Forget and rejoin the district network',
        instruction: 'Click "Known networks", select "District-Secure", and choose "Forget". Select it again and sign in with your district email and password.',
        detail: 'The EAP method should be PEAP, with MSCHAPv2 as Phase 2 authentication.',
      },
      {
        action: 'Restart device network stack',
        instruction: 'Hold the circular Refresh key and press Power once to clear temporary network settings.',
        detail: 'If it fails again and again, the device may need its network certificate re-enrolled by a technician.',
      },
    ],
  },
  {
    id: 'display',
    topic: 'Classroom display and smartboard connection',
    category: 'smartboard',
    keywords: /\b(no signal|smart ?board|promethean|projector|display|hdmi|panel|screen is blank)\b/i,
    steps: [
      {
        action: 'Reseat the video cable',
        instruction: 'Unplug the HDMI or USB-C display cable from the laptop, wait 3 seconds, and plug it back in firmly.',
        detail: 'Check that the other end is plugged into the wall plate or panel input.',
      },
      {
        action: 'Set display mode to Duplicate',
        instruction: 'Press the Windows key and tap P. In the sidebar on the right, select "Duplicate".',
        detail: 'If it is set to "PC screen only", the projector or panel shows No Signal.',
      },
      {
        action: 'Verify input source on panel',
        instruction: 'Use the Source button on the panel or remote to choose the input your cable uses (for example HDMI 1 or Front HDMI).',
        detail: 'Also check that the panel freeze function is off.',
      },
    ],
  },
  {
    id: 'audio',
    topic: 'Audio output',
    category: 'audio_video',
    keywords: /\b(sound|audio|speakers?|headphones?|microphone|mic|hear)\b/i,
    steps: [
      {
        action: 'Select correct audio output device',
        instruction: 'Click the speaker icon at the bottom right. Open the device list and choose the classroom speakers or display instead of the laptop speakers.',
        detail: 'Classroom amplifiers are usually labelled "Extron Audio" or "Display Audio".',
      },
      {
        action: 'Check physical cable connection',
        instruction: 'Make sure the green 3.5mm audio cable is pushed in firmly at the laptop and at the wall port.',
        detail: 'Check that the volume knobs on the wall plate or speakers are turned up.',
      },
    ],
  },
  {
    id: 'copier',
    topic: 'Copier badge reader',
    category: 'printer',
    keywords: /\b(copier|printer|print\w*|badge)\b/i,
    steps: [
      {
        action: 'Use manual PIN login',
        instruction: 'Touch "ID Number / PIN" on the copier screen and enter your 4-digit district staff PIN.',
        detail: 'This lets you print while the badge reader is checked.',
      },
      {
        action: 'Check badge scanner USB cable',
        instruction: 'Make sure the small black reader cable in the USB port at the back of the copier is pushed in firmly.',
        detail: 'If the reader light stays red, a technician needs to restart its service.',
      },
    ],
  },
  {
    id: 'account',
    topic: 'District account and password',
    category: 'account',
    keywords: /\b(password|log ?in|sign ?in|account|locked out|clever)\b/i,
    steps: [
      {
        action: 'Check caps lock and username format',
        instruction: 'Make sure Caps Lock is off and the username is the full district email address.',
        detail: 'Check that no spaces were copied into the sign-in box.',
      },
      {
        action: 'Reset password via Clever or Teacher Portal',
        instruction: 'Teachers can reset a student password from Clever: My Students, then Reset Password.',
        detail: 'If a student is locked out of Google 2-Step Verification, a technician ticket is needed.',
      },
    ],
  },
];

const GENERAL: GuidedFlow = {
  id: 'general',
  topic: 'General equipment check',
  category: 'other',
  steps: [
    {
      action: 'Inspect cables and power',
      instruction: 'Check that power cords and cables are plugged in firmly and the outlet works.',
      detail: 'Check any power switch on the equipment itself.',
    },
    {
      action: 'Restart device',
      instruction: 'Save your work and restart the device fully to finish any pending updates.',
      detail: 'Only hold the power button if a normal shut down does not respond.',
    },
  ],
};

/** Words that mean "this is a device problem" without saying which kind: they get the general check. */
const DEVICE_WORDS = /\b(chromebook|laptop|computer|device|keyboard|trackpad|mouse)\b/i;

/** The guided flow for something typed or tapped, or null when no keyword matches. */
export function matchFlow(text: string): GuidedFlow | null {
  const found = FLOWS.find(f => f.keywords.test(text));
  if (found) {
    const { keywords: _k, ...flow } = found;
    return flow;
  }
  return DEVICE_WORDS.test(text) ? GENERAL : null;
}

/** Ticket category for a ticket filed from the chat. */
export function inferCategory(text: string): IssueCategory {
  return matchFlow(text)?.category ?? 'other';
}

/** The tappable problems at the start of the chat. */
export const CHAT_MENU = {
  staff: [
    'Smartboard or display shows "No Signal"',
    'Student Chromebook cannot connect to Wi-Fi',
    'Audio playing from laptop instead of room speakers',
    'Copier badge reader not responding',
    'Student locked out of district Google account',
  ],
  student: [
    'Chromebook will not turn on',
    'Cannot connect to school Wi-Fi',
    'Forgot account password or login',
    'Headphones or microphone not working',
    'Chromebook damaged or need loaner',
  ],
} as const;
